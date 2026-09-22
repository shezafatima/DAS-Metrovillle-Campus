# Research: News (003)

**Feature**: `003-news` | **Date**: 2026-09-21
**Inputs**: spec.md, `docs/architecture.md`, `.specify/memory/constitution.md`,
`specs/002-foundation/{plan,research,data-model}.md`, the 002 admin
primitives (`src/components/ui/*`, `src/app/admin/(dashboard)/design-system/`),
`src/lib/soft-delete.ts`, `src/lib/rtl-text.ts`, `src/content/site-shell.ts`,
`node_modules/next/dist/docs/` (Next 16.3 — verified, not assumed),
`research/tokens/news-*.json`, reference screenshots.

Every decision below was checked against the installed code or docs. Where
a value was read from `npm view`, the version is quoted.

---

## §1 Rich-text editor

**Decision**: Tiptap v3 — `@tiptap/react`, `@tiptap/starter-kit`, plus its
required peers `@tiptap/core` and `@tiptap/pm` (all `3.31.3`, `npm view`).
StarterKit is configured down to exactly the spec's formatting set:
`heading: { levels: [2, 3] }`, bold, italic, bulletList, orderedList,
link (`openOnClick: false`, `protocols: ["http", "https", "mailto"]`,
`autolink: true`), paragraph, hardBreak, history. Everything else in the
kit (code, codeBlock, blockquote, strike, underline, horizontalRule) is
disabled with `false`. Verified: StarterKit 3.31.3 lists
`@tiptap/extension-link` and `@tiptap/extension-underline` as
dependencies, so no separate link package is needed.

**Rationale**: headless (styles come entirely from our tokens — Constitution
V), React 19 peer range confirmed, per-extension allowlist makes FR-002
("MUST NOT allow other formatting") a configuration fact rather than a
filter we hope catches everything. Pasting from Word is filtered by the
same extension set (unknown marks/nodes are dropped on paste).

**Alternatives considered**: Lexical (more assembly for the same toolbar;
weaker paste handling out of the box); Quill (ships its own theme classes
that fight Tailwind tokens; React wrapper is third-party); Markdown
textarea (spec requires a toolbar and WYSIWYG headings/lists/links; Urdu
authors should not learn Markdown).

**Constitution note**: Tiptap is a UI library, not a framework, database or
service provider (II). Flagged in plan.md's Constitution Check and
suggested for an ADR because the body storage format (§2) is a long-lived
data decision.

## §2 Body storage format and sanitisation

**Decision**: Store the body as **sanitised HTML** (`bodyHtml`) plus a
derived plain-text **`excerpt`** (first ~160 characters at a word boundary,
ellipsis when cut) computed server-side on every save. Sanitise with
`sanitize-html@2.17.7` (+ `@types/sanitize-html@2.16.1`) on the server,
allowlist only:

| Allowed | Value |
|---|---|
| Tags | `h2 h3 p strong em ul ol li a br` |
| Attributes | `a[href]` only; `rel`/`target` are *set* by the transform, never accepted from input |
| Schemes | `http`, `https`, `mailto` (anything else → link stripped to text) |
| Transform | external `a` → `rel="noopener noreferrer" target="_blank"`; internal (same origin or relative) → no target |
| Reject | after sanitising, if `textContent.trim() === ""` → validation error "Body is required" (FR-008; covers "formatting only" and "image only") |

**Rationale**: HTML is what Tiptap emits and what the public page renders,
so there is one format end-to-end and no renderer to write. The planned
chatbot (Constitution VII) can consume HTML or the stored `excerpt`
without a Tiptap dependency. Server-side sanitising is the FR-034 control;
the editor's allowlist (§1) is defence-in-depth, not the control.

**Alternatives considered**: Tiptap JSON (needs a renderer on the public
page and in any second consumer; harder to sanitise); Markdown (lossy
round-trip with a WYSIWYG editor; still needs HTML sanitising at render).
`isomorphic-dompurify` rejected — pulls jsdom into the server bundle;
`sanitize-html` is pure Node.

## §3 Cover images — Cloudinary, signed direct upload

