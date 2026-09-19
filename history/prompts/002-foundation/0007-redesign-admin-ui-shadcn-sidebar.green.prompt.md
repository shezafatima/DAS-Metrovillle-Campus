---
id: 0007
title: Redesign admin UI shadcn sidebar
stage: green
date: 2026-09-19
surface: agent
model: claude-sonnet-5
feature: 002-foundation
branch: 002-foundation
user: shezafatima
command: general
labels: ["green","foundation","admin-ui","sidebar","design-system","bugfix"]
links:
  spec: specs/002-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - src/lib/env.ts, src/lib/env.test.ts (empty-string MONGODB_DB_NAME fix)
 - src/lib/auth.ts (lazy getAuth() singleton, replacing top-level await)
 - src/lib/dal.ts, src/app/admin/login/actions.ts, src/app/admin/(dashboard)/actions.ts, src/app/api/auth/[...all]/route.ts (getAuth() call-site updates)
 - src/app/admin/login/actions.test.ts, src/app/api/admin/session/route.test.ts, src/lib/login-lockout.test.ts, scripts/seed-admin.test.ts (test updates for getAuth())
 - scripts/seed-admin.ts (SEED_ADMIN_SKIP_DOTENV, getAuth())
 - src/lib/db.ts, e2e/global-setup.ts (serverSelectionTimeoutMS 5000->15000)
 - src/app/globals.css (.admin-theme scoped navy/yellow theme, new spacing tokens)
 - research/design-tokens.md (admin theme tokens recorded before use)
 - src/components/ui/{sidebar,badge,card,dialog,alert-dialog,form,input,separator,skeleton,table,toaster}.tsx (new)
 - src/components/admin/{app-sidebar,app-sidebar.test,stat-card}.tsx (new)
 - src/components/admin/{admin-shell,admin-top-bar,admin-placeholder}.tsx (rewired)
 - src/components/admin/{admin-sidebar,admin-sidebar.test,admin-mobile-nav}.tsx (deleted, superseded)
 - src/app/admin/(dashboard)/layout.tsx (cookie-read sidebar state), page.tsx (Overview stat cards)
 - src/app/admin/(dashboard)/design-system/{page,design-system-demo}.tsx (new, temporary demo)
 - vitest.setup.ts (matchMedia polyfill)
tests:
 - Vitest 82 passed, 29 skipped (DB-gated), 0 failed
 - Full-project ESLint 0 errors/warnings in scope (8 pre-existing, unrelated warnings unchanged)
 - tsc --noEmit clean
 - Manual: user confirmed real end-to-end login against their own MongoDB Atlas cluster (seed-admin, /admin login, dashboard) before the redesign request
---

## Prompt

User: "i wanna test it" -> walked through manual end-to-end testing
against a real MongoDB Atlas database (connection/DNS troubleshooting,
one real security incident with leaked-looking credentials in
.env.example, three real bugs found and fixed), then:

"Redesign the admin UI. Functionality, routes and auth stay exactly
as they are; this is visual and structural only.

Layout:
- Sidebar with the school logo at the top (public/images/logo.svg),
  collapsible to an icon-only rail and expandable again. Remember
  the open/closed choice between visits.
- Each nav item has an icon (lucide-react): Overview, News,
  Messages, Signups, Settings. Icons stay visible when collapsed.
- Top bar keeps the admin email and logout, and shows the current
  page title.
- Use the shadcn/ui sidebar component rather than a custom one.

Theme:
- Brand navy and yellow from research/design-tokens.md, applied as
  shadcn theme colors. Poppins everywhere, same weights as the
  public site.
- Navy for primary actions, headers and text; yellow only as an
  accent (active nav item, highlights, small badges). Never yellow
  text on white or white text on yellow — it fails contrast.

Overview page: [stat cards, News/Messages/Signups, TODO for real
data]. Shared patterns [...build one real example of each on a
temporary demo page]: data table, form layout, buttons, badges,
modal, confirmation dialog, success/error toast, page header. Works
at 375/768/1024/1440px; sidebar becomes a drawer on mobile. Don't
change auth logic, routes or existing tests."

## Response snapshot

**Manual testing phase** (before the redesign ask) surfaced and fixed
three real bugs, all committed separately (785d3bc): (1) `.env.local`'s
present-but-empty `MONGODB_DB_NAME=` failed Zod's `.min(1)` instead of
defaulting, and `connectDb()` swallowed the real error into the generic
"Could not connect" message — fixed with an explicit empty-string
fallback + regression tests; (2) `src/lib/auth.ts`'s top-level
`await connectDb()` broke under `tsx`'s CJS transform when
`scripts/seed-admin.ts` dynamically imported it — replaced with a lazy
`getAuth()` singleton, updating 9 call sites; (3) `execFileSync("npx",
...)` needs `shell: true` on Windows. Also diagnosed a DNS-SRV lookup
failure (Node's resolver blocked by a local firewall/security tool
while the OS resolver worked) via `nslookup -type=SRV/TXT`, and built a
standard (non-SRV) connection string from the results to work around
it. Found and flagged (not fixed silently) a security incident: what
looked like real Atlas credentials appeared in the committed-clean
`.env.example` outside my own edits; verified git history stayed clean
and removed the polluted content.

