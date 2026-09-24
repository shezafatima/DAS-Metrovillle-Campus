---
id: 0003
title: Plan contact and messages
stage: plan
date: 2026-09-24
surface: agent
model: claude-opus-5-5
feature: 008-contact-messages
branch: 008-contact-messages
user: shezafatima
command: /sp.plan
labels: ["plan", "contact", "messages", "admin-inbox", "public-form", "reuse"]
links:
  spec: specs/008-contact-messages/spec.md
  ticket: null
  adr: history/adr/0001-signup-upsert-and-restore.md
  pr: null
files:
 - specs/008-contact-messages/plan.md
 - specs/008-contact-messages/research.md
 - specs/008-contact-messages/data-model.md
 - specs/008-contact-messages/quickstart.md
 - specs/008-contact-messages/contracts/public-contact-api.md
 - specs/008-contact-messages/contracts/admin-messages-api.md
 - specs/008-contact-messages/contracts/contact-page.md
 - history/prompts/008-contact-messages/0003-plan-contact-and-messages.plan.prompt.md
tests:
 - none (planning stage; test map in research.md §17)
---

## Prompt

/sp.plan Reuse the public form
protection, shared form/table patterns and Paged/search helpers from
002 and 004. Each message is a separate record; do not apply the
signup upsert rule.

## Response snapshot

Wrote the plan, research (18 decisions), data model, 3 contracts and a quickstart for 008.

Key decisions:
- Append-only `messages` collection: one `create` per submission, no unique index. ADR-0001 is not applied, and Constitution IV's upsert rule doesn't cover messages because they have no natural key.
- `POST /api/public/messages`: a 64 KiB size guard, then the honeypot, then the per-IP limit under its own `"contact"` budget, then the shared Zod schema.
- The signup-only helpers are lifted to shared modules, and the old paths re-export them: phone, admin date-time, route errors, field errors, `AdminListFilters` and `AdminDeleteDialog`. `Paged`, `escapeRegExp` and `AdminPagination` are reused as they are.
- A detail page per message (clarification Q1). The page only reads. `MarkReadOnOpen` sends a conditional `POST …/read` (new → read) and then calls `router.refresh()`. The Next 16 docs confirm that layouts don't re-render on navigation, so every change refreshes the page to update the sidebar count.
- `PATCH` for status changes, `DELETE` for soft delete, and a "no longer available" panel for deleted messages. The back link is rebuilt from a whitelist, so it can't become an open redirect.
- Visitor text is rendered as text only. The XSS tests are a jsdom render test and a Playwright test.
- `getContactDetails()` is the single place 005 will change; `ContactInfo` gains `mapUrl` and `officeHours`. The map is a keyless Google embed built from the address, with an "Open in Google Maps" link that is always shown.
- A token and asset extraction pass (`contact-page-*.json` plus the reference images) must run before the public UI is built.
- Playwright: `contact-*` specs join the `forms` project. Specs that send through the public form set their own `X-Forwarded-For`, so each gets a separate rate-limit budget.

The Constitution Check passes both before and after design, with no violations. The agent context script only added a BOM to CLAUDE.md, so that change was reverted.

## Outcome

- ✅ Impact: The plan is ready for /sp.tasks, and its implementation phases are laid out.
- 🧪 Tests: none run; the test map is in research §17.
- 📁 Files: plan.md, research.md, data-model.md, quickstart.md and 3 contracts.
- 🔁 Next prompts: /sp.tasks
- 🧠 Reflection: Layouts not re-rendering on navigation decided how read-on-open works and how the sidebar badge stays fresh. A GET side effect would have left the sidebar count stale.

## Evaluation notes (flywheel)

- Failure modes observed: the agent context script made a BOM-only change to CLAUDE.md, which was reverted. A token output filename would have collided with existing files; it was renamed to `contact-page-*`.
- Graders run and results (PASS/FAIL): Constitution Check PASS (both before and after design)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
