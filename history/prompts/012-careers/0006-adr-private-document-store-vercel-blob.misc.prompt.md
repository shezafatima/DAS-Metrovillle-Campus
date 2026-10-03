---
id: 0006
title: ADR private document store Vercel Blob
stage: misc
date: 2026-10-02
surface: agent
model: claude-opus-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: /sp.adr
labels: ["adr","careers","vercel-blob","private-storage","upload-limit"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0007-private-document-store-vercel-blob.md
  pr: null
files:
 - history/adr/0007-private-document-store-vercel-blob.md
 - history/adr/0004-private-document-storage.md
 - specs/012-careers/plan.md
tests:
 - none
---

## Prompt

/sp.adr private-document-store-vercel-blob

## Response snapshot

Prerequisites OK (plan.md, research, data-model, contracts, quickstart). Extracted one decision cluster: Vercel Blob private store + `src/lib/documents` boundary with vercel-blob/local/fake drivers + server-generated random keys + one-request server upload capped at 4 MiB (Vercel's 4.5 MB function limit) with a content check before storing + insert-first write order + byte-proxy attachment download (no presigned URLs, private no-store) + delete and retention via del(). Created ADR-0007 (Accepted) with the alternatives: S3/R2 vendor-neutral, client uploads keeping 5 MB, presigned GET downloads, Cloudinary/GridFS. Marked ADR-0004 status as completed by ADR-0007 (no conflict: behaviour unchanged, vendor filled in). Linked ADR-0007 from plan.md's constitution check.

## Outcome

- ✅ Impact: Vendor, upload and download decisions recorded; ADR-0004's open TODO closed.
- 🧪 Tests: none
- 📁 Files: ADR-0007 created; ADR-0004 status and plan.md updated
- 🔁 Next prompts: /sp.tasks
- 🧠 Reflection: clustered the store, upload limit and download pattern into one ADR because they change together if hosting changes.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): clustered PASS; alternatives with rationale PASS; pros/cons PASS; concise PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
