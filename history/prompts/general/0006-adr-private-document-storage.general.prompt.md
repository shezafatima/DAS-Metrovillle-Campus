---
id: 0006
title: ADR private document storage
stage: general
date: 2026-09-28
surface: agent
model: claude-sonnet-5
feature: none
branch: 009-admin-notifications
user: s2636309@gmail.com
command: /sp.adr
labels: ["adr", "storage", "personal-data", "cloudinary"]
links:
  spec: null
  ticket: null
  adr: history/adr/0004-private-document-storage.md
  pr: null
files:
 - history/adr/0004-private-document-storage.md
tests:
 - none
---

## Prompt

/sp.adr private-document-storage
Why CVs go to a private object store with session-and-role-checked
download routes rather than Cloudinary: PDF delivery is blocked by
default on free Cloudinary accounts, its token and cookie access
controls need the Advanced plan, and a public URL would expose
applicants' personal data. Cover the two-provider split (Cloudinary
for public media, private store for documents) and the tradeoffs.

## Response snapshot

Created ADR-0004 (`history/adr/0004-private-document-storage.md`), a cross-cutting ADR (not tied to a single feature directory — Constitution II already named "a private object store for documents" in its v1.2.0 amendment; 012-careers is the first consumer).

Decision: two storage providers split strictly by sensitivity — Cloudinary stays public-media-only (unchanged from current usage), a private object store handles documents/personal records (CVs today, any future personal-data attachment later). Files get unguessable keys and private-by-default access; the download path is `requireAdminSession()` + role check, then either a byte-proxy or a short-lived signed URL, delivered as `Content-Disposition: attachment`. Deliberately did not name a specific vendor — the requirement (private-by-default, unguessable keys, signed-URL-or-proxy support) is fixed here, but the actual product choice is 012-careers implementation-planning work, consistent with not inventing an API/contract the codebase hasn't adopted.

Covered the three Cloudinary blockers verbatim from the user's prompt (raw/PDF delivery blocked by default on the free tier, token/cookie access control gated behind the Advanced paid plan, and public-URL delivery being incompatible with Constitution V regardless of tier) as the Context, then worked through four rejected alternatives: (A) upgrade to Cloudinary Advanced, (B) obscure public ID as pseudo-protection, (C) store bytes in MongoDB (GridFS/Buffer), (D) local filesystem storage.

## Outcome

- ✅ Impact: Documents the architectural split between public and private file storage ahead of 012-careers, satisfying Constitution V's private-storage requirement by construction rather than convention.
- 🧪 Tests: none (architecture documentation only; the download route's access-check and "raw object URL not fetchable without going through the app route" behavior will need tests once 012-careers implements it)
- 📁 Files: `history/adr/0004-private-document-storage.md` (new)
- 🔁 Next prompts: When 012-careers is planned, pick the actual private-object-store vendor, update `docs/architecture.md` with its wiring, and resolve ADR-0003's still-open question about what happens to a deleted application's CV file in that store.
- 🧠 Reflection: This is the second ADR in a row (after ADR-0003) created ahead of its consuming feature's spec/plan, directly from PRD + constitution content and the user's explicit reasoning — reasonable given the constitution's own amendment-3 Sync Impact Report already flagged this exact gap as a tracked follow-up.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): Decision clustered (one integrated two-provider-split decision) — PASS; explicit alternatives with rationale — PASS (4 alternatives); pros/cons for chosen approach and alternatives — PASS; concise but sufficiently detailed — PASS
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
