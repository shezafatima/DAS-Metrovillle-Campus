---
id: 0003
title: Plan site shell feature
stage: plan
date: 2026-09-16
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: shezafatima
command: /sp.plan
labels: ["plan", "site-shell", "design-tokens", "content-file"]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-site-shell/plan.md
 - specs/001-site-shell/research.md
 - specs/001-site-shell/data-model.md
 - specs/001-site-shell/quickstart.md
 - specs/001-site-shell/contracts/content-schema.md
 - CLAUDE.md
 - history/prompts/001-site-shell/0003-plan-site-shell-feature.plan.prompt.md
tests:
 - none (planning artifacts only; no code changed)
---

## Prompt

Follow docs/architecture.md. Use design values from
research/design-tokens.md only. Menu items, contact details and
social links come from one typed content file. Project setup is
already complete; plan only this feature's work.

## Response snapshot

Ran `setup-plan.ps1 -Json` to resolve FEATURE_SPEC/IMPL_PLAN/SPECS_DIR/
BRANCH for 001-site-shell, then read spec.md, the ratified
constitution, docs/architecture.md, research/design-tokens.md, and the
existing src/ tree (globals.css still has only the generic shadcn
theme, no design tokens yet; package.json already includes Tailwind
v4, shadcn/ui, @base-ui/react, motion, lucide-react — no new deps
needed) plus docs/prd.md §4's sitemap.

Filled plan.md's Technical Context (TypeScript/Next.js 16.3.x/React 19,
existing deps only, no storage — content is a static typed file,
Vitest+Playwright testing) and a full Constitution Check table (all
eight principles PASS or N/A, zero violations, so Complexity Tracking
is empty). Produced Phase 0 research.md resolving the mobile-menu
collapse-breakpoint choice (custom `min-width:1024px` Tailwind
breakpoint, justified against design-tokens.md's own measured DOM
capture rather than its ambiguous raw media-query list), the single
content-file decision (`src/content/site-shell.ts`), the "no API
contracts" decision (purely presentational feature), the placeholder-
route mechanism, mobile-menu focus containment via the already-
installed @base-ui/react, active-page detection via `usePathname()`,
CSS-first desktop dropdowns, and placeholder contact values. Produced
Phase 1 data-model.md (NavigationItem, ContactInfo, FooterContent,
conceptual SitemapRoute), contracts/content-schema.md (the TypeScript
shape those components depend on, standing in for an HTTP contract
since none exists), and quickstart.md. Filled in the Project Structure
section with concrete paths: one `site-shell` component group under
src/components/, one content file, nine route stubs + not-found.tsx,
and one Playwright spec per user story. Ran
`update-agent-context.ps1 -AgentType claude` to refresh CLAUDE.md
(no new Active Technologies line was actually written since this
feature adds no dependency beyond what's already installed).

## Outcome

- ✅ Impact: 001-site-shell now has a complete Phase 0/1 plan — research.md, data-model.md, contracts/, quickstart.md, and a filled plan.md with a clean Constitution Check — ready for `/sp.tasks`.
- 🧪 Tests: None run; this is planning only. Test *strategy* (Vitest content-contract tests + one Playwright spec per user story) is recorded in plan.md/contracts/content-schema.md for `/sp.tasks` to turn into concrete tasks.
- 📁 Files: specs/001-site-shell/{plan.md, research.md, data-model.md, quickstart.md, contracts/content-schema.md} created/filled; CLAUDE.md refreshed by the agent-context script; this PHR.
- 🔁 Next prompts: `/sp.tasks` to generate specs/001-site-shell/tasks.md from this plan.
- 🧠 Reflection: The most consequential judgment call was resolving the collapse-breakpoint ambiguity in research/design-tokens.md by trusting its own measured DOM capture (menu present at 1024/1440, absent at 768/375) over its raw, conflicting media-query list — flagged explicitly per Constitution I ("conflicts between sources MUST be flagged") rather than silently picking one.

## Evaluation notes (flywheel)

- Failure modes observed: `update-agent-context.ps1` logged "Added language/framework/database" lines that don't actually appear in CLAUDE.md's diff (confirmed via `git diff CLAUDE.md`) — likely idempotent/no-op behavior when nothing new relative to docs/architecture.md, but the log message is misleading; not blocking, noted here rather than silently ignored.
- Graders run and results (PASS/FAIL): N/A — no formal grader for `/sp.plan`; the Constitution Check table is the self-check gate, and it passed cleanly (no violations).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
