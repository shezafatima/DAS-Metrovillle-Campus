---
id: 0019
title: Implement Phase 10 retire signup
stage: green
date: 2026-10-05
surface: agent
model: claude-sonnet-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: move on
labels: ["implement","careers","signup-removal","cleanup"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - scripts/retire-signups.ts
 - package.json
 - src/content/admin.ts
 - src/test/access-inventory.test.ts
 - src/app/api/admin/access-matrix.test.ts
 - src/app/api/public/messages/route.test.ts
 - src/lib/careers/key-unguessable.test.ts
 - playwright.config.ts
 - e2e/global-setup.ts
 - history/adr/0001-signup-upsert-and-restore.md
 - specs/012-careers/tasks.md
tests:
 - full Vitest run: 1320 pass; the 4 failures were the missing after() mock in key-unguessable.test.ts (fixed) and a cold-start timeout in the access matrix (passes on rerun); 157 pass in the rerun of the related files
---

## Prompt

move on

## Response snapshot

T086-T092: deleted the public and admin signup code, components, models, lib, content, tests and E2E specs; scripts/retire-signups.ts (dry run without --confirm, exits 1; with --confirm drops the signups collection and unsets signupsLastOpenedAt; idempotent; not run). The grep found two importers outside the listed paths: the home Join Now copy (home.ts, test) read heading/supporting from content/signup.ts, now literal in home.ts; and a messages route test used the signup route as a budget-separation case, now uses the careers form key. Access inventory/matrix, Playwright config and global setup no longer mention signup; ADR-0001 marked superseded; comments updated. The playwright.config.ts commit holds only the signup hunks; the user's E2E_FRESH_READS rename stays unstaged.

## Outcome

- Impact: signup is gone; Phase 10 complete. The signups collection is untouched until the owner backs up and runs retire:signups --confirm.
- Next prompts: Phase 11 polish (architecture docs, release gate, full E2E and build sequenced, manual width walkthrough, security self-check)
- Reflection: the committed home.ts is still untracked 006 work; content/signup.ts removal is only safe because home.ts no longer imports it.
