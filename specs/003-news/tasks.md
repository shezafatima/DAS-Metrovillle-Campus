---

description: "Task list for News (003) implementation"
---

# Tasks: News

**Input**: Design documents from `/specs/003-news/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-news-api.md, contracts/public-pages.md, quickstart.md

**Tests**: Included — spec.md's Acceptance section and Constitution VIII require the E2E journey (draft → publish → public → unpublish → delete → not found), an unauthorized-access test for every admin news route, tests proving drafts and deleted posts are never returned publicly, and screenshot checks at 375/768/1024/1440px. research.md §13 maps each to a file; those files are tasks here. DB-backed Vitest files (`[DB]`) use `describeWithDb()` (`src/test/db.ts`) against `dar_e_arqam_test` and skip with a notice when `MONGODB_URI` is unset. Playwright admin specs stub `https://api.cloudinary.com/**` with `page.route`, so no live Cloudinary account is needed to run them.

**Organization**: Tasks are grouped by spec.md user story (US1–US7) so each story is an independently testable increment. Category is a required field on the model (data-model.md), so the editor picker ships in US1; US7 adds the labels and filters.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to a spec.md user story (US1–US7); Setup/Foundational/Polish tasks carry no story label
- File paths are exact and relative to the repository root

## Path Conventions

Single existing Next.js app (plan.md Structure Decision): `src/`, `e2e/`, `research/`, `docs/` at repository root. Admin pages under `src/app/admin/(dashboard)/news/`, admin routes under `src/app/api/admin/`, public pages under `src/app/(public)/news/`, domain logic under `src/lib/news/`.

---

## Phase 1: Setup

**Purpose**: Install the packages research.md §14 verified, declare the env contract, allow Cloudinary images, and wire test infrastructure for the new collection.

- [X] T001 Install dependencies at the verified versions: `npm install @tiptap/react@3.31.3 @tiptap/core@3.31.3 @tiptap/pm@3.31.3 @tiptap/starter-kit@3.31.3 sanitize-html@2.17.7 cloudinary@2.11.0` and `npm install -D @types/sanitize-html@2.16.1`; confirm `npm ls @tiptap/core` shows one version and `npm ls mongodb` still shows a single driver (architecture rule)
- [X] T002 [P] Extend `envSchema` in `src/lib/env.ts` with required `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (trimmed, non-empty) and append them to `REQUIRED_ENV_KEYS` in that order so a missing one fails startup with `Missing required environment variable: <NAME>`; add cases to `src/lib/env.test.ts` (missing `CLOUDINARY_API_SECRET` → error names it; all three present → parsed) — research.md §3
- [X] T003 [P] Add `images: { remotePatterns: [new URL("https://res.cloudinary.com/**")] }` to `next.config.ts` (contracts/public-pages.md Images)
- [X] T004 [P] Add `"news"` to the collections wiped in `e2e/global-setup.ts` (`["user", "session", "account", "throttle", "news"]`) so every Playwright run starts with no posts
- [X] T005 [P] Create `e2e/helpers/news.ts` exporting `seedPosts(posts: Partial<NewsPostSeed>[])` and `clearPosts()` that connect to `dar_e_arqam_test` with mongoose (same pattern as `clearThrottle()` in `e2e/global-setup.ts`) and insert documents directly into the `news` collection with sensible defaults (`status: "published"`, `language: "en"`, `category: "head-office"`, `publishDate` = today UTC midnight, `coverImage: null`, `deletedAt: null`, `excerpt` derived from a plain `bodyHtml`), plus `loginAsAdmin(page)` copied from `e2e/admin-layout.spec.ts`'s `login()` so every news spec shares one helper

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The model, the shared validation schema, the pure domain helpers with their unit tests, the Cloudinary wrapper and the copy files — everything every story imports.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Domain constants and helpers

- [X] T006 [P] Create `src/lib/news/categories.ts`: `NEWS_CATEGORIES` as const (`head-office` "Head Office", `events` "Events", `activities` "Activities", `achievements` "Achievements", `announcements` "Announcements"), `NewsCategoryKey` type, `NEWS_CATEGORY_KEYS` tuple (for Zod enum), `isCategoryKey(value): value is NewsCategoryKey`, `categoryLabel(key)` (data-model.md Category)
- [X] T007 [P] Create `src/lib/news/slug.ts`: `RESERVED_SLUGS` (= category keys + `"page"`), `slugify(title)` (NFKC → lowercase → keep `\p{L}\p{N}` → others to `-` → collapse/trim → max 120), `fallbackSlug(date = new Date())` → `post-<yyyymmdd>-<4 base36 chars>`, `isReservedSlug(slug)`, `SLUG_PATTERN = /^[\p{L}\p{N}]+(-[\p{L}\p{N}]+)*$/u` (research.md §4)
- [X] T008 [P] Vitest unit tests in `src/lib/news/slug.test.ts`: `"Annual Sports Day 2026"` → `annual-sports-day-2026`; Urdu title keeps Urdu letters; punctuation/spaces collapse; 300-char title capped at 120 without a trailing hyphen; emoji-only title → `fallbackSlug` shape `/^post-\d{8}-[a-z0-9]{4}$/`; `isReservedSlug("events")` true, `("events-2026")` false — depends on T007
- [X] T009 [P] Create `src/lib/news/sanitize.ts`: `sanitizeBody(html): { html, text }` using `sanitize-html` with allowlist tags `h2 h3 p strong em ul ol li a br`, `allowedAttributes: { a: ["href"] }`, `allowedSchemes: ["http","https","mailto"]`, `transformTags.a` adding `rel="noopener noreferrer" target="_blank"` only when `href` is absolute and not same-origin (origin from `getEnv().BETTER_AUTH_URL`), and `text` = tag-stripped, whitespace-collapsed content (research.md §2)
- [X] T010 [P] Vitest unit tests in `src/lib/news/sanitize.test.ts`: `<script>`/`onclick`/`style`/`img`/`h1`/`table` stripped; `javascript:` link becomes plain text; external link gains `rel`+`target`, relative link does not; `<p></p><ul><li></li></ul>` → `text === ""`; Urdu text survives untouched — depends on T009
- [X] T011 [P] Create `src/lib/news/excerpt.ts`: `excerptFrom(text, max = 160)` — returns `text` unchanged when `≤ max`, else cut at the last word boundary before `max` and append `"…"`; and `src/lib/news/excerpt.test.ts` (short text unchanged; long text ends with `…` and ≤ 161 chars; never cuts mid-word; Urdu text respects spaces)
- [X] T012 [P] Create `src/lib/news/dates.ts`: `toUtcMidnight("YYYY-MM-DD")` → `Date`, `toDateInput(date)` → `"YYYY-MM-DD"`, `startOfTodayPkt(now = new Date())` → today's calendar date in `Asia/Karachi` as a UTC-midnight `Date` (via `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" })`), `formatPostDate(date)` → `"February 6th, 2023"` (ordinal helper: 1st 2nd 3rd 4th … 11th 12th 13th … 21st 22nd 23rd 31st); and `src/lib/news/dates.test.ts` covering a `now` of 2026-09-21T19:30Z (= 22 Sept 00:30 PKT → returns 2026-09-22 UTC midnight), the ordinal table, and the round-trip `toDateInput(toUtcMidnight(x)) === x` (research.md §5)
- [X] T013 [P] Create `src/lib/news/cloudinary-loader.ts`: `cloudinaryLoader({ src, width })` inserting `f_auto,q_auto,c_limit,w_<width>/` after `/image/upload/` (returns `src` unchanged when the marker is absent) and `ogImageUrl(src)` inserting `c_fill,w_1200,h_630,f_auto,q_auto/`; plus `src/lib/news/cloudinary-loader.test.ts` (both transforms; non-Cloudinary URL passthrough; existing version segment `/v123/` preserved) — contracts/public-pages.md Images

