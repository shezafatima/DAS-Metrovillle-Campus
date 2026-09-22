---
id: 0007
title: Implement news feature end to end
stage: green
date: 2026-09-22
surface: agent
model: claude-sonnet-5
feature: 003-news
branch: 003-news
user: shezafatima
command: /sp.implement
labels: ["news", "implementation", "tiptap", "cloudinary", "urdu", "categories", "mongoose"]
links:
  spec: specs/003-news/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/models/news-post.ts
 - src/lib/news/*.ts (categories, slug, sanitize, excerpt, dates, cloudinary-loader, mutations, admin-queries, public-queries, route-errors)
 - src/lib/validation/news.ts
 - src/lib/cloudinary.ts
 - src/lib/db.ts (bug fix — see Response snapshot)
 - src/app/api/admin/news/**, src/app/api/admin/uploads/sign/route.ts
 - src/app/admin/(dashboard)/news/** (list, new, [id])
 - src/app/(public)/news/** (list/category, detail)
 - src/components/admin/news/** (editor, rich-text-editor, cover-image-field, table, filters, pagination, delete dialog, unsaved-changes hook)
 - src/components/news/** (banner, card, grid, pagination, empty state, cover image, post body, category filter)
 - src/components/ui/select.tsx
 - src/content/news.ts, src/content/admin.ts (newsCopy), src/content/site-shell.ts (SITE_OG_IMAGE)
 - src/app/globals.css (.prose-news, .news-card-padding, news tokens)
 - research/design-tokens.md ("News cards" section), research/extract-news-tokens.ts(.browser.js), research/tokens/news-cards-*.json
 - docs/architecture.md, specs/003-news/quickstart.md, .env.example
 - e2e/admin-news-*.spec.ts, e2e/news-*.spec.ts, e2e/helpers/news.ts, e2e/fixtures/cover.jpg
 - src/test/admin-session.ts
 - specs/003-news/tasks.md (all 75 tasks marked complete)
tests:
 - npm test — 153 passed, 79 skipped ([DB] suites; MONGODB_URI unreachable from this sandbox), 0 failed
 - npx tsc --noEmit — clean throughout
 - npm run lint — 0 errors (9 pre-existing/matching-pattern warnings in research/*.browser.js)
 - npm run build — compiles and type-checks successfully; static export of /admin (pre-existing, Atlas-dependent) fails identically on the pre-003 baseline
 - Playwright: 6 pre-existing failures (desktop-navigation ×2, footer ×2, header-scroll ×2) reproduced identically against the stashed pre-003 baseline — confirmed unrelated to this feature; all new 003 e2e specs written and type-checked but not executed (same Atlas gap)
---

## Prompt

continue

(Following /sp.implement's own trigger; the session was interrupted once mid-gate by the user, who then said "continue" to resume T074/T075, then separately asked how to permanently resolve the MongoDB Atlas IP-whitelist issue and pasted a browser error log showing a "Database connection failed" / "Only plain objects... can be passed to Client Components" crash on /admin.)

## Response snapshot

Implemented all 75 tasks in specs/003-news/tasks.md across 10 phases:

- **Foundation**: `NewsPost` Mongoose model (collection `news`, soft-delete plugin, 4 indexes), shared Zod schema, pure helpers (slug/sanitize/excerpt/dates/cloudinary-loader), Cloudinary wrapper (signed upload + server-side verification), copy files.
- **US1 admin authoring**: mutations.ts (create/update/publish/unpublish/delete with slug generation+dedup, body sanitisation, empty-body rejection), 5 route handlers (all session-gated, mapped error envelope), Tiptap-based RichTextEditor restricted to the spec's formatting set, unsaved-changes hook, NewsEditor (auto-slug, client validation, save/publish/unpublish).
- **US2 admin list**: search/status/category filtering, pagination, scheduled-post marker, soft-delete confirmation dialog.
- **US3 public pages**: extracted real per-element tokens from the live reference (research/extract-news-tokens.ts — card typography identical at all 4 widths, no grid gap on the reference, columns switch at exactly Tailwind's md:/lg:), single visibility predicate (public-queries.ts) every public read goes through, force-dynamic pages, list/category/detail with cards, empty state, pagination.
- **US4 images**: signed direct browser→Cloudinary upload, server-side verification wired into mutations, 5 MB/type client checks, remove-image flow.
- **US5 Urdu**: explicit per-post language field driving dir/font in editor, table, card, banner, body — propagation gaps found and fixed (AdminPostRow was missing `language`; NewsBanner wasn't swapping the Urdu font class).
- **US6 sharing**: generateMetadata with OG/Twitter tags, default preview image fallback (logo.svg placeholder — flagged as needing a real design asset), metadataBase added to root layout (was missing, required for relative OG URLs to resolve).
- **US7 categories**: fixed 5-category list, category label + filter UI, `/news/<category>` branch, admin category filter — built ahead of schedule alongside US3 since the routing was one file.
- **Polish**: docs/architecture.md updated, quickstart.md updated with known-gaps section, editor component tests (Tiptap does mount in jsdom — ProseMirror's MutationObserver picks up direct textContent writes once awaited), full gate run.

Real bugs found and fixed along the way (not scope creep — each blocked correct behaviour):
1. sanitize-html's `allowedAttributes` filter runs *after* `transformTags`, silently stripping the `rel`/`target` a transform had just added — fixed by including them in the allowlist and rebuilding link attribs from scratch.
2. Native `<select>` elements aren't Base UI "labelable" children, so `FormLabel`'s automatic `htmlFor` association silently failed — fixed with explicit `id`/`htmlFor` pairs.
3. Mongoose's default collection-name pluralisation ("newsposts") didn't match `e2e/helpers/news.ts`'s literal `"news"` — fixed with an explicit `collection: "news"` schema option.
4. `src/lib/db.ts` threw the raw `MongooseServerSelectionError` (containing non-plain `TopologyDescription`/`Map`/`Set` internals) straight through to the client error boundary, which React's server→client serialization cannot cross — this is what caused the user's "Only plain objects... can be passed to Client Components" crash. Fixed: log the full error server-side, throw a clean plain `Error` instead. Verified by reproducing the exact scenario locally (DB unreachable) before and after.

Advised the user on Atlas: whitelist-anywhere (0.0.0.0/0) as the practical permanent fix for a dynamic home/office IP, since the one-time whitelist from PHR 0002 keeps recurring. Also explained the remaining dev-only symptom (Next's debug overlay on the very first SSR byte when a session check throws before any HTML has streamed) as a documented Next.js streaming limitation, not a bug, that disappears entirely once Atlas is reachable — declined to engineer around it (e.g. wrapping the login page in Suspense) since it's an outage-only, dev-mode-only cosmetic path.

DB verification limitation (same as 002's own documented caveat): Atlas is unreachable from this sandbox (confirmed by direct connection attempts, both via the CLI and by re-running the actual `npm run dev` server locally and hitting it with curl). Every [DB]-tagged Vitest suite and every Playwright spec that seeds data was therefore written, type-checked and logic-reviewed but not executed to a passing result here. Non-DB unit tests (153) and the DB-independent Playwright regression set were run to completion, including a rigorous git-stash comparison proving 6 pre-existing failures (desktop-navigation, footer, header-scroll) are identical on the pre-003 baseline and unrelated to this feature.

## Outcome

- ✅ Impact: All 7 user stories delivered; spec's Acceptance journey (create→publish→public→unpublish→delete→404) implemented and its E2E test written; every admin route session-gated with a written 401 test.
- 🧪 Tests: 153 unit tests passing, 0 failing, 79 DB-dependent tests skipped (environment gap, not code). Full DB-backed and E2E verification is the one remaining step — must run in an environment with real Atlas + Cloudinary access.
- 📁 Files: ~70 new/modified files across models, lib, routes, components, pages, tests, e2e specs, and docs — see the files list above.
- 🔁 Next prompts: run `npm test` with `MONGODB_URI` set and `npx playwright test` against a real Atlas + Cloudinary account before merging; review the OG placeholder image; consider a Cloudinary-orphan cleanup job (noted in quickstart.md).
- 🧠 Reflection: The db.ts fix is the clearest example this session of a "smallest viable diff" outside the task list's literal scope still being the right call — it directly blocked the error-handling work from the same session and was verified, not guessed at.

## Evaluation notes (flywheel)

- Failure modes observed: none in my own output; the sandbox's lack of Atlas access is an environment constraint, documented rather than worked around.
- Graders run and results (PASS/FAIL): lint — PASS (0 errors); tsc — PASS; unit tests — PASS (153/153 of what could run); Playwright regression — PASS (identical to baseline, proven via git stash).
- Prompt variant (if applicable): none.
- Next experiment (smallest change to try): none.
