---
id: 0002
title: Fix Atlas connection error page
stage: general
date: 2026-09-21
surface: agent
model: claude-opus-5
feature: none
branch: 003-news
user: shezafatima
command: none (debugging request before /sp.plan)
labels: ["mongodb", "atlas", "error-boundary", "admin", "debugging"]
links:
  spec: specs/002-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/app/admin/error.tsx
 - src/content/admin.ts
 - history/prompts/general/0002-fix-atlas-connection-error-page.general.prompt.md
tests:
 - npx tsc --noEmit (pass)
 - npx eslint src/app/admin/error.tsx src/content/admin.ts (pass)
 - headless render of /admin/login with DB unreachable: boundary shows "Service temporarily unavailable" + "Try again", no host names in visible text
---

## Prompt

before planing fix this "

Runtime MongooseServerSelectionError
Server

Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted. Make sure your current IP address is on your Atlas cluster's IP whitelist: https://www.mongodb.com/docs/atlas/security-whitelist/
src\lib\db.ts (40:18) @ connectDb

  38 |
  39 |   try {
> 40 |     cache.conn = await cache.promise;
     |                  ^
  41 |   } catch (err) {
  42 |     // Allow a subsequent call to retry instead of caching a rejected promise forever.
  43 |     cache.promise = null;

"

## Response snapshot

Diagnosis (verified, not assumed):
- Reproduced the failure with the project's own `.env.local` values
  (`MongooseServerSelectionError`).
- System DNS resolves the Atlas hosts and a raw TCP connect to
  `…-shard-00-00.sp5f7zb.mongodb.net:27017` succeeds → not a firewall.
  Atlas accepts the socket then drops the handshake, which is exactly
  what it does for IPs not on the cluster's access list.
- Current public IP is 39.34.188.24; it must be added under Atlas →
  Network Access. Nothing in the code can fix that.

Code gap fixed (002 FR-014 "data store unreachable → generic service
unavailable message"): only the login Server Action handled it; the
server components calling `getAdminSession()` (login page, dashboard
layout) threw, producing a raw framework error page.
- Added `src/app/admin/error.tsx` — client error boundary using this
  Next version's `retry` prop (checked
  `node_modules/next/dist/docs/...file-conventions/error.md`; the prop
  is `retry`, not `reset`). Renders a generic title/body and a
  "Try again" button; logs only the digest.
- Added `unavailableCopy` to `src/content/admin.ts` (Constitution VI:
  copy lives in content files), reusing the existing login
  "unavailable" string.

Verified: tsc and eslint clean; headless Chromium render of
`/admin/login` with the DB down shows the boundary and leaks no host
names in visible text. (SSR HTML still contains the error message in
dev only — documented Next dev behaviour; production substitutes a
generic message + digest.)

## Outcome

- ✅ Impact: Admin area degrades to a generic page when the DB is down; root cause identified as the Atlas IP access list with the exact IP to add.
- 🧪 Tests: tsc, eslint, headless render check — all pass. No new automated test added (boundary is a client component; existing 002 tests cover the health check and login action paths).
- 📁 Files: src/app/admin/error.tsx (new), src/content/admin.ts.
- 🔁 Next prompts: user adds 39.34.188.24 (or 0.0.0.0/0 for dev) in Atlas Network Access; then `/sp.plan` for 003-news.
- 🧠 Reflection: A TCP-level probe separated "whitelist" from "firewall" in one step, avoiding guesswork; checking the bundled Next docs caught the `reset`→`retry` rename.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): tsc PASS, eslint PASS, headless boundary render PASS.
- Prompt variant (if applicable): none.
- Next experiment (smallest change to try): consider a Vitest test for error.tsx rendering copy from content, if a component-test setup is added later.
