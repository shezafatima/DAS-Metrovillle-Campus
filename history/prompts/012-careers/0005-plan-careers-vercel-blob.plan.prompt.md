---
id: 0005
title: Plan careers with Vercel Blob
stage: plan
date: 2026-10-02
surface: agent
model: claude-opus-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: /sp.plan
labels: ["plan","careers","vercel-blob","private-storage","cv-upload"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0004-private-document-storage.md, history/adr/0006-career-application-match-either-field.md
  pr: null
files:
 - specs/012-careers/plan.md
 - specs/012-careers/research.md
 - specs/012-careers/data-model.md
 - specs/012-careers/quickstart.md
 - specs/012-careers/contracts/public-careers-api.md
 - specs/012-careers/contracts/admin-careers-api.md
 - specs/012-careers/contracts/document-store.md
 - specs/012-careers/contracts/careers-page.md
 - specs/012-careers/contracts/access-matrix-delta.md
 - specs/012-careers/spec.md
tests:
 - none
---

## Prompt

/sp.plan (no arguments)

Mid-run messages: "i am going with vercel blob". Answer to the follow-up (Vercel Functions' 4.5 MB body limit vs a 5 MB CV): "Lower CV limit to 4 MB (Recommended)".

## Response snapshot

Resumed the paused plan. Wrote plan.md (summary, technical context, constitution check 11/11 PASS + post-design re-check, source tree with the signup removal inventory, implementation order, risks), data-model.md (careerApplications with two partial unique indexes on email and phone, pending → active → deleted lifecycle, notification state change, throttle keys), quickstart.md, and contracts (public route, admin routes, document store, page, access-matrix delta). Store switched from the vendor-neutral S3 draft to Vercel Blob private storage (`@vercel/blob` ^2.8: put/get/del/head with access "private", OIDC or BLOB_READ_WRITE_TOKEN, local driver refused in production). Verified on Vercel's docs that private blobs need auth and that function bodies are capped at 4.5 MB. The owner chose a 4 MB CV limit over client uploads, recorded in spec Clarifications and propagated everywhere. Ran update-agent-context (no net CLAUDE.md change).

## Outcome

- ✅ Impact: Plan ready for /sp.tasks.
- 🧪 Tests: none (plan stage)
- 📁 Files: plan, research, data-model, quickstart, 5 contracts; spec (4 MB + store assumption)
- 🔁 Next prompts: /sp.adr private-document-store-vercel-blob (optional); /sp.tasks
- 🧠 Reflection: the store choice changed a user-facing limit; caught by checking the vendor's docs before finalising.

## Evaluation notes (flywheel)

- Failure modes observed: a bash heredoc with backticks/quotes failed, so contracts were written with the Write tool instead
- Graders run and results (PASS/FAIL): constitution gates PASS; no NEEDS CLARIFICATION left
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
