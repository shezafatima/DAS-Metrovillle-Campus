# Architecture Guide — Dar-e-Arqam Metroville Campus Website

## Stack versions
- Next.js 16.3.x (App Router), React 19, TypeScript strict.
- Tailwind CSS v4; tokens in @theme in src/app/globals.css.
- Animation: `motion` package, imported from "motion/react".
  Never install `framer-motion`.
- Fonts self-hosted via next/font.
- Auth: better-auth (Mongo adapter). Data: mongoose.
- Hosting: TODO — revisit advanced.ipAddress.ipAddressHeaders in
  src/lib/auth.ts once chosen; it currently trusts x-forwarded-for /
  x-real-ip, which is only correct behind a proxy that sets them.
- Exact versions are locked in package.json.

## Folder layout
- src/app/(public)/   public routes; layout renders PublicShell
  (header/footer). Kept separate from the root layout so the admin
  area doesn't inherit public chrome (specs/002-foundation/research.md
  §3).
- src/app/admin/      admin routes. admin/layout.tsx sets noindex
  metadata only; admin/login/ is bare; admin/(dashboard)/ renders the
  real AdminShell (sidebar + top bar) via requireAdminSession().
- src/app/api/auth/[...all]/route.ts   toNextJsHandler(auth)
- src/app/api/admin/*/route.ts        each calls
  requireAdminSession({ mode: "api" }) itself — never trust proxy.ts
  or a parent layout as the guard (Constitution III).
- src/app/api/health/route.ts         DB reachability only, no detail
- src/proxy.ts        optimistic, cookie-presence-only redirect for
  /admin/:path* (see "Database and auth" below); also forwards the
  request path as the x-pathname header so a page-level redirect (a
  stale cookie that passes this check but fails real session
  verification) can still return the admin to where they started.
- src/instrumentation.ts   register() calls getEnv() so the app fails
  at startup naming any missing required env var, before serving any
  request.
- src/components/     one component per visual section
- src/components/admin/   admin-only components (AdminShell,
  AdminSidebar, AdminTopBar, AdminMobileNav, AdminPlaceholder,
  LoginForm)
- src/components/admin/news/   news editor UI (NewsEditor,
  RichTextEditor, CoverImageField, NewsTable, NewsTableFilters,
  NewsPagination, DeletePostDialog, useUnsavedChanges) — 003 news
- src/components/news/   public news UI (NewsBanner, NewsGrid,
  NewsCard, NewsPagination, NewsEmptyState, CategoryFilter, CoverImage,
  PostBody) — 003 news
- src/components/careers/   public application form (CareersForm,
  CareersIntro) — 012 careers; the page is /careers, linked from the top
  bar, the footer and the home Join Now section (not the main menu)
- src/components/admin/careers/   admin Applications UI (ApplicationsTable,
  delete dialog, CV download link, "opened" marker) — 012 careers
- src/components/admin/admin-pagination.tsx   shared admin-list
  pagination (lifted out of news/news-pagination.tsx, which is now a
  thin wrapper over it — 004 signup, sp.analyze finding D1)
- src/components/admin/gallery/   admin gallery albums UI (AlbumList,
  AlbumPanel, AlbumPhotos, AlbumUploader, useReorder) — 007 gallery albums
- src/components/home/   home page sections (006): one component per
  reference section, the shared scroll-snap Carousel, HeroSlider,
  StatCounter, YouTubeEmbed facade, SectionBoundary
- src/content/home.ts   typed static home sections (shape of a future
  database row, feature 014)
- src/components/gallery/   public gallery UI (GallerySection `#photo-gallery`,
  AlbumCard, AlbumPhotoGrid, PhotoViewer, GalleryImage) — 007
- src/lib/gallery/   007 gallery domain: types, schema (shared client +
  server), rules (pure caps/cover/retention), store (the ONLY writer of the
  gallery document), migrate (005 flat → albums), mutations, admin, public
- src/content/<page>.ts   static page copy (typed)
- src/models/         Mongoose models. Better Auth owns user/session/
  account/verification/rateLimit directly — no Mongoose model is
  defined for those. throttle.ts, news-post.ts (003 news, collection
  `news`), career-application.ts and career-application-lock.ts (012
  careers, collections `careerApplications` and `careerApplicationLocks`)
  are app-owned (see below).
- src/lib/db.ts       cached Mongoose connection (connectDb, getMongoClient)
- src/lib/auth.ts     Better Auth instance
- src/lib/dal.ts      getAdminSession() / requireAdminSession() — the
  one place that decides whether a request is an authenticated admin
- src/lib/env.ts      Zod-validated process.env (envSchema, seedEnvSchema)
- src/lib/rate-limit.ts   shared fixed-window throttle over the
  `throttle` collection — backs both the login lockout and
  src/lib/public-form.ts's per-form rate limit
- src/lib/login-lockout.ts   Better Auth hooks.before/after implementing
  the dual-key (per-IP + per-account) login lockout
- src/lib/soft-delete.ts   Mongoose plugin: deletedAt filtering,
  softDeleteById/restoreById, opt out via .setOptions({withDeleted:true})
- src/lib/honeypot.ts, src/lib/public-form.ts   spam-trap field +
  rate-limit wrapper for public POST routes
- src/lib/validation/ Zod schemas (shared client + server)
- src/lib/news/       003 news domain logic: categories.ts (fixed
  list), slug.ts, sanitize.ts (server-side HTML allowlist — the
  authoritative control, not the editor's own extension allowlist),
  excerpt.ts, dates.ts (publish-date/PKT-visibility helpers),
  cloudinary-loader.ts (next/image loader), mutations.ts
  (create/update/publish/unpublish/delete — the one place that
  validates, sanitises, generates slugs and calls Cloudinary
  verification), admin-queries.ts, public-queries.ts (the single
  visibility predicate every public read goes through), route-errors.ts
- src/lib/cloudinary.ts   configured Cloudinary SDK: signNewsCoverUpload()
  (signed direct browser upload), verifyNewsCover() (server-side
  confirmation of an uploaded cover's size/format/folder)
- src/lib/admin-list.ts   shared admin-list building blocks (Paged<T>,
  escapeRegExp, ADMIN_PAGE_SIZE) — moved out of news/admin-queries.ts
  so the other admin lists (messages, applications) import these instead
  of the news module or a duplicate copy
- src/lib/careers/   012 careers domain logic: rules.ts (the 30-day
  reapply window, `CAREERS_REAPPLY_WINDOW_DAYS`, the only place the
  number lives; calendar days in Asia/Karachi), identity-lock.ts
  (per-identity locks, ADR-0008), mutations.ts (createCareerApplication:
  locks, window check, insert-first pending record, store put, confirm;
  deleteCareerApplication: soft delete then file removal),
  cv-limits.ts (4 MiB and the real-content PDF check),
  read-capped-body.ts, admin-queries.ts, csv.ts, cv-download.ts,
  retention.ts (the sweep) and route-errors.ts
- src/lib/documents/   the private document store behind a
  `DocumentStore` interface (put/get/delete/exists), the only module that
  touches documents: `vercel-blob.ts` (private Vercel Blob store, ADR-0004
  and ADR-0007), `local.ts` (a folder for development and E2E; refused
  when NODE_ENV is production) and `store.ts` (driver choice by
  DOCUMENT_STORE_DRIVER). Nothing else imports `@vercel/blob`; Cloudinary
  and src/lib/uploads/ are never used for documents. Keys are
  `cv/<256 random bits>.pdf`, never derived from the applicant.
- src/lib/phone.ts, src/lib/admin-datetime.ts, src/lib/route-errors.ts,
  src/lib/validation/field-errors.ts   shared helpers lifted out of
  modules once contact messages (008) needed them too
  (Pakistani-mobile normalise/format/search-digits; PKT instant
  formatting; the common route-error envelope + payloadTooLargeResponse;
  fieldErrors()/collapseSpaces())
- src/components/admin/admin-list-filters.tsx,
  src/components/admin/admin-delete-dialog.tsx   generic admin-list
  search+filter and confirm-delete dialog, lifted out of the
  versions once messages (008) needed the same UI; the 012 applications
  list uses them too
- src/lib/messages/   008 contact-messages domain logic: statuses.ts
  (fixed New/Read/Responded list), preview.ts (toPreview — code-point-
  safe one-line truncation), inbox-href.ts (whitelist rebuild of the
  detail page's back link), mutations.ts (createMessage — append-only,
  never upsert; markMessageRead/setMessageStatus/deleteMessage),
  admin-queries.ts (listMessages/getMessage/countMessages/
  countNewMessages)
- src/lib/contact-details.ts   getContactDetails() (reads the Settings
  `contact` group since 005; same shape as before) +
  mapEmbedSrc() (keyless Google Maps embed URL, derived not stored)
- src/lib/settings/   005 settings domain logic: types.ts (the field-
  definition format), groups/{contact,hero,stats,video,gallery}.ts (one
  definition per group), registry.ts (GROUPS, the only way a group key is
  resolved), schema.ts (schemaFor/parseGroup — one Zod schema per group,
  shared by the browser form and the Server Action), defaults.ts (starting
  values; contact defaults are imported from contactInfo), items.ts (live
  items, reorder, soft-delete reconciliation), youtube.ts, mutations.ts
  (saveGroup — validate, reconcile, verify new images, version
  compare-and-set), admin.ts (getAdminSettings), public.ts
  (getPublicSettings — cached, never throws), form-state.ts
- src/models/settings.ts   collection `settings`, one document per group
- src/lib/uploads/   image-limits.ts (JPG/PNG/WebP, 5 MB, real leading
  bytes) and direct-upload.ts (signed browser→Cloudinary upload), lifted
  out of the news CoverImageField so news and Settings share them
- src/components/admin/settings/   the one generated group form
  (SettingsGroupForm, FieldControl), ListEditor + SlidePanel (right-hand
  Sheet), ImageField, GalleryUploader, SettingsNav — 005 settings.
  AdminConfirmDeleteDialog (admin-delete-dialog.tsx) is the confirm step
  on its own; AdminDeleteDialog is built on it
- src/components/contact/   public Contact page UI (ContactBanner,
  ContactDetails/ContactDetailColumn, ContactMap/LazyMapFrame,
  ContactFormSection/ContactForm, WriteUsLink) — 008 contact-messages
- src/components/admin/messages/   admin inbox/detail UI (MessagesTable,
  MessageDetail, MessageStatusControl, MarkReadOnOpen,
  DeleteMessageDialog) — 008 contact-messages
- src/components/site-shell/page-banner.tsx   shared page-title banner
  (title + breadcrumb + optional background image), lifted out of
  news/news-banner.tsx once the Contact page's extracted banner values
  turned out identical aside from an added background image; NewsBanner
  is now a thin wrapper over this
- src/test/db.ts      describeWithDb() — Vitest DB-suite helper that
  skips with a notice when MONGODB_URI is unset
- src/test/admin-session.ts   seedTestAdmin()/getTestSessionCookie() —
  shared by every DB-backed admin route test that needs a real session
- scripts/seed-admin.ts
- scripts/sweep-careers.ts (retention sweep, `npm run sweep:careers`),
  scripts/retire-signups.ts (one-time, `npm run retire:signups -- --confirm`),
  scripts/check-release-content.ts (the `prebuild` release gate)
- public/images, public/icons   static assets, kebab-case names
- research/design-tokens.md, research/tokens/*.json,
  research/tokens/news-cards-*.json (003 news), research/tokens/
  signup-*.json (004 signup — signup band, extracted by
  research/extract-signup-tokens.ts)
- screenshots/        reference captures, named <page>-<viewport>.png

## API namespaces
- /api/auth/*   Better Auth only. Since 010 its password, session and
  user mutation routes (/change-password, /revoke-other-sessions,
  /revoke-sessions, /revoke-session, /update-user, /change-email,
  /set-password) are closed over HTTP (`disabledPaths`, 404); the
  Account page (/admin/account) reaches change-password and
  revoke-other-sessions through Server Actions via auth.api.*
- /api/admin/*  session required — includes /api/admin/news* (post
  CRUD, publish/unpublish), /api/admin/uploads/sign (Cloudinary
  signature for direct browser upload; the API secret never leaves
  this route), /api/admin/careers/[id] (DELETE, main admin only),
  /api/admin/careers/[id]/cv (GET — the CV as an attachment, checked per
  request), /api/admin/careers/export (filtered CSV) and
  /api/admin/careers/opened (POST — Applications "opened" marker) — 012
  careers;
  /api/admin/messages/[id] (PATCH status, DELETE soft delete) and
  /api/admin/messages/[id]/read (POST — conditional new→read) — 008
  contact-messages; /api/admin/notifications (GET — combined counts +
  panel items), /api/admin/notifications/read (POST — mark all as
  read) — 009 admin-notifications
- /api/admin/settings/uploads/sign  (005, access `settings`) signs a
  direct Cloudinary upload into settings/hero or settings/gallery. Saving a
  settings group is a Server Action (`saveSettingsGroup`), not a route.
- /api/public/* no auth — includes /api/public/careers (012; multipart
  with one PDF: body-size guard → capped read → honeypot → 5-per-10-minute
  submission limit → 10-per-24-hour upload limit → validation incl. the
  PDF's real content → save; identical `{ ok: true }` for a stored
  application and a honeypot drop; 409 with `reapplyFrom` inside the
  30-day window) and /api/public/messages (008 contact-messages; 64 KiB
  size guard → honeypot → its own `"contact"` rate-limit budget →
  validate → append-only insert; every valid submission creates a new
  `messages` document, and the honeypot response is identical)

## Database and auth
- One cached Mongoose connection, reused across requests (src/lib/db.ts).
- Better Auth uses mongodbAdapter with mongoose.connection.db +
  mongoose.connection.getClient() (src/lib/auth.ts). Never open a
  second connection or install a different `mongodb` driver version
  than Mongoose uses — `npm ls mongodb` must show one deduped version.
- Better Auth owns the collections user, session, account,
  verification, rateLimit. App code never defines models for or writes
  to them; the seed script is the one exception, and it goes through
  Better Auth's own `auth.$context.internalAdapter`, never a raw
  collection write.
- emailAndPassword.enabled = true, disableSignUp = true,
  minPasswordLength = 12. disableSignUp blocks both the HTTP route and
  the server-side auth.api.signUpEmail call — there is no code path
  that creates a second admin.
- session.expiresIn = 7 days, updateAge = 1 day (rolling idle expiry).
- The admin is created/reset by `npm run seed:admin` [-- --reset] from
  env vars (ADMIN_EMAIL, ADMIN_PASSWORD); it is never exposed as a
  route. A unique index on user.email (created by the script) makes
  "exactly one admin" hold under concurrent runs.
- Every admin page, /api/admin/* route and Server Action checks access
  itself through the one DAL check in src/lib/dal.ts (011: pages call
  requireAdminPage(access), routes and actions call
  requireAdminAccess(access)) — never relies on src/proxy.ts or a parent
  layout as the sole guard (Constitution III). proxy.ts only does an
  optimistic, cookie-presence redirect for unauthenticated page
  requests; it never touches the database. See "Roles and permissions
  (011)" below.
- Login lockout (src/lib/login-lockout.ts) is implemented as Better
  Auth hooks.before/after on /sign-in/email, not just in the login
  Server Action — hooks run for both auth.api.signInEmail() calls and
  the mounted /api/auth/sign-in/email HTTP route, so the lockout can't
  be bypassed by calling the API directly. Thresholds: 5 failures per
  source IP / 15 min, 20 failures per account / 15 min, either
  triggers a 15-minute block, persisted in the app-owned `throttle`
  collection (survives restarts).
- Better Auth's own built-in rate limiting is defence-in-depth only
  (a per-IP request counter, not a failure counter) and is disabled
  outside production so it doesn't interfere with parallel test runs;
  it is not the mechanism that implements the lockout above.

## Roles and permissions (011)
- Two roles: main_admin and content_manager. Role, grants and account
  state are Better Auth user.additionalFields (input: false, so no
  Better Auth endpoint accepts them): role, permissions (string[]),
  disabledAt, deletedAt, lastLoginAt. Defaults are the least privilege (content_manager, no
  grants). They change only through src/lib/users/mutations.ts.
- Permission keys live in one registry, src/lib/permissions.ts:
  news, messages, careers, settings, pages. Registrations and users are
  main-admin only and are not keys. A new section = one new key.
  Applications (012) are governed by `careers`; the old Signups (004) is retired.
- One access check. getAdminSession() returns role, permissions and
  mustChangePassword, and returns null for a disabled or deleted account.
  The pure decideAccess(session, access) decides; access is a key,
  "main_admin", or "any". requireAdminPage redirects (login,
  /admin/set-password, /admin?denied=1); requireAdminAccess returns
  401/403 for routes and actions. The old requireAdminSession is gone.
  src/test/access-inventory.test.ts fails if an admin page, route or
  action is missing from the access matrix or checks the wrong access.
- Forbidden requests get 403 { error: "forbidden" } (or
  "password_change_required"), never data; no session stays 401. The
  sidebar, overview cards and notification bell are filtered by
  canAccess — presentation only.
- session.cookieCache MUST stay off: every request reads the user record
  fresh, so a grant change, disable or delete applies on the next
  request in every browser. login-gate.test.ts fails if it is enabled.
- Login gate (src/lib/login-gate.ts, via databaseHooks.session.create.before):
  runs after the password is verified, for every sign-in path. A disabled
  or deleted account gets the same 401 and code as a wrong password.
- Disable, delete and reset end sessions with Better Auth's own
  internalAdapter.deleteUserSessions; the first password set uses
  api.revokeOtherSessions. The Better Auth admin plugin is deliberately
  NOT installed (extra HTTP surface, a second permission model, a login
  error that reveals a ban).
- The main admin controls every password (Constitution III, v2.0.0).
  A password is typed or generated by the admin in the user panel (12 to
  128 characters) and is hashed and returned/logged/recorded nowhere. There
  is no forced first-login change, no temporary state and no expiry. A
  content manager cannot change any password, their own included: the
  Account page shows them a note instead of the form, and the
  changePassword action requires the main_admin role. A main admin changes
  their own on the Account page (current password required).
- At least one active main admin always remains (write, recount, undo if
  none; no transactions assumed). A user can never change their own role
  or grants, or disable/delete themselves.
- The record of changes is the append-only `userChanges` collection
  (src/models/user-change.ts): actor, target, type, details, at. No
  password can be in it. Viewed at /admin/users/activity, newest first.
- Unique index on user.email is created by the seed script AND by
  ensureUserEmailIndex() (src/lib/users/indexes.ts) before any user
  create, so it never depends on the seed having run.
- Deploy step: after deploying 011 run `npm run seed:admin` once. It
  makes the pre-011 account a main admin ("Admin role confirmed"). Until
  then that account is a content manager with no grants (fails safe).
  `--reset` is the lock-out recovery path: it also sets role main_admin
  and clears disabledAt and deletedAt.
- One shared password input (src/components/ui/password-input.tsx, eye
  toggle, hidden by default, hidden again on submit/close) is used for
  every password field in the admin (login, the main admin's Account page,
  the user panel).
- The user panel is a right-hand sheet (src/components/ui/sheet.tsx +
  src/components/admin/users/user-panel.tsx); full width on phones.

## Validation and data rules
- Zod normalizes input: emails lowercased and trimmed; phones stored
  as +923XXXXXXXXX (accept 03XXXXXXXXX and +92 formats).
- Natural-key collections state their write rule in the spec and an ADR
  (Constitution VI v3.0.0): upserts use findOneAndUpdate with upsert: true
  backed by a unique index; per-person limits a unique index can't express
  (e.g. 012's 30-day reapply window) use check-then-insert only under a
  database-unique lock (ADR-0008).
- Soft delete: deletedAt: Date | null, excluded by default through a
  shared Mongoose plugin.
- Public POST routes: per-IP rate limit + hidden honeypot field.
- Responses to upserted public forms are identical for new and
  existing records.

## Design tokens
- Every value from research/design-tokens.md becomes a named custom
  token in @theme with the exact extracted value (no rounding to
  Tailwind's default scale).
- The reference site's breakpoints are defined as custom breakpoints.
- No arbitrary-value classes (e.g. text-[17px]) for anything a token
  covers.

## Components and motion
- Breakpoint-specific structures use explicit variants
  (NavbarDesktop, NavbarMobile) behind one responsive wrapper.
- "use client" only on the smallest interactive piece.
- Motion helpers (useCountUp, HoverCard, etc.) live in
  src/components/motion/; timing matches the reference.
- All animation respects prefers-reduced-motion.
- Cross-page anchor IDs are defined in the owning spec and never
  renamed without updating links.

## Media and content
- Admin uploads go to Cloudinary; only URLs are stored.
- Copy not yet supplied by the client uses marked placeholders in
  src/content/. Current placeholders include `photoGalleryBanner`
  (src/content/gallery.ts, 007): null until the client supplies the
  reference's camera banner photograph for the album pages.
- Shell/site text of unknown language uses dir="auto" and an Urdu
  fallback font. News content (003) is the one exception: each post
  carries an explicit `language: "en" | "ur"` field the admin sets
  (spec clarification, FR-028/FR-029), and that field — not
  auto-detection — drives `dir` and the Urdu font everywhere the post
  is shown (title, editor, admin table, public card, detail page).

## News (003) rendering notes
- Public news pages (`/news`, `/news/<category>`, `/news/<slug>`) are
  `export const dynamic = "force-dynamic"` — no ISR/revalidate. A
  cached page would let an unpublished/deleted post linger past its
  removal, which the spec requires to be immediate (research.md §6).
- Every public read (list, category list, detail, metadata) goes
  through the single visibility predicate in
  `src/lib/news/public-queries.ts` — status published, publishDate ≤
  today in Asia/Karachi, not soft-deleted. There is no other public
  query path; this is what makes "drafts and deleted posts are never
  returned publicly" a property of the code, not a per-page discipline.
- Cover images: signed direct browser→Cloudinary upload
  (`/api/admin/uploads/sign` mints the signature; the API secret never
  leaves that route); the server independently verifies size/format/
  folder via the Cloudinary API on save (`verifyNewsCover`,
  `src/lib/cloudinary.ts`) before accepting a changed `coverImage`.

## Career applications (012) data rules
- Collection `careerApplications` (soft-delete plugin). Email and phone
  are NOT unique: the same person may apply again after the reapply
  window. Not stored: the uploaded file name, the declared MIME type, the
  visitor's IP. The CV key is random and is never returned to a browser.
- The window (ADR-0008, superseding ADR-0003 and ADR-0006): one application
  per person per 30 calendar days (Asia/Karachi), matched on email OR
  phone. It is enforced in `src/lib/careers/mutations.ts` under
  per-identity locks (`careerApplicationLocks`: hashed `_id`, conditional
  upsert, duplicate-key means held, 30 s lease, sorted acquisition), so ten
  simultaneous submissions produce exactly one record. A refusal is a 409
  with the same body whichever field matched; a held lock is a 503
  `try_again`. A soft-deleted application stops counting at once.
- Write order is insert-first: validate, take the locks, insert the record
  as pending (`cv.storedAt` null), put the file, confirm. A failure
  compensates (hard-deletes the pending record) and answers 503. Admin
  lists, counts, the export and notifications show stored applications only.
- Files live in the private store only; a CV is delivered through
  `/api/admin/careers/[id]/cv` after a session and permission check, as an
  attachment (`nosniff`, CSP sandbox, `private, no-store`), never shown
  inline. Delete is main admin only: soft delete plus file removal; if the
  removal fails the sweep retries it.
- Retention (Constitution V): `CAREERS_RETENTION_MONTHS` (1 to 120, default
  12). `sweepCareerApplications` removes applications past it, live or
  soft-deleted, with their files; retries failed removals; clears pending
  records older than an hour. It runs at most hourly through `after()` on
  a successful submission and on the admin Applications page
  (`maybeSweepCareers`, throttle key `sweep:careers`), and on demand with
  `npm run sweep:careers`.
- Release gate: `scripts/check-release-content.ts` runs as `prebuild`.
  When `VERCEL_ENV=production` it fails the build while the privacy notice
  is still placeholder wording (`careersCopy.privacy.placeholder`, in
  `src/content/careers.ts`) or `CAREERS_RETENTION_MONTHS` is not set
  explicitly. To clear it: put the client-approved notice in, set the flag
  to `false`, and set the variable in the production environment. Other
  environments only print a warning.
- Hosting: Vercel is implied by ADR-0007 (Vercel Blob; its 4.5 MB function
  request limit is why the CV limit is 4 MiB). Local and E2E runs use the
  `local` driver (`DOCUMENT_STORE_DRIVER`, default outside production).
- The 004 signup is retired (collection dropped by
  `npm run retire:signups -- --confirm` after a backup; code removed).

## Contact messages (008) data rules
- Append-only, the opposite of the retired signup's rule: `messages` has no unique
  index and the write path (`src/lib/messages/mutations.ts`) never
  upserts, looks up by email, or passes `withDeleted` — every valid
  submission is `Message.create(...)`, a brand-new document, even from
  an email that already has other messages (see
  `history/adr/0001-signup-upsert-and-restore.md` "Boundary" for why
  this does **not** follow signup's pattern).
- "Opened" is a conditional client-driven transition, not a page-render
  side effect: the detail page always renders `<MarkReadOnOpen>`
  unconditionally (never gated on the current status), which fires a
  `POST …/[id]/read` once per mount only if the status *at mount* was
  `new`. On success it calls `router.refresh()`, which re-renders the
  Server Component tree — updating the status shown, the sidebar badge
  and the overview card — without a full page reload. Never mark a
  message read inside the page's own server render (a GET must have no
  side effects).
- Every other mutation (status PATCH, delete) follows the same
  toast-then-`router.refresh()` pattern, so the sidebar badge and
  overview card are never more than one refresh stale.

## Admin notifications (009) data rules
- One new collection, `adminNotificationStates` — one document per
  admin, `_id` = the admin's Better Auth user id (a string, not an
  ObjectId), holding only `careersLastOpenedAt` (012; the old `signupsLastOpenedAt` is
  unset by `npm run retire:signups`). It is never soft-
  deleted, only overwritten (`src/lib/notifications/state.ts`). Messages
  need no equivalent state: 008's `status` field already is their "new"
  state.
- Lazy creation defaults to **now**, never the epoch: the first time
  `getCareersLastOpenedAt(adminId)` runs for a given admin, it atomically
  upserts (`findOneAndUpdate` with `$setOnInsert`, never find-then-create
  — avoids a duplicate-key race between two tabs' first poll) a document
  stamped with the current moment. Pre-existing applications therefore never
  flood in as "new" the day this feature ships — see
  `history/adr/0002-admin-notifications-live-state-and-shared-popover.md`.
- "New" is computed, never stored, for both kinds: a message is new
  when `status === "new"` (reuses 008 unchanged); an application is new
  when it is stored and `createdAt > careersLastOpenedAt` (a refused repeat
  is never stored, so it never counts)
  (`src/lib/notifications/queries.ts`).
- Client-side live state is one shared React Context
  (`NotificationsProvider`), not props threaded separately per
  consumer — the bell, both sidebar badges and the page-title prefix
  all read it, so they cannot disagree. It polls `GET
  /api/admin/notifications` on a ~60s timer (paused while
  `document.visibilityState === "hidden"`, with an immediate refresh on
  becoming visible again) and exposes `refreshNow()` for mutation sites
  to call directly after their own request succeeds — this is the
  reference pattern for the next feature that needs a live admin
  indicator; reuse the Provider shape rather than inventing another.
  This is a pattern precedent, not a dependency: no data-fetching
  library was added (Constitution II) — plain `fetch` +
  `document.visibilityState`.
- The Overview's "new" highlights are computed server-side, at render
  time, from the same query functions the sidebar's initial SSR seed
  uses — not read from the client Provider. They agree with the sidebar
  because both hit the same database state in the same request, not
  because they are kept live in sync afterward; Out of Scope rules out
  server-pushed live updates for that page.
- `src/components/ui/popover.tsx` is the first Popover primitive in the
  design system (wraps `@base-ui/react/popover`, the same pattern
  `dialog.tsx` uses for `@base-ui/react/dialog`) — reuse it for the next
  dropdown-style UI rather than adding a second implementation.

## Settings (005) data rules
- One document per group in `settings`, `_id` = the group key. That makes
  "one record per group" a database guarantee. A group with no document has
  never been saved and reads as its definition defaults (version 0); nothing
  is seeded and no migration is needed when a field is added.
- Each group is a typed field definition. The admin form, the client and
  server validation and the defaults are all derived from it
  (src/lib/settings/); adding a field means editing that one definition.
- A save (`saveSettingsGroup`) stores the whole group or nothing: validate
  with the group schema, reconcile list items, re-verify any image new since
  the stored version (Cloudinary size/format/folder), then one atomic write
  guarded by the version the form was loaded with (insert at version 0,
  `findOneAndUpdate({_id, version})` otherwise). A stale version is a
  conflict and stores nothing; no transactions are assumed.
- List items (hero slides) carry a UUID `id` and `deletedAt`
  inside the group document. The editor sends live items only; absent ones
  are marked deleted, deleted items are kept (soft delete, developer
  restore) and cannot be brought back by a save.
- "At least one visible slide" is a rule in the hero definition, enforced on
  the server for every save, not only in the UI.
- Public reads go through `getPublicSettings(group)`: `unstable_cache`
  (60 s, tags `settings` and `settings:<group>`) around a read that throws on
  failure (so a failure is never cached), called with a 3 s timeout and a
  catch outside the cache; on failure it returns the last value read in the
  process, else the definition defaults, and logs `settings_read_failed`.
  It returns only what the site shows (no deleted items, hidden slides,
  version or author). A save calls `revalidateTag(tag, { expire: 0 })` for
  both tags and `revalidatePath("/", "layout")`; `(public)/layout.tsx` has
  `revalidate = 60`. `cacheComponents` is deliberately off (it would change
  every page's rendering model); `unstable_cache` is the previous caching
  model and is isolated in public.ts.
- The top bar and footer social icons and the Contact page read the contact
  group through `getContactDetails()`; PublicShell reads it once. Contact
  defaults are imported from `contactInfo` (src/content/site-shell.ts), so a
  never-saved group looks exactly like the site did before 005.
  SocialLinks renders in a fixed order (Facebook, YouTube, Instagram, TikTok).
- Settings images are public media in Cloudinary folders settings/hero and
  settings/gallery, uploaded straight from the browser with a signature from
  `/api/admin/settings/uploads/sign`. The bundled placeholder slide images
  (public/images/hero/) are the only images allowed without a publicId.
- `NEXT_DIST_DIR` (optional) moves the Next build folder, so a second `next
  dev` (the Playwright one on the test database) can run beside a developer's
  own dev server.

## Gallery albums (007) data rules
- The gallery left the Settings group engine: `GROUP_KEYS` is contact, hero,
  stats, video. It is ONE document, `settings/_id: "gallery"`, with
  `data = { schema: 2, albums[], retired[] }`; albums embed their photos.
  Caps: 6 live albums, 8 live photos per album.
- src/lib/gallery/store.ts is the only writer. Every write reads the
  document, applies a pure rule (src/lib/gallery/rules.ts) that checks the
  cap against the live counts, and writes with a compare-and-set on
  `version`; a lost race re-reads and re-applies (up to 10 attempts), so the
  caps hold under simultaneous requests with no transactions. Album detail
  edits (title, description, date) instead carry the album's own `rev` and
  are refused when stale. See [ADR-0005](../history/adr/0005-gallery-albums-single-document-cas.md):
  this design is valid only while the 6/8 caps keep the record small; raising
  them means revisiting the ADR first.
- Album and photo actions save immediately (nine Server Actions in
  admin/(dashboard)/settings/gallery/actions.ts, permission `settings`).
  Uploads go straight to Cloudinary (folder settings/gallery); one
  `addGalleryPhotos` call per selection verifies each image, keeps the ones
  that fit and deletes every refused or rejected asset.
- Deletes are soft (`deletedAt`); at most 50 deleted albums and 200 deleted
  photos are kept, the oldest are then removed with their images.
- Public: `/resources` (minimal until 016) shows `#photo-gallery`, hidden when
  no album has photos; `/resources/gallery/<12-char id>` is an album page
  (404 when unknown, deleted or empty); `/resources/gallery` and the old
  `/resources/photo-gallery` redirect to `/resources#photo-gallery`. Feature
  016 adds `#downloads` and `#our-books` around the gallery section.
  `getPublicGallery()` mirrors `getPublicSettings`: 60 s cache (tags
  `settings`, `settings:gallery`), 3 s timeout, last-good fallback, never
  throws.
- **Release step**: run `npm run migrate:gallery` once after deploying 007.
  It moves the 005 flat gallery into "Gallery", "Gallery 2" … (8 each, at
  most 6 albums) and prints how many photos were not migrated: photos past
  the 48th are discarded and their images deleted (owner's decision, 007
  FR-023). Images already soft-deleted in 005 stay deleted, kept in
  `retired`. The same migration also runs lazily on the first gallery read
  (checked once per server process), so a forgotten run loses nothing, but
  only the command prints the report.
- Test-only: `E2E_FRESH_READS=1` (src/lib/e2e-fresh-reads.ts; set by playwright.config.ts,
  ignored in production) makes the public gallery skip its cache and its
  once-per-process migration flag, because the gallery specs seed the
  database directly.

## Home page (006)
- `/` renders the reference's sections in order: hero, Find Us Nearby,
  quick-access cards, Inspiration + Why Choose, Latest News, Books, Salient
  features, Progress dashboard, icon quick-links, careers CTA (`#signup`),
  partners. Static sections come from src/content/home.ts; design values
  from research/design-tokens.md "Home sections (006)".
- Data: Settings hero/video/stats; Latest News from
  `getLatestPosts()` (src/lib/news/latest.ts: the News visibility filter,
  `unstable_cache` 60 s tagged `news`, 3 s timeout, never throws). Every
  admin news write calls `revalidateNewsCaches()`.
- Each data section is wrapped in SectionBoundary, so one failing read never
  takes the page down. Carousels share components/home/carousel.tsx
  (scroll-snap, arrows only when overflowing, autoplay paused on hover/focus,
  none for reduced motion). No carousel or video library.
- Books carousel: fixed heading/line and 10 fixed covers listed in
  src/content/home.ts, files in public/images/home/books/book-01.jpg …
  book-10.jpg (added by hand; not admin-managed). Missing files are skipped;
  none present hides the section.
- The 004 signup form is no longer placed on `/`: the careers CTA replaces it
  (PRD §5.1) and keeps the `#signup` anchor.

## Testing
- 011: every admin route has the three access cases in
  src/app/api/admin/access-matrix.test.ts (real sessions); every user
  Server Action in its own actions.test.ts; every page in
  e2e/admin-roles-access-matrix.spec.ts.
- Vitest: unit tests and route handler tests (validation failures,
  401 for admin routes). DB-backed suites use describeWithDb()
  (src/test/db.ts), which connects to MONGODB_DB_NAME=dar_e_arqam_test
  and skips with a console notice — not a failure — when MONGODB_URI
  is unset, so `npm test` stays green on a machine with no database
  configured.
- Playwright: one e2e test per user story; visual comparison against
  screenshots/; computed-style checks against research/tokens/*.json.
  e2e/global-setup.ts points the whole run at dar_e_arqam_test, wipes
  it, and seeds the one admin every admin spec logs in as; it degrades
  the same way as describeWithDb (warns and continues) if MONGODB_URI
  is unset or unreachable, so the DB-independent public-site specs
  still run. Admin specs (e2e/admin-*.spec.ts) run in their own
  Playwright project with fullyParallel:false — they share one
  MongoDB `throttle` collection and one seeded admin, so they can't
  safely run concurrently with each other. Public form specs
  (e2e/contact-*.spec.ts and e2e/careers-*.spec.ts) run in a third project,
  `forms`, for the same reason: every Playwright worker shares one source
  IP, and the rate-limit tests deliberately exhaust a budget —
  `chromium`'s testIgnore excludes `admin-*`, the contact specs and
  `careers-*` so a spec never runs twice under two projects.
  `e2e/helpers/careers.ts` seeds and reads `careerApplications` and the
  local document folder (`.data/e2e-documents`) with the same
  seed/clear/withConnection pattern as `e2e/helpers/news.ts`. Careers
  specs: careers-public, careers-protection (forms), admin-careers,
  admin-careers-access (admin), shell-careers-links (chromium).
- The `forms` project also carries the four contact specs
  (`e2e/contact-{public,details,protection,visual}.spec.ts`, 008
  contact-messages) alongside `careers-*`; `chromium`'s testIgnore names
  them explicitly rather than a broader `contact-*` pattern, because the
  pre-existing `e2e/contact-and-social.spec.ts` (001 site-shell) also
  starts with `contact-` and must keep running under `chromium`. Every
  spec that submits through a public form (`/api/public/careers` or
  `/api/public/messages`) sets its own `X-Forwarded-For`
  (`forwardedFor(n)` in `e2e/helpers/messages.ts` and
  `e2e/helpers/careers.ts`) so
  concurrent specs never share a rate-limit budget by accident. This
  `X-Forwarded-For` trust (a pre-existing 002 hosting follow-up — verify
  the real host overwrites the header rather than passing through a
  client-supplied value) applies equally to both forms and is owned by
  002's `extractIp`, not by 008 or 012.