### Validation schema and model

- [X] T014 Create `src/lib/validation/news.ts` (Zod 4, shared client + server): `coverImageSchema` (`url` https `res.cloudinary.com` pattern, `publicId` startsWith `news/covers/`, `width`/`height` positive int, `alt` trim 1–200), `newsPostInputSchema` (`title` trim 1–200; `slug` optional string matching `SLUG_PATTERN`, ≤120, `.refine(!isReservedSlug)` with message `"This address is reserved."`; `bodyHtml` string min 1; `language` enum `["en","ur"]` default `"en"`; `category` enum `NEWS_CATEGORY_KEYS`; `publishDate` regex `^\d{4}-\d{2}-\d{2}$` + valid date refine; `status` enum `["draft","published"]` default `"draft"`; `coverImage` `coverImageSchema.nullable()` default `null`), exported `NewsPostInput` type, and `fieldErrors(zodError)` → `Record<string, string>` for the `400 { error: "validation", fields }` envelope — depends on T006, T007
- [X] T015 [P] Vitest unit tests in `src/lib/validation/news.test.ts`: valid input parses with defaults; empty title → `fields.title`; 201-char title rejected; reserved slug `"events"` → `"This address is reserved."`; slug `"Bad Slug"` rejected; `publishDate: "2026-02-30"` rejected; cover image with empty `alt` → `fields["coverImage.alt"]`; `publicId` outside `news/covers/` rejected — depends on T014
- [X] T016 Create `src/models/news-post.ts`: Mongoose schema per data-model.md (`title`, `slug`, `bodyHtml`, `excerpt`, `language`, `category`, `status`, `publishDate`, `coverImage` subdocument or `null`, `timestamps: true`), `schema.plugin(softDeletePlugin)`, indexes `{ slug: 1 } unique`, `{ status: 1, publishDate: -1, deletedAt: 1 }`, `{ category: 1, status: 1, publishDate: -1, deletedAt: 1 }`, `{ title: 1 }`; export `NewsPost` model typed with `SoftDeleteStatics`, guarded with `mongoose.models.NewsPost ??` for dev HMR (same pattern as `src/models/throttle.ts`) — depends on T006
- [X] T017 Vitest `[DB]` tests in `src/models/news-post.test.ts` (`describeWithDb("NewsPost", ["news"], …)`): `syncIndexes()` then inserting two posts with the same slug throws a duplicate-key error; the same holds when the first is soft-deleted via `softDeleteById` (slug stays reserved); default `find()` excludes the soft-deleted post and `.setOptions({ withDeleted: true })` includes it — depends on T016

### Cloudinary wrapper and copy

- [X] T018 [P] Create `src/lib/cloudinary.ts`: configure the SDK from `getEnv()` (`secure: true`), export `NEWS_COVER_FOLDER = "news/covers"`, `NEWS_COVER_MAX_BYTES = 5 * 1024 * 1024`, `NEWS_COVER_FORMATS = "jpg,png,webp"`, `NEWS_COVER_TRANSFORMATION = "c_limit,w_2400,h_2400"`, `signNewsCoverUpload()` → `{ cloudName, apiKey, timestamp, signature, folder, allowedFormats, transformation, maxBytes }` using `cloudinary.utils.api_sign_request({ timestamp, folder, allowed_formats, transformation }, apiSecret)`, and `verifyNewsCover(publicId)` → `{ ok: true } | { ok: false, reason: "too_large" | "bad_format" | "wrong_folder" } | { ok: false, reason: "unavailable" }` via `cloudinary.api.resource(publicId)` (contracts/admin-news-api.md sign + verification) — depends on T002
- [X] T019 [P] Vitest unit tests in `src/lib/cloudinary.test.ts` (mock `cloudinary` with `vi.mock`): sign payload has every documented key, never includes the secret, and the signature equals `api_sign_request` over exactly `{ timestamp, folder, allowed_formats, transformation }`; `verifyNewsCover` maps `bytes > 5 MB` → `too_large`, `format: "gif"` → `bad_format`, `public_id: "other/x"` → `wrong_folder`, thrown API error → `unavailable` — depends on T018
- [X] T020 [P] Create `src/content/news.ts` (public copy): banner title `"News"`, breadcrumb labels, `readMore: "Read More"`, `emptyState` title/body, `allCategories: "All"`, list meta description, `pageTitle(n)`/`categoryPageTitle(label, n)` helpers — Constitution VI
- [X] T021 [P] Add `newsCopy` to `src/content/admin.ts`: table headers (Cover, Title, Status, Category, Date), status/scheduled badge labels, search placeholder, filter labels, `newPost`, editor field labels (title, address, language, category, publish date, cover image, alternative text, body), toolbar labels (Heading 2/3, Bold, Italic, Bullet list, Numbered list, Link), button labels (Save draft, Save & publish, Publish, Unpublish, Delete, Cancel, Remove image), toast copy (saved, published, unpublished, deleted, upload failed, validation failed, unavailable), delete dialog title/body, unsaved-changes prompt, validation messages matching `src/lib/validation/news.ts`

