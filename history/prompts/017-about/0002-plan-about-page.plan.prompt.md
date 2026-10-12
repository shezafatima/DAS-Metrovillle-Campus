---
id: 0002
title: Plan About page
stage: plan
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: 017-about
branch: 017-about
user: shezafatima
command: /sp.plan
labels: ["about", "content-shapes", "navigation", "redirects", "plan"]
links:
  spec: specs/017-about/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/017-about/plan.md
 - specs/017-about/research.md
 - specs/017-about/data-model.md
 - specs/017-about/quickstart.md
 - specs/017-about/contracts/about-content.md
 - specs/017-about/contracts/page-structure.md
 - specs/017-about/spec.md (source file names updated after the owner renamed das-text/ files)
 - history/prompts/017-about/0002-plan-about-page.plan.prompt.md
tests:
 - none (planning stage)
---

## Prompt

/sp.plan (no additional user input)

## Response snapshot

Planned 017-about. Research R1–R11:
- Verbatim fidelity test against committed .txt extractions of the Word files (no new dependency).
- Zod section schemas in src/lib/about/schema.ts that use only the 005 Settings engine's value forms (text, longText with blank-line paragraphs, ImageRef|null, lists of items with ids), so 014 can store them unchanged.
- Core-value icons stored as keys from a closed list, mapped to lucide-react components.
- A single aboutView() decides visible sections, team cards (placeholders only when NODE_ENV=development) and alternating backgrounds. The page, the header nav (items prop) and the search index all use it. The E2E production behaviour is forced by the cookie e2e-production-content=1, honoured only under freshReadsForTests().
- An explicit legacyAboutRedirects map (overview→#our-story, salient-features→/about, management→#management-team, messages→#messages). The home Salient Features card is repointed to /about.
- Vision & Mission is a navy band with yellow used only as an accent. The h1 is PageBanner "About Us".

Constitution check: PASS. Deviations recorded:
- SC-008 is met with Playwright assertions, because axe is not installed (adding it is a new tool).
- The frontend-design skill is unavailable.
- Read more was dropped by the owner.

The das-text/ files were renamed by the owner mid-session (identical blobs). The spec and research were updated to the new names.

## Outcome

- ✅ Impact: Plan, research, data model, contracts and quickstart ready for /sp.tasks.
- 🧪 Tests: none (plan stage); test plan in research R11
- 📁 Files: 6 plan artifacts + spec path updates
- 🔁 Next prompts: /sp.tasks; optional /sp.adr for the About content-shape contract with 014
- 🧠 Reflection: Making nav visibility per-request only in test mode keeps production static while allowing an E2E test of the production rule.

## Evaluation notes (flywheel)

- Failure modes observed: source files renamed during the session; brief-named skill (frontend-design) not available; no a11y scanner in the stack.
- Graders run and results (PASS/FAIL): Constitution check PASS (pre and post design)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
