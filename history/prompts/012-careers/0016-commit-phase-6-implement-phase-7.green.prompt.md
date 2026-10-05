---
id: 0016
title: Commit Phase 6 and implement Phase 7
stage: green
date: 2026-10-05
surface: agent
model: claude-sonnet-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: none (direct request)
labels: ["implement","careers","entry-points","footer","site-search","home-cta"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/content/site-shell.ts
 - src/components/site-shell/footer.tsx
 - src/components/site-shell/footer.test.tsx
 - src/content/site-shell.test.ts
 - src/lib/site-search.ts
 - src/lib/site-search.test.ts
 - e2e/shell-careers-links.spec.ts
 - src/content/home.ts
 - src/components/home/careers-cta.tsx
 - src/components/home/careers-cta.test.tsx
 - specs/012-careers/tasks.md
tests:
 - src/components/site-shell, src/content, src/lib/site-search (unit, pass)
 - e2e/shell-careers-links.spec.ts (13/13, chromium, one worker)
 - src/components/home/careers-cta.test.tsx (2/2)
---

## Prompt

commit Phase 6 and then start Phase 7

(mid-run) I have carrer.jpg in my images folder in home use this as background banner pic for join now home carrer section

(then) restart

## Response snapshot

Committed Phase 6 as a0deabe (71 files; only 012 work; 006 changes and the shared docs/config hunks left unstaged; the user's staged page.test.tsx deletion restored). Phase 7 (US5, T077-T078): footerContent.links with Careers in the footer bottom bar beside the copyright, site search index includes the footer links (Careers), main menu still eight items; unit tests; E2E shell-careers-links spec 13/13 at 375/768/1024/1440 (top bar link first in the yellow bar, footer link, home Join Now, menu unchanged). The first parallel run failed on slow compile; one worker passes; the Join Now click retries because the home page shifts while loading. User request: public/images/home/carrer.jpg (1772x592) is now the decorative background of the home Join Now section (same pattern as the Books and Dashboard sections: next/image fill, navy kept under it), text above it; checked by screenshot at 1440 and 375; component test updated. "restart" was taken as restarting my test server, which I did.

## Outcome

- ✅ Impact: Careers reachable from top bar, footer, search and Join Now; Join Now section now has the client's banner.
- 🧪 Tests: see above
- 📁 Files: see above
- 🔁 Next prompts: commit Phase 7 (the home CTA files belong to the user's uncommitted 006 work, so they need a decision); Phase 8 upload rate limit, retention, signup removal, release gate, polish
- 🧠 Reflection: the careers-cta files are part of 006's uncommitted work; the user explicitly asked for this change but committing them would pull in 006 files.

## Evaluation notes (flywheel)

- Failure modes observed: parallel Playwright workers starve the slow dev server; Vitest worker start timeout while a dev server runs
- Graders run and results (PASS/FAIL): vitest PASS, playwright shell links 13/13 PASS, eslint see report
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