**Checkpoint**: Foundation ready — `npm test` green (unit + `[DB]` suites), model and schema in place, user story phases can begin.

---

## Phase 3: User Story 1 — Admin writes and publishes a news post (Priority: P1) 🎯 MVP

**Goal**: Create, edit, save-as-draft, publish and unpublish a post from `/admin/news/new` and `/admin/news/[id]` with an auto-suggested editable unique address, a Tiptap body limited to the spec's formatting, clear toasts and field errors, and an unsaved-changes warning.

**Independent Test**: Log in, open `/admin/news/new`, type a title (address auto-fills), pick a category, write a body with heading/list/link, "Save draft" → toast, post stored as draft; open `/admin/news/<id>`, "Publish" → status published; change the address by hand → saved; save with a taken address → field error, other input intact. (spec US1 scenarios 1–10; no public page needed.)

### Server: mutations and routes

- [X] T022 [US1] Create `src/lib/news/mutations.ts`: `createPost(input)` (parse with `newsPostInputSchema`; `sanitizeBody` → reject with `{ bodyHtml: "Body is required." }` when `text` is empty; `excerptFrom(text)`; slug = provided, else `slugify(title) || fallbackSlug()` then append `-2`, `-3`… until no document (incl. deleted, `withDeleted: true`) has it; provided-slug collision → `SlugConflictError`; `publishDate` via `toUtcMidnight`; cover verification hook `verifyCover?: (publicId) => Promise<…>` invoked only when `coverImage` is present — wired in US4), `updatePost(id, input)` (same rules; slug collision excludes the post itself; `null` when id unknown/deleted), `setPostStatus(id, "draft" | "published")`, `deletePost(id)` (= `NewsPost.softDeleteById`); all return plain DTOs; export `ValidationFailure` (fields map) and `SlugConflictError` — depends on T014, T016, T009, T011, T012
- [X] T023 [US1] Vitest `[DB]` tests in `src/lib/news/mutations.test.ts`: two posts titled "Sports Day" get `sports-day` and `sports-day-2`; a soft-deleted `sports-day` still forces `-2`; provided slug collision throws `SlugConflictError`; update keeps the slug when only the title changes; formatting-only body rejected with `fields.bodyHtml`; `excerpt` recomputed on update; `setPostStatus` toggles; `deletePost` sets `deletedAt` and the post disappears from `find()` — depends on T022
- [X] T024 [P] [US1] Create `src/app/api/admin/news/route.ts`: `POST` → `requireAdminSession({ mode: "api" })` else `401 { error: "unauthorized" }`; parse JSON; `createPost` → `201 { id, slug }`; `ValidationFailure` → `400 { error: "validation", fields }`; `SlugConflictError` → `409` with `fields.slug = "This address is already in use."`; DB errors → `503 { error: "unavailable" }`; `Cache-Control: no-store` on every response (contracts/admin-news-api.md) — depends on T022
- [X] T025 [P] [US1] Create `src/app/api/admin/news/[id]/route.ts`: `GET` → `AdminPost` DTO or `404 { error: "not_found" }`; `PUT` → `updatePost` with the same error mapping as T024 and `200 { id, slug }`; `DELETE` → `deletePost` → `200 { id }` or `404` (DELETE is exercised by US2's dialog but lives here with the other verbs); every verb session-gated — depends on T022
- [X] T026 [P] [US1] Create `src/app/api/admin/news/[id]/publish/route.ts` and `src/app/api/admin/news/[id]/unpublish/route.ts`: `POST` → session gate → `setPostStatus` → `200 { id, status }` or `404`; idempotent — depends on T022
- [X] T027 [US1] Vitest `[DB]` route tests in `src/app/api/admin/news/route.test.ts` and `src/app/api/admin/news/[id]/route.test.ts` (mock `@/lib/dal` `requireAdminSession` like `src/app/api/admin/session/route.test.ts`): **every verb of every route (POST create, GET, PUT, DELETE, POST publish, POST unpublish) returns 401 without a session**; with a session: create → 201 with generated slug; create with empty title → 400 `fields.title`; create with taken slug → 409; PUT unknown id → 404; publish → 200 `status: "published"`; unpublish → `"draft"`; DELETE → 200 then GET → 404 (spec Acceptance "every admin news route rejects unauthorized requests") — depends on T024, T025, T026

### Admin editor UI

- [X] T028 [P] [US1] Create `src/components/admin/news/rich-text-editor.tsx` (`"use client"`): Tiptap `useEditor` with `StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, blockquote: false, strike: false, underline: false, horizontalRule: false, link: { openOnClick: false, autolink: true, protocols: ["http","https","mailto"] } })`, `immediatelyRender: false`, `editorProps.attributes` `{ dir, class, "aria-label" }` from props; toolbar of `Button variant="ghost" size="sm"` toggles (H2, H3, Bold, Italic, Bullet list, Numbered list, Link via `window.prompt` for the URL with `aria-pressed` state); `onChange(html)`; content styled only with existing tokens (`font-heading` for headings, `text-body`, list indent via spacing tokens) — research.md §1
- [X] T029 [P] [US1] Create `src/components/admin/news/use-unsaved-changes.ts`: `useUnsavedChanges(isDirty: boolean)` registering `beforeunload` (sets `event.returnValue`) and a capture-phase `click` listener on `document` that, for `a[href]` targets (not `target="_blank"`, no modifier keys) when dirty, calls `window.confirm(newsCopy.unsavedPrompt)` and `preventDefault()` + `stopPropagation()` on cancel; cleans up on unmount — research.md §11
- [X] T030 [US1] Create `src/components/admin/news/news-editor.tsx` (`"use client"`): props `mode: "create" | "edit"`, `post?: AdminPost`; state for every `NewsPostInput` field with `slugTouched` (auto-fill `slugify(title)` while `mode === "create" && !slugTouched`); 002 `Form/FormField/FormLabel/FormControl/FormMessage` for title, address, language (`select` en/ur), category (`select` from `NEWS_CATEGORIES`), publish date (`type="date"`, default `toDateInput(new Date())`), status shown as a `Badge`; `RichTextEditor` for body; cover-image slot rendering `null` until US4 (`CoverImageField` prop); client-side `newsPostInputSchema.safeParse` → field messages before any request; buttons **Save draft** (`status: "draft"`), **Save & publish** (`status: "published"`) → `POST /api/admin/news` or `PUT /api/admin/news/[id]`; in edit mode also **Publish**/**Unpublish** → the status routes; map `400/409` `fields` onto `FormMessage`s, `503` → `toast` unavailable, success → `toast` + `router.push("/admin/news/<id>")` (create) or `router.refresh()` (edit); `useUnsavedChanges(isDirty)` reset after a successful save; a Cancel link to `/admin/news` — depends on T028, T029, T021, T014
- [X] T031 [P] [US1] Create `src/app/admin/(dashboard)/news/new/page.tsx`: `await requireAdminSession()`; page header "New post" (same `PageHeader` layout as `design-system-demo.tsx`); `<NewsEditor mode="create" />`; `metadata.title = "New post"` — depends on T030
- [X] T032 [P] [US1] Create `src/lib/news/admin-queries.ts` with `getAdminPost(id)` → `AdminPost | null` (plain DTO, `toDateInput` for `publishDate`, `isScheduled` computed) — `listAdminPosts` is added in US2 — depends on T016, T012
- [X] T033 [US1] Create `src/app/admin/(dashboard)/news/[id]/page.tsx`: `await requireAdminSession()`; `getAdminPost(id) ?? notFound()`; header with the post title; `<NewsEditor mode="edit" post={post} />` — depends on T030, T032
- [X] T034 [US1] Playwright `e2e/admin-news-editor.spec.ts` (admin project): login; `/admin/news/new`; title → address auto-fills `annual-sports-day-2026`; editing the address stops auto-fill; save with empty body → message "Body is required." and title still present; valid draft save → success toast and URL `/admin/news/<id>`; publish → "Published" badge; unpublish → "Draft"; edit title → address unchanged; set address to one already used by a seeded post (via `seedPosts`) → field error, other fields intact; type in the body then click the sidebar "Overview" link → `page.on("dialog")` receives a confirm and dismissing it keeps the URL — depends on T031, T033, T027, T005

**Checkpoint**: US1 complete — posts can be authored, drafted, published and unpublished from the admin; all admin news routes reject unauthorized requests.

---

## Phase 4: User Story 2 — Admin manages the list of posts (Priority: P1)

**Goal**: `/admin/news` table newest first with thumbnail, title, status (with "Scheduled" marker), category, date; title search (Urdu-safe), status filter, 20-per-page pagination preserving filters; confirmed soft delete that removes the post from admin and public.

**Independent Test**: Seed posts of mixed status/dates; `/admin/news` shows them newest first with the right badges; search narrows by title; status filter narrows; page 2 keeps the search; Delete → confirm → row gone and `/news/<slug>` 404s; Cancel → nothing changes; a 200-char title is truncated with an ellipsis and a `title` attribute.

- [X] T035 [US2] Add `listAdminPosts({ q?, status?, category?, page })` to `src/lib/news/admin-queries.ts`: filter `title: { $regex: escapeRegExp(q), $options: "i" }` when `q`, `status` when not `"all"`, `category` when given; sort `{ publishDate: -1, updatedAt: -1 }`; `pageSize = 20`; `page` clamped ≥1; returns `Paged<AdminPostRow>` with `isScheduled = status === "published" && publishDate > startOfTodayPkt()` and `coverThumbUrl` (via `cloudinaryLoader` width 160) — depends on T032, T013
- [X] T036 [US2] Vitest `[DB]` tests in `src/lib/news/admin-queries.test.ts`: 25 seeded posts → page 1 has 20 newest-first, page 2 has 5, `totalPages === 2`; search `"ورزش"` matches an Urdu title and `"sports"` matches case-insensitively; regex metacharacters in `q` (`"a+b"`) do not throw; status filter excludes the other status; soft-deleted posts never appear; tomorrow-dated published post has `isScheduled === true` — depends on T035
- [X] T037 [P] [US2] Create `src/components/admin/news/news-table-filters.tsx` (`"use client"`): search `Input` (300 ms debounce) + status `select` (All/Draft/Published) + category `select` slot (populated in US7) writing `q`/`status`/`category` to the URL with `router.replace` and resetting `page`; reads initial values from `useSearchParams` — depends on T021
- [X] T038 [P] [US2] Create `src/components/admin/news/news-pagination.tsx` (server): prev/next `Link`s built from current `searchParams` + `page`; disabled states; "Page N of M" text; hidden when `totalPages ≤ 1`
- [X] T039 [P] [US2] Create `src/components/admin/news/delete-post-dialog.tsx` (`"use client"`): 002 `AlertDialog` triggered by a `Button variant="ghost" size="sm"` with `Trash2` icon and accessible label; on confirm `fetch("/api/admin/news/<id>", { method: "DELETE" })` → success `toast` + `router.refresh()`, failure `toast` error; copy from `newsCopy` — depends on T021, T025
- [X] T040 [US2] Create `src/components/admin/news/news-table.tsx` (server): 002 `Table` with columns Cover (`next/image` thumbnail via `cloudinaryLoader` or a neutral `Skeleton`-styled placeholder box, 64×40, `alt=""`), Title (link to `/admin/news/<id>`, `truncate max-w-[…]` via an existing width token, `title` attribute with the full title, `dir` from `language`), Status (`Badge` default/secondary; extra outline `Badge` "Scheduled · <date>" when `isScheduled`), Category (label), Date (`formatPostDate`), Actions (Edit link + `DeletePostDialog`); empty state row "No posts yet." — depends on T035, T039
- [X] T041 [US2] Replace the placeholder `src/app/admin/(dashboard)/news/page.tsx`: `await requireAdminSession()`; parse `searchParams` (`q`, `status`, `category`, `page`); `listAdminPosts(...)`; `PageHeader` "News" with a "New post" `Button` link to `/admin/news/new`; `<NewsTableFilters/>`, `<NewsTable/>`, `<NewsPagination/>`; `metadata.title = "News"` — depends on T037, T038, T040
- [X] T042 [US2] Playwright `e2e/admin-news-list.spec.ts` (admin project): seed 25 posts (mixed status, one dated tomorrow, one 200-char title, one Urdu title); table order newest first; "Scheduled" badge on the future post; search by English and Urdu fragments; status filter; page 2 retains `?q=`; long title cell has `text-overflow: ellipsis` (computed style) and a `title` attribute; Delete → confirm → row gone → `page.goto("/news/<slug>")` shows "Page not found"; Delete → Cancel → row remains — depends on T041, T005

**Checkpoint**: US1 + US2 complete — the admin can author, find and remove posts.

---

## Phase 5: User Story 3 — Visitor reads the news (Priority: P1)

**Goal**: `/news` (paginated cards) and `/news/<slug>` (full post) render only published, not-future, not-deleted posts through one visibility predicate, match the reference screenshots at four widths, and 404 for everything else.

**Independent Test**: Seed published / draft / future / deleted posts; `/news` lists only the published-and-current ones newest first with cover-or-placeholder, title, date, excerpt; each card opens its detail; every excluded post's address returns the root not-found page; empty DB → empty state; no horizontal scroll at 375px.

### Tokens first (Constitution V gate)

- [X] T043 [US3] Token extraction for the news pages: extend `research/extract-tokens.ts` (or add `research/extract-news-tokens.ts` reusing its browser helpers) with selectors for the reference's post cards on `https://das.edu.pk/news/` — card title (font-size, line-height, colour), meta line (font-size, colour, separator), excerpt (font-size, line-height, colour), "Read More" (font-size, colour, chevron glyph), card border colour/width and padding, grid gap and column widths, card image aspect ratio, banner (height, overlay colour, title size/colour, breadcrumb size) — at 375/768/1024/1440; write results to `research/tokens/news-cards-<width>.json`, add named tokens (`news-card-title`, `news-meta`, `news-excerpt`, `news-read-more`, `color-news-card-border`, `spacing-news-grid-gap`, `news-banner-*`) with exact values to `research/design-tokens.md` and to `@theme` in `src/app/globals.css`; any value the live site no longer exposes is listed in the PR description as a client question, not approximated (research.md §12)

### Public queries

- [X] T044 [US3] Create `src/lib/news/public-queries.ts`: `publicVisibilityFilter(now?)` → `{ status: "published", publishDate: { $lte: startOfTodayPkt(now) } }` (the plugin adds `deletedAt: null`), `listPublishedPosts({ page, category?, now? })` → `Paged<PublicPostSummary>` (9 per page, `publishDate` desc + `updatedAt` desc, `page` clamped, `select` only summary fields, `.lean()` → DTO with ISO date), `getPublishedPostBySlug(slug, now?)` → `PublicPost | null` (contracts/public-pages.md Query module) — depends on T016, T012
- [X] T045 [US3] Vitest `[DB]` tests in `src/lib/news/public-queries.test.ts`: seed the matrix {published-today, published-yesterday, published-tomorrow, draft, published-then-soft-deleted, published-with-category-events}; `listPublishedPosts` returns exactly the two visible ones newest first; `getPublishedPostBySlug` returns `null` for draft, tomorrow and deleted and the DTO for visible; 10 visible posts → page 1 has 9, page 2 has 1; `category: "events"` filters; the DTO has no `deletedAt`/`_id` (spec Acceptance "drafts and deleted posts are never returned publicly", SC-002) — depends on T044

### Public components and pages

- [X] T046 [P] [US3] Create `src/components/news/cover-image.tsx` (server): `CoverImage({ image, variant: "card" | "detail", priority? })` — `next/image` with `loader={cloudinaryLoader}`, `alt={image.alt}`, card: fixed aspect-ratio box with `object-cover` and `sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"`, detail: intrinsic ratio at content width with `sizes="(min-width: 1280px) 1280px, 100vw"`; `CoverImagePlaceholder({ variant })` neutral box using `--color-neutral-100` — depends on T013, T043
- [X] T047 [P] [US3] Create `src/components/news/news-banner.tsx` (server): banner with `h1` title and breadcrumb (`Home » News` / `Home » <post title>` / `Home » <Category>`), `dir` on the title when `language === "ur"`, using the banner tokens from T043 — depends on T043, T020
- [X] T048 [P] [US3] Create `src/components/news/news-card.tsx` and `src/components/news/news-grid.tsx` (server): card = `CoverImage`/placeholder, title `Link` to `/news/<slug>` (`font-heading`, `text-news-card-title`, accent colour, `dir`+`font-body-urdu` when `ur`), meta line `formatPostDate(publishDate)` + `" | "` + category label slot (label rendered in US7; the separator + slot exist now), excerpt (`dir` by language), "Read More ›" link; grid = responsive `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with the extracted gap token — depends on T046, T043, T020, T012
- [X] T049 [P] [US3] Create `src/components/news/news-pagination.tsx` (server, `?page=` prev/next links preserving the current path), `src/components/news/news-empty-state.tsx` (copy from `src/content/news.ts`), and `src/components/news/post-body.tsx` (server: renders `bodyHtml` with `dangerouslySetInnerHTML` inside a `div` carrying `dir` + `font-body-urdu` when `ur`, with token-based typography for `h2 h3 p ul ol li a` via a `prose`-like class defined in `globals.css` under `@layer components` using only existing tokens) — depends on T020, T043
- [X] T050 [US3] Replace `src/app/(public)/news/page.tsx`: `export const dynamic = "force-dynamic"`; parse `searchParams.page`; `listPublishedPosts({ page })`; `<NewsBanner title="News"/>`, category filter slot (US7), `<NewsGrid/>` or `<NewsEmptyState/>`, `<NewsPagination/>`; `generateMetadata` → `pageTitle(page)` + description from content — depends on T044, T047, T048, T049
- [X] T051 [US3] Replace `src/app/(public)/news/[slug]/page.tsx`: `export const dynamic = "force-dynamic"`; `if (isCategoryKey(slug))` → render the category list (implemented in US7; until then fall through to post lookup); `getPublishedPostBySlug(slug) ?? notFound()`; `<NewsBanner title={post.title} language=…/>`, meta line (date | category label slot), `<CoverImage variant="detail" priority/>` when present, `<PostBody/>`; `generateMetadata` minimal (`title`) — full metadata in US6 — depends on T044, T046, T047, T049
- [X] T052 [US3] Playwright `e2e/news-public.spec.ts` (chromium project): seed the visibility matrix from T045 plus 10 visible posts; `/news` shows 9 cards newest first (titles in order), card has image or placeholder, date text `/^[A-Z][a-z]+ \d{1,2}(st|nd|rd|th), \d{4}$/`, excerpt, "Read More"; page 2 shows the 10th; draft/future/deleted slugs → "Page not found" `h1` and HTTP 404; empty DB → empty state; at 375/768/1024/1440: `document.documentElement.scrollWidth <= innerWidth`, grid column count 1/2/3/3, and `expect(page).toHaveScreenshot()` of the list region against masks (baseline reviewed side-by-side with `screenshots/das.edu.pk_news_*.png`); computed-style assertions for card title font-size/colour and card border against `research/tokens/news-cards-<width>.json` — depends on T050, T005, T043
- [X] T053 [US3] Playwright `e2e/news-detail.spec.ts` (chromium project): seeded post with headings/list/link body → `/news/<slug>` renders `h1` title, formatted date, cover image (`img[alt]` with the seeded alt) or none, `h2`/`ul`/`a[rel="noopener noreferrer"][target="_blank"]` in the body; four-width screenshot comparison vs `screenshots/das.edu.pk_news_head-office_%d9%81…_.png`; `/news/does-not-exist` → 404 — depends on T051, T005
- [X] T054 [US3] Playwright `e2e/admin-news-journey.spec.ts` (admin project) — the spec's Acceptance journey end to end through the UI: create draft → `/news` does not list it and `/news/<slug>` 404s → publish → listed and detail renders → unpublish → gone → delete (confirm dialog) → `/news/<slug>` 404 and `/admin/news` no longer lists it — depends on T034, T042, T050, T051

**Checkpoint**: US1–US3 complete — the MVP journey passes end to end; public pages never expose drafts, future or deleted posts.

---

## Phase 6: User Story 4 — Cover images (Priority: P2)

**Goal**: Upload a cover from the admin's computer straight to Cloudinary (signed), with required alt text, client-side 5 MB/type checks, server-side verification on save, removal, and correctly sized public delivery.

**Independent Test**: In the editor pick a 4000×3000 JPEG → preview appears, alt required; save → thumbnail, card and detail show it proportioned; pick a 6 MB file → message names the limit, form untouched; simulate an upload failure → form untouched; remove the image → post displays without one everywhere; on a phone viewport the card `img.currentSrc` contains `w_` ≤ 800.

- [X] T055 [US4] Create `src/app/api/admin/uploads/sign/route.ts`: `POST` → session gate → body `{ kind: "news-cover" }` (400 otherwise) → `signNewsCoverUpload()` → `200` payload per contracts/admin-news-api.md, `Cache-Control: no-store`; and `[DB]`-free Vitest tests in `src/app/api/admin/uploads/sign/route.test.ts`: 401 without session; 200 payload keys; response never contains the API secret; unknown `kind` → 400 — depends on T018
- [X] T056 [US4] Wire cover verification into `src/lib/news/mutations.ts`: when `coverImage` is present and its `publicId` differs from the stored one, call `verifyNewsCover(publicId)`; `too_large` → `fields.coverImage = "Image must be 5 MB or smaller."`, `bad_format` → "…JPEG, PNG or WebP…", `wrong_folder` → "…not a valid upload.", `unavailable` → throw `UploadVerificationError` mapped to `502 { error: "upload_verification_failed" }` in `src/app/api/admin/news/route.ts` and `[id]/route.ts`; add cases to `src/lib/news/mutations.test.ts` (mocked verifier) and to the route tests (502 mapping) — depends on T022, T018, T024, T025
- [X] T057 [US4] Create `src/components/admin/news/cover-image-field.tsx` (`"use client"`): hidden `<input type="file" accept="image/jpeg,image/png,image/webp">` behind a `Button`; on change: reject non-allowed `file.type` or `file.size > 5 MB` with an inline `FormMessage` (copy names the types and limit) and return; else `POST /api/admin/uploads/sign` → multipart `fetch` to `https://api.cloudinary.com/v1_1/<cloudName>/image/upload` with `file, api_key, timestamp, signature, folder, allowed_formats, transformation` → on success call `onChange({ url: secure_url, publicId: public_id, width, height, alt: current alt })`; upload progress state with `Loader2`; failure → `toast` error, field unchanged; preview via `next/image` + `cloudinaryLoader` (width 480); required `alt` `Input` (`FormMessage` from validation); "Remove image" → `onChange(null)` — depends on T055, T021, T013
- [X] T058 [US4] Mount `CoverImageField` in `src/components/admin/news/news-editor.tsx` (replace the US1 `null` slot); include `coverImage` in the submitted input; surface `fields.coverImage` / `fields["coverImage.alt"]` messages; ensure an upload failure never resets other state (state lives in the parent) — depends on T057, T030
- [X] T059 [US4] Playwright `e2e/admin-news-images.spec.ts` (admin project): `page.route("https://api.cloudinary.com/**")` fulfilling with a fake `{ secure_url: "https://res.cloudinary.com/test/image/upload/v1/news/covers/e2e.jpg", public_id: "news/covers/e2e", width: 4000, height: 3000 }` and `page.route("**/api/admin/news", …)` left real but with `verifyNewsCover` stubbed via env flag `NEWS_COVER_VERIFY=skip` honoured only when `NODE_ENV !== "production"` (add to T056); upload a fixture JPEG from `e2e/fixtures/cover.jpg` → preview shows; saving without alt → alt message; with alt → saved; admin table thumbnail `img[src*="w_160"]`; `/news` card `img[src*="c_limit"]`, detail `img[alt="…"]`; 6 MB fixture (generated in-test as a `Buffer`) → message names 5 MB and the title input still holds its text; route the upload to fail with 500 → error toast and title intact; Remove image → save → card shows the placeholder — depends on T058, T056, T005

**Checkpoint**: Cover images upload, verify, display sized per viewport, and degrade cleanly.

---

## Phase 7: User Story 5 — Urdu support (Priority: P2)

**Goal**: The per-post `language` drives `dir` and font in the title input, editor, admin table, public card, detail and page title; English words inside Urdu text render correctly; admin search matches Urdu titles.

**Independent Test**: Create an Urdu post (with a few English words in the body) and an English one; the title field and editor switch direction/font when language is Urdu; table cell, card title/excerpt and detail body are `dir="rtl"` with the Urdu font-family; the English post is `ltr`; searching a fragment of the Urdu title finds it.

- [X] T060 [US5] In `src/components/admin/news/news-editor.tsx`: `language` select drives `dir` and the `font-body-urdu` class on the title `FormControl` and is passed to `RichTextEditor` (`editorProps.attributes.dir` updated via `editor.setOptions` on change); default `"en"` on create — depends on T030, T028
- [X] T061 [P] [US5] Verify/complete `dir` + `font-body-urdu` propagation in `src/components/admin/news/news-table.tsx` (title cell), `src/components/news/news-card.tsx` (title + excerpt), `src/components/news/news-banner.tsx` (title), `src/components/news/post-body.tsx` (body wrapper), and `src/app/(public)/news/[slug]/page.tsx` (`<html lang>` unchanged; `metadata.title` plain); list markers on the right under `rtl` (`ul`/`ol` use `padding-inline-start`, not `padding-left`, in the `prose`-like class from T049) — depends on T040, T048, T047, T049
- [X] T062 [US5] Playwright `e2e/admin-news-urdu.spec.ts` (admin project): create a post with language Urdu, title `فکر اقبال اور تعلیمی نظام`, body paragraphs containing `Bahria University`; assert `dir="rtl"` and `font-family` containing `softLINKS Urdu` (computed) on the title input, the editor root, the admin table title cell, the `/news` card title and excerpt, and the detail body; the English word is present inside an `rtl` container and the paragraph's `direction` computed style is `rtl`; an English post's card title is `ltr`; `/admin/news?q=تعلیمی` lists the Urdu post; the Urdu post's address contains Urdu letters and opens — depends on T060, T061, T005

**Checkpoint**: Urdu and English posts render correctly everywhere.

---

## Phase 8: User Story 6 — Sharing and discovery (Priority: P3)

**Goal**: Full page metadata for posts and list pages (title, description, Open Graph image), default preview image fallback, News menu item marked current.

**Independent Test**: A published post's HTML contains `<title>`, `meta[name=description]` = excerpt, `og:image` = Cloudinary `c_fill,w_1200,h_630` URL (or the site default when no cover), `og:type=article`, canonical `/news/<slug>`; `/news?page=2` title includes "Page 2"; the header's News link has `aria-current="page"` on `/news` and `/news/<slug>`.

- [X] T063 [P] [US6] Add a default preview image `public/images/og-default.jpg` (1200×630, brand colours/logo from `public/images`; kebab-case per architecture) and export `SITE_OG_IMAGE = "/images/og-default.jpg"` from `src/content/site-shell.ts` (or reuse an existing default if 001 already defined one — check `src/app/layout.tsx` metadata first)
- [X] T064 [US6] Complete `generateMetadata` in `src/app/(public)/news/[slug]/page.tsx`: `title`, `description: excerpt`, `alternates.canonical: /news/<slug>`, `openGraph: { type: "article", title, description, publishedTime, images: [{ url: ogImageUrl(cover.url) | SITE_OG_IMAGE, width: 1200, height: 630, alt }] }`, `twitter: { card: "summary_large_image" }`; returns `{}` when the post is not visible (page then 404s); and in `src/app/(public)/news/page.tsx` `title: pageTitle(page)` ("News" / "News — Page N") + description — depends on T051, T050, T063, T013
- [X] T065 [US6] Extend `e2e/news-detail.spec.ts` and `e2e/news-public.spec.ts`: metadata assertions above (with and without cover), `/news?page=2` title, and header News link `aria-current="page"` on `/news` and on a detail page (uses `isNavItemActive` from 001 — assert only) — depends on T064

**Checkpoint**: Posts share with rich previews; list pages are indexable per page.

---

## Phase 9: User Story 7 — Categories (Priority: P2)

**Goal**: Category label on cards and detail, `/news/<category>` filtered lists with their own titles, a category filter on `/news`, a category filter in the admin list, 404 for unknown category addresses.

**Independent Test**: Seed posts across three categories; cards and detail show "<date> | <Label>"; `/news/head-office` lists only Head Office posts, paginated, titled "Head Office — News"; "All" returns to `/news`; a category with no posts shows the empty state; `/admin/news?category=events` narrows and combines with `q`/`status`; `/news/nonsense` → 404.

- [X] T066 [P] [US7] Create `src/components/news/category-filter.tsx` (server): "All" link to `/news` + one link per `NEWS_CATEGORIES` to `/news/<key>`, `aria-current="page"` on the active one, styled with existing nav/button tokens (reference shows category links in the card meta; the filter row is the spec's addition — keep it visually minimal) — depends on T006, T020
- [X] T067 [US7] Fill the category slots: `src/components/news/news-card.tsx` meta renders `categoryLabel(category)` as a `Link` to `/news/<key>`; `src/app/(public)/news/[slug]/page.tsx` meta line renders the label; `src/app/(public)/news/page.tsx` mounts `<CategoryFilter/>` under the banner — depends on T048, T051, T050, T066
- [X] T068 [US7] Implement the category branch in `src/app/(public)/news/[slug]/page.tsx`: when `isCategoryKey(slug)` → `listPublishedPosts({ page: searchParams.page, category: slug })`, `<NewsBanner title={categoryLabel}/>`, `<CategoryFilter active={slug}/>`, grid/empty state, `<NewsPagination basePath={/news/<slug>}/>`, `generateMetadata` title `categoryPageTitle(label, page)`; non-category slugs continue to the post lookup — depends on T051, T044, T066
- [X] T069 [US7] Admin category filter: populate the category `select` in `src/components/admin/news/news-table-filters.tsx` from `NEWS_CATEGORIES` (option "All categories"), pass `category` through `src/app/admin/(dashboard)/news/page.tsx` to `listAdminPosts` (already supported by T035) — depends on T037, T041
- [X] T070 [US7] Playwright `e2e/news-categories.spec.ts` (chromium project) + additions to `e2e/admin-news-list.spec.ts`: seed 12 posts across 3 categories; card meta shows the label link; `/news/head-office` lists only those, `h1` = "Head Office", `<title>` contains "Head Office — News", pagination at 9; "All" → `/news`; `/news/announcements` (none seeded) → empty state; `/news/nonsense` → 404; admin `?category=events&status=draft&q=x` combines; menu item "Head Office" under News opens `/news/head-office` — depends on T067, T068, T069, T005

**Checkpoint**: All seven user stories complete.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, the full gate, and the DoD checks Constitution VIII requires.

- [X] T071 [P] Update `docs/architecture.md`: add the `src/lib/news/*`, `src/models/news-post.ts`, `src/components/news/*`, `src/components/admin/news/*`, `/api/admin/news*` and `/api/admin/uploads/sign` entries to "Folder layout"/"API namespaces"; under "Media and content" record that news content uses an explicit per-post `language` for `dir`/font (spec clarification) while shell text keeps `dir="auto"`; note `force-dynamic` public news pages and the single visibility predicate (research.md §5–§6)
- [X] T072 [P] Update `specs/003-news/quickstart.md` if any step changed during implementation, and add `NEWS_COVER_VERIFY=skip` (test-only) to `.env.example` with a comment that it is ignored in production
- [X] T073 [P] Vitest component tests in `src/components/admin/news/news-editor.test.tsx` (jsdom, mocked `fetch` and `next/navigation`): auto-slug stops after manual edit; client validation blocks submit and shows the title message; 409 response maps to the address field and keeps the body; unsaved-changes `beforeunload` registered only when dirty
- [X] T074 Run the full gate: `npm run lint`, `npx tsc --noEmit`, `npm test` (with `MONGODB_URI` set so `[DB]` suites run, and once unset to confirm they skip), `npx playwright test` (admin + chromium projects) — all 001, 002 and 003 specs green; record any pre-existing failures explicitly in the PR description
- [X] T075 Walk through `specs/003-news/quickstart.md` §4 by hand against a real Atlas database and a real Cloudinary account (one real upload), compare `/news` and a detail page side-by-side with `screenshots/das.edu.pk_news_*.png` at 375/768/1024/1440, and log the outcome (including any token questions from T043) in a PHR under `history/prompts/003-news/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T002–T005 parallel after T001
- **Foundational (Phase 2)**: depends on Phase 1; blocks every story. T006–T013 and T018–T021 are parallel; T014 needs T006+T007; T016 needs T006; T017 needs T016
- **US1 (Phase 3)**: depends on Phase 2 — the MVP
- **US2 (Phase 4)**: depends on Phase 2; uses US1's `[id]` route for DELETE (T025) and the editor pages for links — can be built in parallel with US1 once T025 exists
- **US3 (Phase 5)**: depends on Phase 2 and the token extraction T043; T054 (journey) needs US1 + US2 + US3
- **US4 (Phase 6)**: depends on US1 (editor) and US3 (`CoverImage`)
- **US5 (Phase 7)**: depends on US1, US2, US3 components existing
- **US6 (Phase 8)**: depends on US3 pages
- **US7 (Phase 9)**: depends on US2 (filters) and US3 (pages/cards)
- **Polish (Phase 10)**: after all desired stories

### Within Each Story

- Tests are listed after the code they cover but should be written first and fail before the implementation task is marked done (Constitution VIII)
- Lib/queries → route handlers → components → pages → E2E

### Parallel Opportunities

- Phase 2: eight helper/test pairs (T006–T013) plus T018–T021 can run concurrently
- US1: T024/T025/T026 (routes) in parallel; T028/T029 (editor pieces) in parallel; T031/T032 in parallel
- US2: T037/T038/T039 in parallel
- US3: T046–T049 in parallel once T043 lands; T052/T053 in parallel
- US6/US7 are independent of each other and of US4/US5

---

## Parallel Example: Foundational phase

```bash
Task: "Create src/lib/news/categories.ts"            (T006)
Task: "Create src/lib/news/slug.ts"                  (T007)
Task: "Create src/lib/news/sanitize.ts"              (T009)
Task: "Create src/lib/news/excerpt.ts + test"        (T011)
Task: "Create src/lib/news/dates.ts + test"          (T012)
Task: "Create src/lib/news/cloudinary-loader.ts + test" (T013)
Task: "Create src/lib/cloudinary.ts"                 (T018)
Task: "Create src/content/news.ts"                   (T020)
Task: "Add newsCopy to src/content/admin.ts"         (T021)
```

## Parallel Example: User Story 1

```bash
# After T022 (mutations):
Task: "POST /api/admin/news route"                   (T024)
Task: "GET/PUT/DELETE /api/admin/news/[id] route"    (T025)
Task: "publish/unpublish routes"                     (T026)
# Independently:
Task: "RichTextEditor component"                     (T028)
Task: "useUnsavedChanges hook"                       (T029)
```

---

## Implementation Strategy

### MVP First (US1 → US2 → US3)

1. Phase 1 + Phase 2 → `npm test` green with the model, schema and helpers
2. Phase 3 (US1) → admin can author and publish; every admin route 401-tested
3. Phase 4 (US2) → admin can find and delete
4. Phase 5 (US3) → visitors read; the spec's E2E journey (T054) passes
5. **STOP and VALIDATE** with quickstart §4 steps 1–3, 7 — demo-able

### Incremental Delivery

- + US4 images → real covers on cards
- + US5 Urdu → school can publish in Urdu
- + US7 categories → parity with the reference's labels and category pages
- + US6 sharing → rich previews
- Polish → docs, full gate, screenshot sign-off

### Notes

- `[P]` tasks touch different files and have no dependency on an incomplete task
- Commit after each task or logical group; never mark a story checkpoint done with a failing spec
- No new tokens may be guessed: T043 must land before any T046–T051 styling is finalised
- Nothing from 002's `design-system` demo page is removed in this feature
