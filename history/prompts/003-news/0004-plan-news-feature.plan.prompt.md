---
id: 0004
title: Plan news feature
stage: plan
date: 2026-09-21
surface: agent
model: claude-opus-5
feature: 003-news
branch: 003-news
user: shezafatima
command: /sp.plan
labels: ["news", "plan", "tiptap", "cloudinary", "mongoose", "architecture"]
links:
  spec: specs/003-news/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/003-news/plan.md
 - specs/003-news/research.md
 - specs/003-news/data-model.md
 - specs/003-news/contracts/admin-news-api.md
 - specs/003-news/contracts/public-pages.md
 - specs/003-news/quickstart.md
 - history/prompts/003-news/0004-plan-news-feature.plan.prompt.md
tests:
 - none (planning stage; test plan in research §13)
---

## Prompt

Follow docs/architecture.md. Reuse the admin table, form,
dialog and toast patterns from 002 rather than building new ones.
Images go to Cloudinary; only URLs are stored. Public pages must
never return drafts or deleted posts.

## Response snapshot

Ran `setup-plan.ps1`; read spec, constitution, `docs/architecture.md`,
002 plan/data-model/contracts, the 002 UI primitives and
design-system demo, `soft-delete.ts`, `rtl-text.ts`, `env.ts`,
`site-shell.ts`, the Next 16.3 bundled docs (caching model, `error.js`,
`revalidateTag`, image loader), `research/tokens/news-*.json`, and
`npm view` for candidate packages.

Key verified findings that shaped decisions:
- 001's site menu already links `/news/head-office` etc. → category
  lists live at `/news/<key>`; `/news/[slug]` branches on category key;
  keys reserved as post slugs.
- `cacheComponents` is off → previous caching model → public news pages
  use `dynamic = "force-dynamic"` so unpublish is immediate.
- Tiptap 3.31.3 StarterKit bundles Link; `sanitize-html` 2.17.7;
  `cloudinary` 2.11.0; `.env.example` already names the three
  CLOUDINARY_* vars.
- `research/tokens/news-*.json` are page aggregates; per-element card
  values are missing → token-extraction task gates public UI work
  (Constitution V).

Artifacts: plan.md (Technical Context, Constitution Check all PASS,
structure tree, phases, risks), research.md (14 decisions: Tiptap
config, sanitised-HTML storage + excerpt, Cloudinary signed direct
upload + server verification + `next/image` loader, Urdu-preserving
slugs with unique index incl. deleted, PKT calendar-date visibility
predicate, force-dynamic, category routing, route handlers for
mutations + in-process reads, shared Zod schema, explicit `language`
→ dir/font, unsaved-changes hook, token gap, test plan, deps),
data-model.md (`news` collection, indexes, transitions, DTOs, category
constant), contracts (admin API statuses/bodies incl. 401 rule and sign
payload; public pages, query module, metadata, images), quickstart.md.

`update-agent-context.ps1` only inserted a BOM into CLAUDE.md (no
marker block present) — reverted.

## Outcome

- ✅ Impact: Design complete; no constitution violations; ready for `/sp.tasks`.
- 🧪 Tests: none run (planning). Test plan in research §13.
- 📁 Files: 6 planning artifacts + this PHR.
- 🔁 Next prompts: `/sp.adr` for body-storage/Cloudinary/rendering decisions (suggested); `/sp.tasks`.
- 🧠 Reflection: Reading `site-shell.ts` caught a routing decision the spec alone would have gotten wrong (`/news/category/<key>` vs the already-linked `/news/<key>`).

## Evaluation notes (flywheel)

- Failure modes observed: agent-context script has no effect on this repo's CLAUDE.md layout (adds only a BOM).
- Graders run and results (PASS/FAIL): constitution check — PASS (8/8).
- Prompt variant (if applicable): none.
- Next experiment (smallest change to try): add the SpecKit marker block to CLAUDE.md if automatic context updates are wanted.
