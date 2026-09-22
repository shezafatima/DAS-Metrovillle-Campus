# Implementation Plan: News

**Branch**: `003-news` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-news/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Give the admin a news section — a paginated, searchable, filterable
table and an editor with a Tiptap rich-text body, a Cloudinary cover
image (signed direct upload; only URLs stored), an explicit
English/Urdu language, a category from a fixed list of five, a publish
date and draft/published status — and give visitors `/news`,
`/news/<category>` and `/news/<slug>` that render only posts which are
published, dated today or earlier, and not soft-deleted, through one
visibility predicate. Everything reuses the 002 foundation: the admin
shell and DAL, the soft-delete plugin, and the table/form/dialog/toast
primitives (user constraints). Public pages follow `docs/architecture.md`
(public route group, tokens, Server Components) and the reference
screenshots, after a token-extraction pass for the news cards.

## Technical Context

**Language/Version**: TypeScript strict on Next.js 16.3.x (App Router), React 19, Node 24 — unchanged.
**Primary Dependencies**: **New** (research §14, all verified on npm): `@tiptap/react`, `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit` 3.31.3 (editor); `sanitize-html` 2.17.7 + types (server sanitiser); `cloudinary` 2.11.0 (signing + verification). **Reused from 002**: `requireAdminSession`/`getAdminSession`, `softDeletePlugin`, `connectDb`, `getEnv`, `Table/Form/Dialog/AlertDialog/Badge/Button/Input/Skeleton`, `toast`, `AdminShell`; from 001: `PublicShell`, `isNavItemActive`, `font-body-urdu`, tokens.
**Storage**: MongoDB Atlas Flex via the cached Mongoose connection — one new collection `news` (data-model.md). Image binaries in Cloudinary folder `news/covers/`; the database stores `{ url, publicId, width, height, alt }` only.
**Testing**: Vitest (jsdom unit + `describeWithDb` node suites incl. every `/api/admin/news*` and `/api/admin/uploads/sign` 401 test; visibility-predicate matrix) and Playwright (`admin` project: E2E journey, Urdu, categories, stubbed upload, unsaved-changes; `chromium` project: `/news` + detail at 375/768/1024/1440 vs reference screenshots and tokens). Research §13.
**Target Platform**: Web, server-rendered; Node runtime for route handlers (Mongoose, Cloudinary SDK).
**Project Type**: Single existing Next.js app; adds `src/models/news-post.ts`, `src/lib/news/*`, `src/lib/validation/news.ts`, `src/app/api/admin/news/**`, `src/app/api/admin/uploads/sign`, admin pages under `src/app/admin/(dashboard)/news/**`, public pages under `src/app/(public)/news/**`, components under `src/components/news/*` and `src/components/admin/news/*`, copy in `src/content/news.ts` and `src/content/admin.ts`.
**Performance Goals**: SC-005 — `/news` readable within 2 s on mobile and ≤ 1.5 MB of images for 9 cards at desktop: met by Cloudinary `f_auto,q_auto,c_limit,w_<width>` via `next/image` `sizes`, an indexed single query per page, `force-dynamic` rendering. SC-008 — admin title search < 1 s over 100 posts: indexed regex on `title`.
**Constraints**: Constitution I (reference fidelity; deviations listed in spec), II (no new framework/db/provider — Tiptap and sanitize-html are libraries; Cloudinary is named in II), III (every admin route calls `requireAdminSession`; sign route session-gated; secrets server-only), IV (shared Zod schema; soft delete; unique slug index), V (news-card values extracted to tokens before use), VI (one component per visual section; `"use client"` only on the editor, the table's row actions/search controls and the category filter), VII (query modules return plain DTOs; route handlers are consumer-agnostic). User constraints: follow `docs/architecture.md`; reuse 002 patterns; images to Cloudinary URLs only; public pages never return drafts/deleted.
**Scale/Scope**: 1 model, 1 Zod schema, ~7 `src/lib/news` modules, 6 route handlers, 3 admin pages (list, new, edit) + 1 editor component tree (~6 components), 3 public page variants (list, category, detail) + ~6 public components, ~12 Vitest files, 5 Playwright specs, 1 token-extraction pass, 3 new required env vars.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Purpose & Fidelity | PASS | Public pages reproduce `screenshots/das.edu.pk_news_*.png`; the three deviations (page-based pagination vs "Load more", visible date on detail, none for categories now that they're confirmed) are recorded in spec "Deviations from the Reference". Category addresses match the reference and the 001 menu. The missing per-element card values are **extracted first** (research §12) — never approximated. Scope is PRD §5.7/§6.3 + the confirmed category clarification. |
| II. Fixed Stack | PASS (with note) | Adds Tiptap, sanitize-html and the Cloudinary SDK — UI/utility libraries and the SDK of a provider already named in II. No framework, database or provider is introduced; no major-version upgrade. Body storage format (research §2) is a long-lived data decision → ADR suggested below. |
| III. Security | PASS | Every `/api/admin/news*` handler and `/api/admin/uploads/sign` calls `requireAdminSession({ mode: "api" })` and 401s; admin pages call `requireAdminSession()`; Cloudinary secret stays in env and is never returned; signed params pin folder/format/transformation; body HTML sanitised server-side with a strict allowlist (FR-034); no public POST routes in this feature (no rate-limit surface added). |
| IV. Data Integrity | PASS | One Zod schema for client and server (`src/lib/validation/news.ts`); `softDeletePlugin` on the model; unique `slug` index across deleted posts; `excerpt` derived server-side only; no email sent. |
| V. Design System | PASS (gated) | All admin UI uses 002 tokens/primitives. Public news UI is blocked behind the token-extraction task that adds the card/banner values to `research/design-tokens.md` and `@theme`; no arbitrary values. |
| VI. Components | PASS | `NewsBanner`, `NewsCard`, `NewsGrid`, `NewsPagination`, `CategoryFilter`, `PostBody`, `CoverImage` (public); `NewsTable`, `NewsTableFilters`, `NewsEditor`, `RichTextEditor`, `CoverImageField`, `DeletePostDialog` (admin). Pages compose only. Server Components by default; client only where Tiptap, fetch/toast or the confirm dialog require it. Copy in `src/content/news.ts` / `src/content/admin.ts`; category labels in one constant. |
| VII. Extensibility | PASS | `public-queries.ts`/`admin-queries.ts` return plain DTOs; route handlers are plain JSON; the visibility predicate is a single exported function a chatbot service can call. No speculative public API is built. |
| VIII. Testing & DoD | PASS (planned) | One Playwright spec per user story group + unauthorized-access test for every admin route + 4-width visual checks (research §13). |

No violations — Complexity Tracking table not needed.

**Post-design re-check (after Phase 1)**: unchanged. Two design choices
touched principle boundaries and were resolved *toward* the principle:
(a) the explicit `language` field (spec clarification) instead of
`dir="auto"` as `docs/architecture.md` currently phrases it — the doc
gets a one-line update in this feature; (b) `force-dynamic` public pages
(research §6) trade a cache for the spec's "disappears immediately" —
the ISR path is recorded as the upgrade if ever needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-news/
├── plan.md                        # This file (/sp.plan command output)
├── research.md                    # Phase 0 — 14 resolved decisions
├── data-model.md                  # Phase 1 — `news` collection, category constant, DTOs, transitions
├── quickstart.md                  # Phase 1 — configure Cloudinary, run, verify, test
├── contracts/
│   ├── admin-news-api.md          # /api/admin/news*, /api/admin/uploads/sign — statuses, bodies, 401 rule
│   └── public-pages.md            # /news, /news/<category>, /news/<slug>, metadata, query module, images
├── checklists/
│   └── requirements.md            # produced by /sp.specify
└── tasks.md                       # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
next.config.ts                                  # + images.remotePatterns: https://res.cloudinary.com/**
research/design-tokens.md, src/app/globals.css  # + news card/banner tokens from the extraction pass (research §12)
docs/architecture.md                            # + news module map; note explicit `language` for news content
.env.example                                    # already lists CLOUDINARY_*; unchanged

src/
├── models/
│   └── news-post.ts                            # schema + softDeletePlugin + indexes (data-model.md)
├── lib/
│   ├── env.ts                                  # + CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET (required)
│   ├── cloudinary.ts                           # configured SDK; signUpload(kind); verifyUploadedImage(publicId)
│   ├── validation/
│   │   └── news.ts                             # newsPostInputSchema (+ types); reserved-slug refinement
│   └── news/
│       ├── categories.ts                       # NEWS_CATEGORIES, isCategoryKey(), labelFor()
│       ├── slug.ts                             # slugify(), fallbackSlug(), RESERVED_SLUGS
│       ├── sanitize.ts                         # sanitizeBody(html) → { html, text }; link transform
│       ├── excerpt.ts                          # excerptFrom(text, 160)
│       ├── dates.ts                            # toUtcMidnight(yyyy-mm-dd), startOfTodayPkt(), formatPostDate()
│       ├── public-queries.ts                   # publicVisibilityFilter(), listPublishedPosts(), getPublishedPostBySlug()
│       ├── admin-queries.ts                    # listAdminPosts({q,status,category,page}), getAdminPost(id)
│       ├── mutations.ts                        # createPost/updatePost/setStatus/deletePost (used by route handlers)
│       └── cloudinary-loader.ts                # next/image loader: inserts f_auto,q_auto,c_limit,w_
├── app/
│   ├── api/admin/
│   │   ├── news/route.ts                       # POST create
│   │   ├── news/[id]/route.ts                  # GET, PUT, DELETE
│   │   ├── news/[id]/publish/route.ts          # POST
│   │   ├── news/[id]/unpublish/route.ts        # POST
│   │   └── uploads/sign/route.ts               # POST → signature payload
│   ├── admin/(dashboard)/news/
│   │   ├── page.tsx                            # server: requireAdminSession(); listAdminPosts(searchParams); <NewsTable/>
│   │   ├── new/page.tsx                        # server: <NewsEditor mode="create"/>
│   │   └── [id]/page.tsx                       # server: getAdminPost(id) ?? notFound(); <NewsEditor mode="edit" post=…/>
│   └── (public)/news/
│       ├── page.tsx                            # force-dynamic; list page 1..N
│       └── [slug]/page.tsx                     # force-dynamic; category list if isCategoryKey(slug) else post detail; generateMetadata
├── components/
│   ├── admin/news/
│   │   ├── news-table.tsx                      # server: rows (thumb, title w/ dir, status/scheduled badge, category, date, actions)
│   │   ├── news-table-filters.tsx              # "use client": search input (debounced), status + category selects → URL searchParams
│   │   ├── news-pagination.tsx                 # server: prev/next preserving search params (shared with public via props)
│   │   ├── delete-post-dialog.tsx              # "use client": AlertDialog → DELETE → toast → router.refresh()
│   │   ├── news-editor.tsx                     # "use client": form state, Zod client validation, fetch to routes, toasts, dirty tracking
│   │   ├── rich-text-editor.tsx                # "use client": Tiptap + toolbar (H2/H3/B/I/UL/OL/Link), dir by language
│   │   ├── cover-image-field.tsx               # "use client": file pick → client checks → sign → direct upload → preview, alt, remove
│   │   └── use-unsaved-changes.ts              # beforeunload + anchor click guard
│   └── news/
│       ├── news-banner.tsx                     # title + breadcrumb (list, category, post)
│       ├── news-grid.tsx / news-card.tsx       # grid + card (cover/placeholder, title, meta, excerpt, Read More)
│       ├── category-filter.tsx                 # links All + five categories, aria-current
│       ├── news-pagination.tsx                 # prev/next with ?page=
│       ├── news-empty-state.tsx
│       ├── post-body.tsx                       # renders sanitised HTML with dir/font by language
│       └── cover-image.tsx                     # next/image + cloudinaryLoader; placeholder variant
└── content/
    ├── news.ts                                 # public copy: banner titles, empty state, "Read More", meta description
    └── admin.ts                                # + newsCopy: table headers, editor labels, toasts, validation messages, dialog text

e2e/
├── admin-news-journey.spec.ts                  # draft→publish→public→unpublish→delete→404 (spec Acceptance)
├── admin-news-editor.spec.ts                   # slug behaviour, validation messages, upload (stubbed), unsaved-changes prompt
├── admin-news-urdu.spec.ts                     # language field → dir/font in editor, table, card, detail; Urdu search
├── news-public.spec.ts                         # /news list, categories, pagination, empty state at 4 widths vs screenshots
└── news-detail.spec.ts                         # detail page, metadata tags, 404 for draft/future/deleted

src/**/*.test.ts(x)                             # Vitest: lib/news/*, validation/news, models/news-post (DB), api/admin/news* (DB, 401), cloudinary sign shape
```

**Structure Decision**: Extends the single Next.js app exactly along the
lines `docs/architecture.md` lays out — models in `src/models`, server
logic in `src/lib/news`, shared validation in `src/lib/validation`,
admin routes under `/api/admin/*`, admin pages under
`admin/(dashboard)`, public pages under `(public)`, one component per
visual section, copy in `src/content`. All news domain logic lives in
`src/lib/news/*` so route handlers, pages and a future consumer call the
same functions.

## Implementation phases (for /sp.tasks)

1. **Foundation** — deps; env; `next.config` remote patterns; model +
   indexes; validation schema; `lib/news/*` pure helpers with unit
   tests; `cloudinary.ts`.
2. **Admin API** — mutations + route handlers + sign route; DB tests
   incl. 401 for every route, 409 slug, 400 validation, 404.
3. **Admin UI** — table + filters + pagination + delete dialog; editor
   (Tiptap, cover field, language/category/date/status, save/publish/
   unpublish, toasts, unsaved-changes).
4. **Token extraction** — news card/banner values → `design-tokens.md`
   + `@theme` (blocks phase 5).
5. **Public UI** — queries + list/category/detail pages + metadata +
   components; replace the 001 placeholders.
6. **E2E + polish** — Playwright specs, screenshot comparison at four
   widths, `docs/architecture.md` update, remove nothing from 002's
   design-system demo (out of scope).

## Follow-ups and risks

- **Cloudinary orphans**: replaced/removed covers and covers of deleted
  posts stay in Cloudinary (research §3). Follow-up: a maintenance
  script that lists `news/covers/*` not referenced by any post.
- **Token gaps**: if the live site no longer exposes a card value the
  screenshots show, the extraction task flags it for the client instead
  of guessing (Constitution I/V) — this can delay phase 5.
- **Hosting body limits** are avoided by direct upload, but the 5 MB
  client check is the user-facing gate; the server verifies via the
  Cloudinary API on save — a Cloudinary outage returns `502` and keeps
  the form intact rather than blocking the save path silently.

## Complexity Tracking

Not needed — no constitution violations.
