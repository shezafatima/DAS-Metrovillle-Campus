---
id: 0003
title: Plan signup feature
stage: plan
date: 2026-09-22
surface: agent
model: claude-opus-5
feature: 004-signup
branch: 004-signup
user: shezafatima
command: /sp.plan
labels: ["signup", "plan", "architecture", "upsert", "admin-table"]
links:
  spec: specs/004-signup/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/004-signup/plan.md
 - specs/004-signup/research.md
 - specs/004-signup/data-model.md
 - specs/004-signup/quickstart.md
 - specs/004-signup/contracts/public-signup-api.md
 - specs/004-signup/contracts/admin-signups-api.md
 - specs/004-signup/contracts/signup-section.md
 - specs/004-signup/spec.md (phone storage assumption updated)
tests:
 - none (planning only; test map in research.md §12)
---

## Prompt

/sp.plan Reuse the public form
protection, soft delete and admin table patterns from 002. The
signup form is one reusable section component.

## Response snapshot

Read the spec, constitution, `docs/architecture.md`, the 003 plan and
the 002/003 code to reuse (`public-form.ts`, `honeypot.ts`,
`soft-delete.ts`, `dal.ts`, `news/admin-queries.ts`, `NewsTable`,
`NewsTableFilters`, `NewsPagination`, `DeletePostDialog`, route
handlers, `describeWithDb`, e2e helpers, Playwright config).

Flagged one source conflict per Constitution I — architecture.md says
phones are stored `+923…`, the spec clarification said `03…` — and
asked; the user chose store `+923…` / display `03…`. Spec assumption
and clarification bullet updated to match.

Wrote:
- `plan.md` — summary, technical context (no new deps), constitution
  check (all PASS; V gated on token extraction), project structure,
  six implementation phases, risks.
- `research.md` — 13 decisions: atomic `findOneAndUpdate` upsert with
  unique email, `$setOnInsert`/`$addToSet`/`$set deletedAt:null`,
  `withDeleted`, E11000 retry; phone regex → E.164; public route order
  honeypot→rate limit→validate→upsert with identical `200`; server
  `SignupSection` + client `SignupForm`; admin list query with
  digit-normalised phone search; lift `NewsPagination` to shared
  `AdminPagination`; CSV with BOM/quoting/formula guard; serial
  Playwright `forms` project + `clearThrottle()`; concurrency test;
  PKT datetime formatting; token-extraction pass; test map.
- `data-model.md` — `signups` collection, indexes, sources constant,
  Zod schema, upsert, state transitions, DTOs.
- `contracts/` — public endpoint, admin routes/page/CSV/overview,
  section component + content + token names + `#signup` anchor.
- `quickstart.md` — tokens pass, run, manual verification, test
  commands.

Ran `update-agent-context.ps1` — it only prepended a BOM to CLAUDE.md
(no marker section); reverted that.

## Outcome

- ✅ Impact: Design complete; ready for `/sp.tasks`.
- 🧪 Tests: none run (planning). Test map in research §12.
- 📁 Files: plan.md, research.md, data-model.md, quickstart.md, contracts/{public-signup-api,admin-signups-api,signup-section}.md, spec.md (assumption edit)
- 🔁 Next prompts: `/sp.tasks`; consider `/sp.adr` for the upsert-and-restore data decision.
- 🧠 Reflection: Reading the actual 003 components before planning kept the reuse concrete (exact primitives, exact helper names) rather than aspirational.

## Evaluation notes (flywheel)

- Failure modes observed: `update-agent-context.ps1` writes a BOM and nothing else when CLAUDE.md has no tech-section markers — harmless but needs a revert each time.
- Graders run and results (PASS/FAIL): constitution check PASS (8/8).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