**Decision**: The browser uploads **directly to Cloudinary** using a
signature minted by `POST /api/admin/uploads/sign` (session required). The
server uses `cloudinary@2.11.0` (Node SDK) only to sign and, on save, to
verify. Stored on the post (user constraint: only URLs are stored — no
binaries, no base64):

```
coverImage: { url, publicId, width, height, alt } | null
```

Signed parameters fix `folder: "news/covers"`, `allowed_formats:
"jpg,png,webp"`, and an incoming transformation `c_limit,w_2400,h_2400`
so oversized originals are capped at upload time (spec US4 "handled
without breaking the layout"). The 5 MB limit is enforced client-side
before upload (immediate message, form untouched — FR-023/FR-024) **and**
server-side on save: when `coverImage.publicId` changed, the save handler
calls `cloudinary.api.resource(publicId)` and rejects if `bytes > 5 MB`,
format not in the allowlist, or the public id is outside `news/covers/`.

Public delivery: a small `cloudinaryLoader` for `next/image` that inserts
`f_auto,q_auto,c_limit,w_<width>` after `/image/upload/` in the stored
`url` — no cloud name needed at render time, so no `NEXT_PUBLIC_*` env.
`next.config.ts` gains `images.remotePatterns` for
`https://res.cloudinary.com/**`. Cards use a fixed aspect ratio with
`object-cover`; the detail page uses the intrinsic ratio at content width.

Env (server-only, added to `src/lib/env.ts` as **required** — same
fail-early rule as 002 FR-033): `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Asset lifecycle: replacing or removing a cover, or soft-deleting a post,
does **not** destroy the Cloudinary asset in this feature (soft delete
must stay reversible; orphan cleanup is a later ops task — recorded in
plan.md follow-ups).

**Rationale**: hosting is still TODO in `docs/architecture.md`; a
server-relayed upload would be capped by whatever request-body limit the
host imposes (e.g. 4.5 MB on Vercel functions — below our 5 MB limit).
Direct upload has no such dependency, and the sign route keeps
Constitution III intact (no unauthenticated path can mint a signature).

**Alternatives considered**: server-relayed multipart upload (simplest
enforcement, rejected for the host body-limit risk); unsigned upload
preset (rejected — anyone could upload into our account); storing
`secure_url` only without `publicId` (rejected — server-side verification
and future cleanup need the id).

## §4 Slugs (addresses)

**Decision**: `src/lib/news/slug.ts` → `slugify(title)`:
NFKC-normalise → lowercase → keep `\p{L}` `\p{N}` (so Urdu letters
survive — spec assumption) → everything else to `-` → collapse and trim
hyphens → cap at 120 chars. Empty result → `post-<yyyymmdd>-<4 random
base36 chars>` (FR-005 fallback). Reserved slugs (rejected with a field
error): the five category keys (§7) and `page`.

Uniqueness: **unique index on `slug` with no partial filter**, so
soft-deleted posts keep their address reserved (spec assumption; FR-004).
On create with an auto-generated slug, the server appends `-2`, `-3`, …
until free. A hand-edited slug that collides returns `409` with a field
error and the client keeps all other input (US1 scenario 7).

Client behaviour (FR-003): the slug field auto-fills from the title only
while `slugTouched === false` and the post is new; any manual edit or a
successful first save sets it true.

## §5 Publish date and public visibility

**Decision**: `publishDate` is stored as a `Date` at **UTC midnight of the
chosen calendar day** (input `YYYY-MM-DD`). Visibility is computed with a
single helper `startOfTodayPkt()` — today's calendar date in
`Asia/Karachi` as a UTC-midnight `Date` — and the public filter is:

```
{ status: "published", publishDate: { $lte: startOfTodayPkt() } }
```

(plus the plugin's implicit `deletedAt: null`). This is the **only**
public visibility predicate; it lives in `src/lib/news/public-queries.ts`
and every public read (list, category list, detail, metadata) goes
through it (user constraint: public pages never return drafts or deleted
posts). Display format "February 6th, 2023" via `Intl.DateTimeFormat`
plus an ordinal helper, in `src/lib/news/dates.ts`.

**Rationale**: a calendar-date semantic avoids timezone drift between the
admin's browser and the server; PKT is the school's timezone (spec
assumption). Keeping the predicate in one function makes "never returns
drafts" a unit-testable property rather than a per-page discipline.

## §6 Public rendering strategy

**Decision**: `export const dynamic = "force-dynamic"` on `/news` and
`/news/[slug]`. No ISR, no `revalidatePath`.

**Verified**: `next.config.ts` does not enable `cacheComponents`, so the
"previous model" applies (`docs/01-app/02-guides/caching-without-cache-components.md`);
`dynamic = 'force-dynamic'` is still a supported segment option in 16.3.
Under that model a dynamic segment without `generateStaticParams` and
without runtime API access would be cached after first render — exactly
what would make an unpublished post linger.

**Rationale**: spec US1 scenario 4 requires a post to disappear
"immediately" on unpublish and the public list is `searchParams`-driven
(pagination) anyway. One indexed query per request is trivial at a
school site's traffic.

**Alternatives considered**: ISR + `revalidatePath` on every mutation
(rejected for now: more surface to get wrong — three path patterns plus
metadata — for no user-visible gain; recorded as the upgrade path if
traffic ever demands it); `use cache` + `cacheTag` (requires enabling
Cache Components project-wide — an architecture change outside this
feature).

## §7 Categories and routing

**Decision**: Category keys and labels are a fixed constant
(`src/lib/news/categories.ts`): `head-office` "Head Office", `events`
"Events", `activities` "Activities", `achievements` "Achievements",
`announcements` "Announcements". Category lists live at
`/news/<category-key>` — **verified** this is what the 001 site menu
already links (`src/content/site-shell.ts:100-104`) and what the
reference site uses. `src/app/(public)/news/[slug]/page.tsx` therefore
branches: if `slug` is a category key → render the category list (with
`?page=`), else → post detail; unknown slug → `notFound()`. Post slugs
matching a category key are rejected at validation (§4).

Pagination: `?page=N` on both `/news` and `/news/<category>`; 9 per page;
`page` < 1 or non-numeric → treated as 1; page beyond the last → empty
state (not 404), so a stale link still shows the layout.

**Alternatives considered**: `/news/category/<key>` (rejected — would
break the existing menu links and diverge from the reference for no
reason); separate static route files per category (five near-identical
pages; rejected).

## §8 Admin data access — route handlers + server-component reads

**Decision**:
- **Reads for admin pages** are direct server-component calls into
  `src/lib/news/admin-queries.ts` (list with search/status/category
  filter + pagination; get by id), each page calling
  `requireAdminSession()` itself (architecture rule).
- **Mutations** are JSON **route handlers** under `/api/admin/news`
  (create, update, publish, unpublish, delete) and
  `/api/admin/uploads/sign`, each calling
  `requireAdminSession({ mode: "api" })` and returning `401` otherwise —
  the shape 002 established with `/api/admin/session`. The editor (client
  component) calls them with `fetch`, shows toasts from
  `src/components/ui/toaster.tsx`, and `router.refresh()`s the list.

**Rationale**: the spec's acceptance test "every admin news route rejects
unauthorized requests" maps 1:1 onto Vitest route-handler tests exactly
like 002's; route handlers are also callable by a future consumer
(Constitution VII) whereas Server Actions are bound to this app's React
tree. Reads stay in-process because pages are already server components
— no reason to hop through HTTP.

**Alternatives considered**: Server Actions for mutations (fewer files;
rejected because 401 behaviour is implicit and untestable as a route);
a full REST read API for public data (`/api/public/news`) — not built
now (VII: no speculative consumers); the query module is the reusable
seam.

## §9 Validation schema (shared client + server)

**Decision**: `src/lib/validation/news.ts` exports `newsPostInputSchema`
(Zod 4) used by the editor form (client-side field errors) and by every
mutation handler (authoritative):

| Field | Rule |
|---|---|
| `title` | trim, 1–200 chars |
| `slug` | optional on create; when present: pattern `^[\p{L}\p{N}]+(-[\p{L}\p{N}]+)*$`, ≤120, not reserved |
| `bodyHtml` | string; sanitised then non-empty text (server refinement) |
| `language` | enum `en` \| `ur`, default `en` |
| `category` | enum of the five keys, required |
| `publishDate` | `YYYY-MM-DD` calendar date |
| `status` | enum `draft` \| `published`, default `draft` |
| `coverImage` | `null` or `{ url: https res.cloudinary.com URL, publicId: starts with `news/covers/`, width/height: positive int, alt: trim 1–200 }` |

Error responses are `400 { error: "validation", fields: { <name>: <message> } }`
so the client can place messages under the right field with the 002
`FormMessage` primitive.

## §10 Urdu / direction

**Decision**: the post's `language` drives `dir` and font explicitly:
`dir="rtl"` + `font-body-urdu` class for `ur`, `dir="ltr"` + default
fonts for `en`, applied to the title input, the Tiptap editor root
(`editorProps.attributes`), the admin table cell, the card title/excerpt
and the detail body/title. English words inside Urdu text are handled by
the browser's bidi algorithm inside an `rtl` container (FR-030). The
existing `isRtlScript()` helper stays for the site shell; news does not
detect script, it reads the field (spec clarification).

`docs/architecture.md` "Media and content" says Urdu text uses
`dir="auto"`; this feature deliberately uses the explicit field for news
content as the spec requires — plan.md records the doc update.

## §11 Unsaved-changes warning

**Decision**: a `useUnsavedChanges(isDirty)` hook in the editor:
`beforeunload` (reload/close tab) plus a capture-phase click listener on
`a[href]` inside the admin document that calls `confirm()` when dirty.
Verified: Next 16 App Router exposes no navigation-blocking API
(no `router.events`), so in-app links must be intercepted at the DOM
level. Dirty state resets after a successful save.

## §12 Design tokens for the news pages

**Finding**: `research/tokens/news-{375,768,1024,1440}.json` are page-level
aggregates (colour/font/radius/spacing frequency lists). They confirm the
card title colour `rgb(0,188,212)` (= existing `--color-accent`), Poppins
700 headings, body font, `radius-card` 20px and `shadow-card` — but they
do **not** capture per-element values the cards need: card title
font-size/line-height, meta line (date | category) size and colour, card
border colour and padding, excerpt line-height, "Read More" size and
chevron, banner height/overlay/title size, grid gap.

**Decision**: a **token-extraction task precedes any news UI task**: run
the existing `research/extract-tokens.ts` approach with news-card
selectors against `https://das.edu.pk/news/` at the four widths, add the
values to `research/design-tokens.md` and `@theme` in `globals.css`
(Constitution V: extracted first, never guessed). Any value the live site
no longer exposes is flagged in the PR, not approximated.

## §13 Testing approach

- **Vitest (jsdom)**: `slugify`, `excerptFrom`, `sanitizeBody` (allowlist,
  scheme stripping, empty-text detection), `startOfTodayPkt`/`formatPostDate`,
  `newsPostInputSchema`, category helpers, `cloudinaryLoader`.
- **Vitest (node, `describeWithDb`)**: model indexes (slug unique incl.
  deleted); `publicQueries` never return draft / future / deleted
  (property-style test over a seeded matrix — SC-002); admin list
  search/filter/pagination; every `/api/admin/news*` and
  `/api/admin/uploads/sign` handler → `401` without a session and the
  documented status codes with one (409 slug conflict, 400 validation,
  404 unknown id).
- **Playwright (`admin` project, serial)**: the spec's E2E journey
  (draft → publish → visible on `/news` + detail → unpublish → gone →
  delete → 404), Urdu post rendering (dir/font assertions), category
  filter, image upload (stubbed Cloudinary endpoint via `page.route` so
  the suite needs no live account), unsaved-changes prompt.
- **Playwright (`chromium` project)**: `/news` and a seeded detail page at
  375/768/1024/1440 with screenshot comparison against
  `screenshots/das.edu.pk_news_*.png` crops and computed-style checks
  against the new tokens.

Cloudinary is never called for real in CI: the sign route is unit-tested
for its output shape and the browser upload is intercepted.

## §14 New dependencies (all verified on npm, 2026-09-21)

| Package | Version | Why |
|---|---|---|
| `@tiptap/react`, `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit` | 3.31.3 | editor (§1) |
| `sanitize-html` / `@types/sanitize-html` | 2.17.7 / 2.16.1 | server sanitiser (§2) |
| `cloudinary` | 2.11.0 | signing + resource verification (§3) |

No framework, database or provider is added; Cloudinary is already named
in Constitution II.