**Redesign** (committed separately, e3a135c): confirmed Base UI
(`@base-ui/react`, already installed — `components.json`'s
`"base-nova"` style is its shadcn registry flavor, not Radix) has every
primitive needed (`drawer`, `tooltip`, `dialog`, `alert-dialog`,
`toast`, `separator`, `field`, `form`) so the full shadcn component set
could be hand-built with zero new dependencies. Built
`src/components/ui/sidebar.tsx` matching shadcn's public API
(SidebarProvider/Sidebar/SidebarTrigger/SidebarMenuButton/...) wired to
Base UI's Drawer (mobile) and Tooltip (collapsed-rail labels), with
cookie-based persistence read server-side by the dashboard layout.
Scoped a navy/yellow `.admin-theme` into `globals.css` — yellow
deliberately wired only into `--sidebar-accent` (active nav item) and
a new `Badge` "highlight" variant, never the general `--accent` hover
slot, always navy-on-yellow per the brief's contrast rule. Rebuilt
`AppSidebar`/`AdminTopBar`/`AdminShell`, retired the now-superseded
`admin-sidebar.tsx`/`admin-mobile-nav.tsx` (confirmed nothing else
imported them first), added an Overview page with 3 stat cards (hard
0s + TODO, per brief), and a temporary `/admin/design-system` page
(unlinked from the nav) demonstrating a sortable/loading/empty data
table, a native-HTML5-validated form, buttons, badges, a modal, a
confirmation dialog, and toasts.

Caught and fixed two real issues via lint/type-check (couldn't verify
visually — no network access to the user's dev server from this
session): a component defined inside another component's render body
(`react-hooks/static-components` — would reset state every render);
and that the existing (untouched) `e2e/admin-layout.spec.ts` requires
`role="navigation" aria-label="Admin"` and a trigger button literally
named "Open menu" on mobile — my first pass didn't have either, so I
rendered the sidebar as a real `<nav>` (desktop) / `Drawer.Popup
render={<nav .../>}` (mobile) and made the trigger's accessible name
context-sensitive (`isMobile ? "Open menu" : "Toggle sidebar"`)
specifically to keep that test file passing unmodified.

## Outcome

- ✅ Impact: Three real bugs fixed in code the user could actually run
  against a live database (something no amount of code review in the
  DB-less implementation sandbox would have caught); admin UI
  redesigned per a detailed brief with zero new dependencies and, by
  every automated check available, zero regression to auth/routes.
- 🧪 Tests: 82 Vitest passed / 29 skipped / 0 failed; full lint clean
  in scope; tsc clean. Visual/responsive verification (375–1440px,
  drawer behavior, actual rendered colors) could not be done by me —
  no network access to the user's dev server from this session — and
  is the next step for the user to confirm.
- 📁 Files: ~40 files across two commits (785d3bc bug fixes,
  e3a135c redesign).
- 🔁 Next prompts: user visually verifies the redesign in their
  browser at 375/768/1024/1440px; then the existing Playwright
  `admin-layout.spec.ts`/`admin-login-logout.spec.ts` etc. should be
  re-run against the real database to confirm the aria-label/nav-role
  reasoning above actually holds at runtime (only reasoned through
  code + Base UI type definitions, not executed).
- 🧠 Reflection: Every bug found this session came from actually
  running the code against a real database and a real Windows
  terminal — none were visible from static analysis alone. The
  security incident (credentials appearing in a committed-clean file
  outside my own edits) was the highest-stakes moment: flagging it
  and refusing to use or perpetuate the value, rather than quietly
  working around it, was the right call regardless of provenance.

## Evaluation notes (flywheel)

- Failure modes observed: a full `npx vitest run` appeared to hang
  once (multiple minutes, zero output) — turned out to be resource
  contention from leftover background-task node processes, not a real
  bug; confirmed by killing stray processes and re-running clean in
  ~14s. Lesson: check `tasklist`/kill zombies before concluding a test
  run is genuinely stuck.
- Graders run and results (PASS/FAIL): tsc — PASS; eslint (full
  project) — PASS (0 new errors/warnings); Vitest — PASS (82/82
  runnable, 0 regressions vs. pre-redesign baseline)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): once the user confirms the
  redesign visually, run the full Playwright suite (both projects)
  against the real database to close the gap between "reasoned
  correct" and "verified correct" for the aria-label/nav-role fixes.
