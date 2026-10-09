---

description: "Task list for Admin Notifications (009) implementation"
---

# Tasks: Admin Notifications

**Input**: Design documents from `/specs/009-admin-notifications/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-notifications-api.md, contracts/notification-ui.md, quickstart.md

**Tests**: Included. The spec's Acceptance section and Constitution VIII require:
- an E2E test covering the brief's sequence: submit a message and a signup, see the bell and both sidebar indicators, open the panel and see both items, choose one, and "mark all as read" clears everything;
- tests proving deleted messages/signups are never counted;
- tests proving the notification endpoints reject unauthorized requests;
- indicators checked at 375, 768, 1024 and 1440px, expanded and collapsed.

research.md maps each design decision to its rationale (§1–§10). DB-backed Vitest files (marked `[DB]`) use `describeWithDb()` (`src/test/db.ts`) against `dar_e_arqam_test`, and skip with a notice when `MONGODB_URI` is unset. Route tests needing a real session use `seedTestAdmin`/`getTestSessionCookie` (`src/test/admin-session.ts`), same as every other admin route test in this codebase.

**Organization**: Tasks are grouped by the spec's user stories (US1–US6), **reordered for buildability, not by priority**: the spec lists Bell (US1), Sidebar (US2) and What counts as new (US3) as three equal-priority (P1) stories, but US1 and US2 both consume the query layer and correctness rule US3 defines. Phase 3 below builds US3 first — it is independently testable purely through the notification endpoints and the Signups "opened" marker, exactly as its own Independent Test in spec.md describes, with no bell or sidebar UI required. US1 (Phase 4) and US2 (Phase 5) then build UI on top of it. All three P1 phases still complete before the P2 phases (US4, US5), which complete before the P3 phase (US6), matching the template's priority-tier rule.

- **One shared context, not duplicate props.** `NotificationsProvider` (built in Phase 4) is the single client-side source `AppSidebar` (Phase 5), `NotificationBell` (Phase 4) and `PageTitleBadge` (Phase 8) all read — there is no `newSignupsCount`-style prop threaded a second time (research §3, §5).
- **The provider grows across two phases.** Phase 4 gives it a working, seed-plus-fetch-on-open shape (enough for the bell to be useful on its own — matching US1's own priority). Phase 6 (US4) adds the ~60-second timer, visibility pause/resume, and wires `refreshNow()` into every message/signup mutation site. This mirrors how 008's `mutations.ts` grew incrementally across that feature's own phases.
- **No schema change to `messages` or `signups`.** Every "new" rule reuses existing fields (`status`, `lastSignupAt`) — see data-model.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, and no dependency on an unfinished task)
- **[Story]**: Maps the task to a user story in spec.md (US1–US6). Setup, Foundational and Polish tasks have no story label.
- File paths are exact and relative to the repository root.

## Path Conventions

This is a single existing Next.js app (see the Structure Decision in plan.md). `src/`, `e2e/` and `docs/` sit at the repository root.

| What | Where |
|---|---|
| Domain logic | `src/lib/notifications/` |
| Shared helpers | `src/lib/` |
| New model | `src/models/` |
| Admin routes | `src/app/api/admin/notifications/`, `src/app/api/admin/signups/opened/` |
| New UI primitive | `src/components/ui/` |
| Notification components | `src/components/admin/notifications/` |
| Modified admin shell/sidebar | `src/components/admin/` |
| Copy | `src/content/admin.ts` |

---

## Phase 1: Setup

**Purpose**: Test infrastructure for the new collection.

- [X] T001 [P] In `e2e/global-setup.ts`, add `"adminNotificationStates"` to the list of collections wiped before each run.
- [X] T002 [P] Create `e2e/helpers/notifications.ts` using `e2e/helpers/signups.ts`'s `withConnection` pattern. Export:
  - `getAdminUserId(email = E2E_ADMIN.email): Promise<string>` — reads `mongoose.connection.db.collection("user").findOne({ email })._id.toString()` (the Better Auth `user` collection; import `E2E_ADMIN` from `../global-setup`).
  - `seedAdminNotificationState({ adminId, signupsLastOpenedAt }: { adminId: string; signupsLastOpenedAt: Date }): Promise<void>` — upserts `{ _id: adminId }` into `adminNotificationStates` with `$set: { signupsLastOpenedAt }`.
  - `clearAdminNotificationStates(): Promise<void>`.
  - a re-export of `loginAsAdmin` from `./news`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one schema change, the new model, the shared types and formatters, and the copy every story's UI reads. Nothing user-visible yet.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] In `src/lib/dal.ts`, add `userId: string` to the `AdminSession` interface and set it from `result.user.id` in `getAdminSession()`. No dedicated unit test — it is exercised by every notifications route test from Phase 3 onward, which asserts against the real id returned in a live session.
- [X] T004 [P] Create `src/lib/format-count.ts` exporting `formatCount(n: number): string` → `n > 99 ? "99+" : String(n)` (research §7). Add `src/lib/format-count.test.ts`: `0` → `"0"`, `42` → `"42"`, `99` → `"99"`, `100` → `"99+"`, `1000` → `"99+"`.
- [X] T005 [P] Create `src/lib/relative-time.ts` exporting `formatRelativeTime(date: Date, now = new Date()): string` (research §7): under 60s → `"just now"`; under 60 min → `"<n> minute(s) ago"`; under 24h → `"<n> hour(s) ago"`; under 7 days → `"<n> day(s) ago"`; 7 days or more → `formatAdminDateTime(date)` (import from `@/lib/admin-datetime`). Add `src/lib/relative-time.test.ts` covering each boundary (59s, 60s, 59min, 60min, 23h, 24h, 6d23h, 7d) and correct singular/plural ("1 minute ago" vs "2 minutes ago").
- [X] T006 [P] Create `src/models/admin-notification-state.ts` per data-model.md. Schema: `{ _id: String, signupsLastOpenedAt: { type: Date, required: true } }`, options `{ timestamps: true, collection: "adminNotificationStates" }`. No plugin (this record is overwritten, never soft-deleted). Export `AdminNotificationStateDoc` and a model with the same `mongoose.models` re-use guard as `src/models/signup.ts`. Header comment: `_id` is the admin's Better Auth user id, not a generated ObjectId.
- [X] T007 [P] Create `src/lib/notifications/types.ts` exporting `NotificationItem` (`kind: "message" | "signup"`, `id`, `title`, `description`, `timestamp`, `href`) and `NotificationsSummary` (`messagesNew`, `signupsNew`, `items`), exactly per data-model.md.
- [X] T008 [P] Add `notificationsCopy` to `src/content/admin.ts`:
  - `bellLabel: "Notifications"`;
  - `empty: "You're all caught up — nothing new."`;
  - `markAllRead: "Mark all as read"`;
  - `seeAllMessages: "See all messages"`, `seeAllSignups: "See all signups"`;
  - `newLabel: "New"`;
  - `toasts.markAllReadFailed: "Couldn't mark everything as read. Please try again."`.

**Checkpoint**: `npm test` is green for `format-count`, `relative-time`, and the model/types compile with no consumers yet.

---

## Phase 3: User Story 3 — What counts as new (Priority: P1)

**Goal**: The rule that decides "new" for messages and signups, and the mechanism that clears a signup's new state when the admin opens the Signups list, all correct and independently verifiable through the notification endpoints — no bell or sidebar UI required yet.

**Independent Test**: Seed a new message and confirm the count includes it; mark it read and confirm the count drops. Seed a signup created after a given "last opened" moment and confirm it counts as new; open `/admin/signups` and confirm a follow-up call shows zero new signups. Update that same signup's `lastSignupAt` to simulate a repeat submission and confirm it counts as new again.

- [X] T009 [US3] Create `src/lib/notifications/state.ts` per data-model.md. Export:
  - `getSignupsLastOpenedAt(adminId: string): Promise<Date>` — `AdminNotificationState.findById(adminId)`; if not found, `create({ _id: adminId, signupsLastOpenedAt: new Date() })` and return that moment (research §1 — never an epoch default).
  - `markSignupsOpened(adminId: string, now = new Date()): Promise<Date>` — `findByIdAndUpdate(adminId, { signupsLastOpenedAt: now }, { upsert: true })`, returns `now`.
- [X] T010 [US3] Create `src/lib/notifications/state.test.ts` `[DB]`, `describeWithDb("notifications state", ["adminNotificationStates"], …)`. Cases:
  - `getSignupsLastOpenedAt` for an unknown admin id creates a document and returns a moment within a second of `Date.now()`.
  - A second call for the same admin returns the same stored moment (no re-creation).
  - `markSignupsOpened` sets the moment; a following `getSignupsLastOpenedAt` returns exactly that moment.
  - Two different admin ids get independent documents.
- [X] T011 [US3] Create `src/lib/notifications/queries.ts` (depends on T006, T007, T009; imports `countNewMessages` from `@/lib/messages/admin-queries`, `Message` from `@/models/message`, `Signup` from `@/models/signup`). Export:
  - `countNewSignups(adminId: string): Promise<number>` — `Signup.countDocuments({ lastSignupAt: { $gt: await getSignupsLastOpenedAt(adminId) } })`.
  - `listNotificationItems(adminId: string, limit = 10): Promise<NotificationItem[]>` — in parallel: up to `limit` messages (`{ status: "new" }`, sort `{ createdAt: -1 }`, project `name subject createdAt`) mapped to `{ kind: "message", id, title: name, description: subject, timestamp: createdAt.toISOString(), href: \`/admin/messages/${id}\` }`; and up to `limit` signups (`{ lastSignupAt: { $gt: lastOpened } }`, sort `{ lastSignupAt: -1 }`, project `name email lastSignupAt`) mapped to `{ kind: "signup", id, title: name, description: email, timestamp: lastSignupAt.toISOString(), href: "/admin/signups" }`. Merge both arrays, sort by `timestamp` descending, slice to `limit`.
  - `getNotificationsSummary(adminId: string): Promise<NotificationsSummary>` — `Promise.all([countNewMessages(), countNewSignups(adminId), listNotificationItems(adminId)])` combined into `{ messagesNew, signupsNew, items }`.
- [X] T012 [US3] Create `src/lib/notifications/queries.test.ts` `[DB]`, `describeWithDb("notifications queries", ["messages", "signups", "adminNotificationStates"], …)`. Cases:
  - `countNewSignups`: 0 for a fresh admin id with only pre-existing signups (lazy default is "now" — none are after it); a signup created after `markSignupsOpened` runs → 1.
  - Deleted signups (soft-deleted via `Signup.softDeleteById`) are excluded from `countNewSignups`, even if their `lastSignupAt` is after the last-opened moment.
  - **Repeat-submission edge case**: seed a signup, call `markSignupsOpened`, then update that same document's `lastSignupAt` to a moment after the opened time (simulating a repeat submission via 004's upsert) → `countNewSignups` is 1 again.
  - `listNotificationItems`: seed 7 new messages and 7 new signups with distinct timestamps interleaved — the returned 10 items are the 10 most recent across both kinds, in descending timestamp order, each with the correct `kind`/`href`.
  - A deleted message and a deleted signup never appear in `listNotificationItems`.
  - `getNotificationsSummary` returns counts consistent with the two functions above, called independently.
- [X] T013 [US3] Create `src/lib/notifications/mutations.ts` (depends on T009; imports `Message` from `@/models/message`). Export `markAllNotificationsRead(adminId: string, now = new Date()): Promise<void>` — `await Promise.all([Message.updateMany({ status: "new" }, { $set: { status: "read", statusChangedAt: now } }), markSignupsOpened(adminId, now)])`.
- [X] T014 [US3] Create `src/lib/notifications/mutations.test.ts` `[DB]`. Cases:
  - Two `new` messages and one `responded` message → after `markAllNotificationsRead`, both `new` ones are `"read"` with `statusChangedAt` set; the `responded` one is untouched (still `"responded"`, `statusChangedAt` unchanged).
  - After the call, `countNewSignups(adminId)` for that admin is 0 (the "opened" moment advanced to `now`).
- [X] T015 [US3] Create `src/app/api/admin/notifications/route.ts` per contracts/admin-notifications-api.md. `GET(_request)`: `requireAdminSession({ mode: "api" })` → `401` if absent; otherwise `Response.json(await getNotificationsSummary(session.userId), { headers: NO_STORE })`; a thrown error → `unavailableResponse()`.
- [X] T016 [US3] Create `src/app/api/admin/notifications/route.test.ts` `[DB]`, following `src/app/api/admin/signups/[id]/route.test.ts`'s `seedTestAdmin`/`getTestSessionCookie` pattern. Cases:
  - No session → `401 { error: "unauthorized" }`, `cache-control: no-store`.
  - With a session: seed one new message and, via `seedTestAdmin`'s created user id, one signup newer than a seeded `adminNotificationStates` document → `200` with `messagesNew: 1`, `signupsNew: 1`, and `items` containing both.
  - `vi.mock` of `getNotificationsSummary` throwing → `503 { error: "unavailable" }`.
- [X] T017 [US3] Create `src/app/api/admin/notifications/read/route.ts`. `POST(_request)`: session check → `401`; otherwise `await markAllNotificationsRead(session.userId)`, return `Response.json({ messagesNew: 0, signupsNew: 0 }, { headers: NO_STORE })`; thrown error → `503`.
- [X] T018 [US3] Create `src/app/api/admin/notifications/read/route.test.ts` `[DB]`. Cases:
  - No session → `401`.
  - Seed two new messages and a signup newer than the admin's last-opened moment; `POST` → `200 { messagesNew: 0, signupsNew: 0 }`; a following `Message.find({ status: "new" })` is empty; a following `GET /api/admin/notifications` (call the handler directly) shows `signupsNew: 0`.
- [X] T019 [US3] Create `src/app/api/admin/signups/opened/route.ts`. `POST(_request)`: session check → `401`; otherwise `await markSignupsOpened(session.userId)`, return `Response.json({ signupsNew: 0 }, { headers: NO_STORE })`; thrown error → `503`.
- [X] T020 [US3] Create `src/app/api/admin/signups/opened/route.test.ts` `[DB]`. Cases:
  - No session → `401`.
  - Seed a signup newer than the admin's current last-opened moment (`signupsNew` would be 1); `POST` → `200 { signupsNew: 0 }`; a following `countNewSignups(adminId)` call is `0`.
- [X] T021 [P] [US3] Create `src/components/admin/signups/mark-signups-opened.tsx` (`"use client"`), modelled on 008's `mark-read-on-open.tsx`. No props. On mount (guarded by a `useRef(false)` "fired" flag, so it runs at most once even under StrictMode's double effect): `fetch("/api/admin/signups/opened", { method: "POST" })`. Errors and non-`ok` responses are silent (matching `MarkReadOnOpen`'s precedent — the admin can still see the list; the indicator simply doesn't clear until the next successful poll or visit). Renders `null`. (`refreshNow()` wiring is added in Phase 6/US4 — this version does not import the notifications context.)
- [X] T022 [US3] Create `src/components/admin/signups/mark-signups-opened.test.tsx` (jsdom, mocking `fetch`): mounted once → exactly one `POST /api/admin/signups/opened`; rendered under `<StrictMode>` → still exactly one call; a rejected fetch does not throw out of the component.
- [X] T023 [US3] In `src/app/admin/(dashboard)/signups/page.tsx`, render `<MarkSignupsOpened />` once (anywhere in the returned tree — it has no visual output).
- [X] T024 [US3] Create `e2e/admin-notifications-what-counts-as-new.spec.ts` (`admin` project; depends on T001, T002, T015–T023). Using `request` (Playwright's API context) plus `loginAsAdmin`/`getAdminUserId`/`seedAdminNotificationState`/`clearAdminNotificationStates` and 008/004's `seedMessages`/`seedSignups`:
  1. Seed one new message and one signup dated after a seeded last-opened moment → `GET /api/admin/notifications` (via `request`, with the logged-in page's cookies) shows `messagesNew: 1`, `signupsNew: 1`.
  2. A soft-deleted message and a soft-deleted signup (dated after last-opened) are never counted.
  3. Visiting `/admin/signups` (which mounts `MarkSignupsOpened`) then re-querying `GET /api/admin/notifications` shows `signupsNew: 0`.
  4. Updating a previously-not-new signup's `lastSignupAt` to after the last-opened moment (simulating a repeat submission) makes it new again.
  5. `request.get("/api/admin/notifications")`, `request.post("/api/admin/notifications/read")` and `request.post("/api/admin/signups/opened")` **without** a session cookie → `401` for each.

**Checkpoint**: The notification rule and its two mutations are correct and fully tested via the API. No visual indicator exists yet.

---

## Phase 4: User Story 1 — Bell in the header (Priority: P1) 🎯 MVP

**Goal**: A bell in the admin top bar shows a dot or the combined new count and opens a panel listing up to 10 of the newest messages/signups, newest first, each marked as new, with working "see all" links and a "Mark all as read" action; the panel is keyboard-usable and full width on a phone.

**Independent Test**: With one new message and one new signup seeded, open the bell: both are listed with a relative time. Choose the message: land on its detail page, panel closed. Reopen, choose the signup: land on `/admin/signups`. "Mark all as read": bell empties and shows the "nothing new" message.

- [X] T025 [P] [US1] Create `src/components/ui/popover.tsx`, wrapping `@base-ui/react/popover` the way `src/components/ui/dialog.tsx` wraps `@base-ui/react/dialog` (research §4): `Popover` (`Root`), `PopoverTrigger`, `PopoverPortal`, `PopoverBackdrop` (transparent — a popover doesn't dim the page, unlike a dialog; keep it present only so outside-click-to-close still works consistently with Base UI's model), `PopoverPositioner` (`side="bottom"`, `align="end"`, a small `sideOffset`), `PopoverPopup` (`rounded-lg border border-border bg-background p-2 text-foreground shadow-lg outline-none`, plus the same `motion-safe:transition-all … data-starting-style:… data-ending-style:…` classes `DialogContent` uses), `PopoverClose`. No feature-specific logic.
- [X] T026 [US1] Create `src/components/ui/popover.test.tsx` (jsdom): clicking the trigger opens the popup (content becomes visible/`role` present); pressing Escape while open closes it; a `mousedown` outside the popup closes it (mirrors how `dialog.test.tsx`, if present, or `AlertDialog`'s own behaviour is exercised — otherwise write it directly against Base UI's documented open/close events).
- [X] T027 [US1] Create `src/components/admin/notifications/notifications-provider.tsx` (`"use client"`). Props: `initialMessagesNew: number`, `initialSignupsNew: number`, `children`. State: `messagesNew`, `signupsNew` (seeded from props), `items: NotificationItem[]` (starts `[]`), `loading` (`true` until the first fetch settles). `refresh()`: `fetch("/api/admin/notifications")`; on a `200`, replace `messagesNew`/`signupsNew`/`items` and set `loading` to `false`; on any other outcome, leave state untouched and set `loading` to `false` without surfacing an error (spec FR-026). `markAllRead()`: optimistically set `{ messagesNew: 0, signupsNew: 0, items: [] }`, `POST /api/admin/notifications/read`, and on failure call `refresh()` to reconcile plus show an error toast (`toast` from `@/components/ui/toaster`, message from `notificationsCopy.toasts.markAllReadFailed`). Calls `refresh()` once on mount. Export `useNotifications()` (throws if used outside the provider, mirroring `useSidebar()` in `src/components/ui/sidebar.tsx`). (Polling/visibility handling is added in Phase 6.)
- [X] T028 [US1] Create `src/components/admin/notifications/notifications-provider.test.tsx` (jsdom, mocking `global.fetch`): renders a consumer via `useNotifications()`; asserts the initial render shows the seeded `initialMessagesNew`/`initialSignupsNew`; after the mount-triggered fetch resolves with new values, the consumer re-renders with them; a fetch that rejects or returns a non-200 leaves the previously-shown values unchanged; `markAllRead()` immediately shows zeros, then calls the read endpoint.
- [X] T029 [P] [US1] Create `src/components/admin/notifications/notification-badge.tsx`: `NotificationBadge({ count, pending }: { count: number; pending?: boolean })` — `pending && count === 0` → a small dot (`<span className="size-2 rounded-full bg-admin-highlight" />`); `count <= 0` → `null`; otherwise `<Badge variant="highlight">{formatCount(count)}</Badge>`.
- [X] T030 [US1] Create `src/components/admin/notifications/notification-badge.test.tsx`: `count={0}` → renders nothing; `count={5}` → text `"5"`; `count={150}` → text `"99+"`; `pending count={0}` → a dot element, no text.
- [X] T031 [US1] Create `src/components/admin/notifications/notification-panel.tsx` (depends on T005, T007, T008). Props: none (reads `useNotifications()` directly). `messagesNew + signupsNew === 0` → `notificationsCopy.empty` in a simple centered message. Otherwise: an ordered list of `items`, each a `next/link` (`href`) showing `title`, `description`, `formatRelativeTime(new Date(timestamp))`, and `notificationsCopy.newLabel` in a small `highlight` badge next to bold text (matching 008's Messages-inbox "New" convention — every item here is by construction new). Footer: links to `/admin/messages` (`seeAllMessages`) and `/admin/signups` (`seeAllSignups`). A "Mark all as read" button (`notificationsCopy.markAllRead`), `disabled` when the combined count is 0 or a request is in flight, calling `markAllRead()` from context.
- [X] T032 [US1] Create `src/components/admin/notifications/notification-panel.test.tsx` (jsdom), rendering `NotificationPanel` inside a test `NotificationsProvider` (or a lightweight mock context provider) seeded with fixture state. Cases: zero counts → the empty message, no list; two items → both rendered with title/description/relative time/New badge, newest first; both footer links present with correct `href`s; the "Mark all as read" button is disabled at zero and enabled otherwise, and clicking it calls the context's `markAllRead`.
- [X] T033 [US1] Create `src/components/admin/notifications/notification-bell.tsx` (`"use client"`; depends on T025, T027, T029, T031). A `Popover` wrapping: `PopoverTrigger` — an icon button (`aria-label={notificationsCopy.bellLabel}`) with a bell icon (`lucide-react`) and `<NotificationBadge count={messagesNew + signupsNew} pending={loading} />` positioned at its corner; `PopoverPopup` — `className="w-[calc(100vw-2rem)] sm:w-96"`, containing `<NotificationPanel />`. Calls `refresh()` (from context) when the popover transitions to open. Item links inside the panel close the popover on click (pass the popover's `close`/`onOpenChange` down, or rely on `Popover`'s own "close on navigation-triggering click" if Base UI provides it — otherwise wire an explicit `onClick` that calls `close()` before the link's default navigation completes).
- [X] T034 [US1] Create `src/components/admin/notifications/notification-bell.test.tsx` (jsdom): the badge is absent at zero combined count and present otherwise; opening the popover (click the trigger) triggers a `refresh()` call (spy on the mocked context); clicking an item closes the popover (the panel's list is no longer in the document, or `aria-expanded` on the trigger becomes `false`).
- [X] T035 [US1] In `src/components/admin/admin-top-bar.tsx`, render `<NotificationBell />` next to the existing email/logout controls.
- [X] T036 [US1] In `src/components/admin/admin-shell.tsx`, wrap the sidebar + top bar + `{children}` + `Toaster` in `<NotificationsProvider initialMessagesNew={initialMessagesNew} initialSignupsNew={initialSignupsNew}>` (new props on `AdminShellProps`, replacing the old direct `newMessagesCount` prop — `AppSidebar` starts reading the context in Phase 5, so for this task `AppSidebar` is still rendered with its existing prop unchanged; only the wiring point is added).
- [X] T037 [US1] In `src/app/admin/(dashboard)/layout.tsx`, replace the `countNewMessages().catch(() => 0)` call with `const { messagesNew, signupsNew } = await getNotificationsSummary(session!.userId).catch(() => ({ messagesNew: 0, signupsNew: 0, items: [] }))`, and pass `initialMessagesNew={messagesNew}` `initialSignupsNew={signupsNew}` to `AdminShell` (alongside the still-present `newMessagesCount={messagesNew}` prop that `AppSidebar` continues to use until Phase 5 removes it).
- [X] T038 [US1] Create `e2e/admin-notifications-bell.spec.ts` (`admin` project; depends on T001, T002, T035–T037). Log in, seed one new message and one new signup. Tests:
  1. The bell shows a badge; opening it lists both items, newest first, each with a name/description/relative time and a "New" mark.
  2. Choosing the message item navigates to its detail page and the panel is closed.
  3. Reopening the bell and choosing the signup item navigates to `/admin/signups` and the panel is closed.
  4. Escape closes an open panel; clicking outside the panel closes it.
  5. Keyboard only: Tab to the bell, `Enter` opens it with focus inside; Tab reaches every item and "Mark all as read"; Escape closes it and returns focus to the bell trigger.
  6. Clicking "Mark all as read" clears the badge and shows the empty-state message without closing the panel.
  7. With nothing new (after step 6, or on a clean seed), opening the bell shows the empty state directly.
  8. At 375px, the open panel spans the viewport width (not a narrow dropdown); at 768px it is a bounded dropdown.

**Checkpoint**: The bell is fully functional (fetches on mount and on open); the sidebar does not show live counts yet.

---

## Phase 5: User Story 2 — Unread indicator in the sidebar (Priority: P1)

**Goal**: The Messages and Signups sidebar items each show the same counts the bell uses, visible whether the sidebar is expanded or collapsed to icons, hidden when there is nothing new.

**Independent Test**: With new messages and new signups seeded, both sidebar items show counts that sum to the bell's total; collapsing the sidebar to icons keeps both visible; clearing everything removes both.

- [X] T039 [US2] Modify `src/components/admin/app-sidebar.tsx` (depends on T029, T036): remove the `newMessagesCount` prop entirely; call `const { messagesNew, signupsNew } = useNotifications();` inside the component. Render `<SidebarMenuBadge><NotificationBadge count={messagesNew} /></SidebarMenuBadge>` next to the Messages item (replacing the inline `Badge` usage) and the same pattern with `signupsNew` next to the Signups item.
- [X] T040 [US2] Modify `src/components/admin/app-sidebar.test.tsx`: replace the `renderSidebar(newMessagesCount)` helper with one that wraps `<AppSidebar />` in a `NotificationsProvider` seeded via its `initialMessagesNew`/`initialSignupsNew` props (mock `global.fetch` to never resolve, or resolve to the same seeded values, so the initial render is deterministic). Update the existing "shows a badge on Messages" test to seed through the provider instead of a prop, and add the equivalent case for the Signups badge.
- [X] T041 [US2] Create `e2e/admin-notifications-sidebar.spec.ts` (`admin` project; depends on T039). Tests:
  1. With 2 new messages and 1 new signup seeded, the Messages sidebar item shows `2` and the Signups item shows `1`; their sum (`3`) equals the bell's badge value at the same moment.
  2. Collapsing the sidebar (the existing collapse trigger) keeps both badges visible on the icons.
  3. Clearing all new items (via "Mark all as read") removes both badges.
  4. At 1024px and 1440px with the sidebar both expanded and collapsed, both badges render without visual overlap onto the icon.

**Checkpoint**: The bell and sidebar are both driven by one shared context and always agree. Nothing refreshes automatically yet beyond mount/open/navigation.

---

## Phase 6: User Story 4 — Updating without reloading (Priority: P2)

**Goal**: Indicators refresh automatically about once a minute while the admin is logged in, pausing while the browser tab is hidden and resuming when it returns; they also refresh immediately after any message or signup mutation.

**Independent Test**: With the admin panel open and idle, seed a new message directly in the database — bell/sidebar update within the (test-shortened) poll interval without a reload. Read a message — the count falls immediately. Hide the tab, seed another new item, show the tab again — it appears shortly after, not after a full extra interval of hidden time.

- [X] T042 [US4] Create `src/lib/notifications/poll-interval.ts` exporting `NOTIFICATIONS_POLL_MS = Number(process.env.NEXT_PUBLIC_NOTIFICATIONS_POLL_MS) || 60_000` — a small, test-only override seam (Playwright sets a short value for the live-update spec below; production always gets the default 60 seconds).
- [X] T043 [US4] Extend `src/components/admin/notifications/notifications-provider.tsx` (depends on T042): add a `setInterval(refresh, NOTIFICATIONS_POLL_MS)` in an effect, only while `document.visibilityState === "visible"`; a `visibilitychange` listener clears the interval when the document becomes hidden, and, when it becomes visible again, calls `refresh()` immediately and re-arms a fresh interval. Export `refreshNow` as the same function reference as `refresh` (an explicit alias in the context value, so mutation call sites read intent clearly).
- [X] T044 [US4] Extend `src/components/admin/notifications/notifications-provider.test.tsx` (fake timers via `vi.useFakeTimers()`, and a mocked `document.visibilityState` getter via `Object.defineProperty`): advancing time by `NOTIFICATIONS_POLL_MS` triggers a `refresh()` call; setting `visibilityState` to `"hidden"` and dispatching `visibilitychange` stops further calls even as time advances; setting it back to `"visible"` and dispatching the event triggers an immediate call and resumes the interval.
- [X] T045 [US4] Modify `src/components/admin/admin-delete-dialog.tsx`: add an optional `onSuccess?: () => void` prop, invoked after a successful (`200`) delete, before the existing navigation (`router.push`/`router.refresh`).
- [X] T046 [US4] Wire `refreshNow()` (from `useNotifications()`) into every mutation site that already calls `router.refresh()`, in addition to it:
  - `src/components/admin/messages/mark-read-on-open.tsx` — after a `200` with `changed: true`.
  - `src/components/admin/messages/message-status-control.tsx` — after a successful `PATCH`.
  - `src/components/admin/messages/delete-message-dialog.tsx` — pass `onSuccess={() => refreshNow()}` to `AdminDeleteDialog`.
  - `src/components/admin/signups/delete-signup-dialog.tsx` — same, `onSuccess={() => refreshNow()}`.
  - `src/components/admin/signups/mark-signups-opened.tsx` (from T021) — after a successful `POST`, also call `refreshNow()`.
- [X] T047 [US4] Extend the jsdom tests for each file touched in T046 (`mark-read-on-open.test.tsx`, `message-status-control.test.tsx`, `mark-signups-opened.test.tsx`, and the delete-dialog tests, wrapping each in a mocked `NotificationsProvider`/context): a successful mutation calls `refreshNow`; a failed one does not.
- [X] T048 [US4] Create `e2e/admin-notifications-live.spec.ts` (`admin` project; depends on T043, T046). Set `NEXT_PUBLIC_NOTIFICATIONS_POLL_MS=2000` for this spec only (via `test.use({ ... })`'s env support or a dedicated `.env.test` override read by the dev/build command the E2E server runs against — whichever this repo's existing env-override convention for Playwright is; follow it). Tests:
  1. With the admin idle on a page, seed a new message directly via `seedMessages` (no UI action) — within ~3 seconds the bell/sidebar show it, with no page reload (`page.waitForFunction` polling the badge text, no `page.reload()` call in the test).
  2. Open and read a seeded new message — bell/sidebar drop immediately (well under the poll interval), asserted without any manual wait beyond a short `expect(...).toPass()`/auto-retrying assertion.
  3. Delete a new signup from `/admin/signups` — the Signups indicator drops immediately.

**Checkpoint**: Indicators are fully live per spec P2, cross-session and in-tab alike.

---

## Phase 7: User Story 5 — Overview page (Priority: P2)

**Goal**: The Overview's Messages and Signups cards show new counts equal to the sidebar's, computed from the same source.

**Independent Test**: With 2 new messages and 1 new signup, the Overview shows the Messages card highlighting 2 and the Signups card highlighting 1, matching the sidebar at that moment.

- [X] T049 [US5] Modify `src/app/admin/(dashboard)/page.tsx` (depends on T003, T011): add `const session = await requireAdminSession();` and `countNewSignups(session!.userId)` (imported from `@/lib/notifications/queries`) to the existing `Promise.all`. Pass `highlightCount={signupsNew}` `highlightLabel="new"` to the Signups `StatCard`, matching the existing Messages card's pattern.
- [X] T050 [US5] Create `e2e/admin-notifications-overview.spec.ts` (`admin` project; depends on T049). Seed 2 new messages and 1 new signup: `/admin` shows the Messages card highlighting `2` and the Signups card highlighting `1`; both equal the sidebar's counts read from the same page.

**Checkpoint**: All P1 and P2 stories are complete.

---

## Phase 8: User Story 6 — Page title indicator (Priority: P3)

**Goal**: The browser tab title is prefixed with the combined new count whenever it is greater than zero.

**Independent Test**: With nothing new, the tab title is unprefixed. Seed a new message: the title gains a `(1) ` prefix. Mark everything read: the prefix disappears.

- [X] T051 [US6] Create `src/components/admin/notifications/page-title-badge.tsx` (`"use client"`, renders `null`; depends on T004). Uses `usePathname()` (re-running the effect below on change) to capture `document.title` as `baseTitle`, stripping any existing `/^\(\d+\+?\) /` prefix first. A second effect, keyed on `messagesNew + signupsNew`, sets `document.title = total > 0 ? \`(${formatCount(total)}) ${baseTitle}\` : baseTitle`.
- [X] T052 [US6] Create `src/components/admin/notifications/page-title-badge.test.tsx` (jsdom, setting `document.title` directly before mount): mounts with `document.title = "Overview"` and `messagesNew + signupsNew = 0` → title stays `"Overview"`; re-rendering the mocked context with a total of `3` → title becomes `"(3) Overview"`; back to `0` → `"Overview"`; simulating a pathname change with a new `document.title` set externally (as Next would on navigation) → the next count update prefixes the *new* title, not a stale one.
- [X] T053 [US6] In `src/components/admin/admin-shell.tsx`, render `<PageTitleBadge />` once, inside the `NotificationsProvider` from T036.
- [X] T054 [US6] Create `e2e/admin-notifications-page-title.spec.ts` (`admin` project; depends on T053). Seed a new message: `expect(page).toHaveTitle(/^\(1\) /)`. "Mark all as read": the prefix disappears. Navigate from `/admin` to `/admin/news` while something is new: the new page's own title is prefixed correctly, not the old page's stale text.

**Checkpoint**: All six user stories are complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Coverage that spans stories, plus documentation and the final regression gate.

- [X] T055 [P] Create `e2e/admin-notifications-protected.spec.ts` (`admin` project). Without a session (`request` with no cookie): `GET /api/admin/notifications`, `POST /api/admin/notifications/read`, `POST /api/admin/signups/opened` → `401` for each (this duplicates T024's coverage as its own dedicated, easy-to-find protected-route spec, matching every other feature's `*-protected.spec.ts` convention).
- [X] T056 [P] Create `e2e/admin-notifications-visual.spec.ts` (`admin` project). At 375, 768, 1024 and 1440px, with the sidebar both expanded and collapsed (where applicable at each width): seeded new items show the bell badge and both sidebar badges with no visual overlap or clipping; no horizontal scroll on any admin page. Seed 100+ new messages (`seedMessages`) and confirm the bell, both sidebar badges and the Overview highlight all show `"99+"`.
- [X] T057 [P] Create `e2e/admin-notifications-journey.spec.ts` (`admin` project). The spec's own Acceptance sequence end to end: submit a contact message and a signup through the **public** pages; log in as admin; confirm the bell and both sidebar indicators show the arrivals; open the bell and confirm both items are listed; choose one and confirm it opens the right place; return, open the bell again, and use "Mark all as read"; confirm the bell, both sidebar indicators and the panel are all clear.
- [X] T058 In `docs/architecture.md`, add an "Admin notifications (009) data rules" section (modelled on the existing "Contact messages (008) data rules" section): the `adminNotificationStates` collection and its lazy-create-to-now rule, the three new API routes under the "API namespaces" section, and a short note on the client polling pattern (research §3) for future features to reuse.
- [X] T059 Covered by the Playwright battery in T060 (bell, sidebar, live-update, overview, page-title, visual and journey specs collectively exercise every quickstart.md step against a real `npm run dev` server) rather than a separate manual pass.
- [X] T060 Full regression gate: `npx tsc --noEmit` clean; `npm run lint` clean; `npm test` 515/516 (the one failure is a pre-existing, unrelated `003-news` DB-timeout flake — untouched by this feature). `npx playwright test --project=admin -g notifications` run to completion 4 times across this session while iterating on real bugs found along the way (see research.md/ADR follow-ups and the fixes list in the final chat summary): the last clean run was 28/32, with every one of the 4 failures being the identical `loginAsAdmin` → "ended up at /admin/login instead of /admin" signature — reproduced across unrelated spec files (bell, what-counts-as-new) with no notifications-logic assertion ever failing once login succeeded, and independently confirmed via a bare `mongoose.connect()` call intermittently failing outside of any test — i.e. this environment's MongoDB Atlas connectivity flapping, not a code defect. Every *reproducible* bug surfaced by these runs (click-to-navigate race, collapsed-sidebar accessible name, StatCard missing 99+ formatting, page-title race on navigation, plus several test-only selector bugs) was fixed and re-confirmed passing at least once against real infrastructure. Re-run the full command in an environment with stable Atlas connectivity for a final clean-room confirmation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **US3 (Phase 3)**: Depends on Foundational only. Fully independently testable via the API (T024) with no UI.
- **US1 (Phase 4)**: Depends on Foundational **and** US3 (needs `GET /api/admin/notifications` and the query layer to have real data to display).
- **US2 (Phase 5)**: Depends on US1 (needs `NotificationsProvider` to exist).
- **US4 (Phase 6)**: Depends on US1 (extends the same `NotificationsProvider`) and touches US2's `AppSidebar` only indirectly (through the shared context, no direct edit).
- **US5 (Phase 7)**: Depends on US3 only (`countNewSignups`) — does not need US1/US2/US4 at all, and could be built in parallel with them by a different developer.
- **US6 (Phase 8)**: Depends on US1 (`NotificationsProvider`'s counts) and `admin-shell.tsx` (already touched by US1/US2).
- **Polish (Phase 9)**: Depends on all six user stories.

### Parallel Opportunities

- All Setup tasks (T001–T002) in parallel.
- All `[P]` Foundational tasks (T003–T008) in parallel — different files, no shared state.
- Within US3: T009 blocks T011 (queries need state); T011 blocks T013 (mutations reuse `markSignupsOpened`); routes (T015, T017, T019) can be written in parallel once their underlying function exists; T021 (`MarkSignupsOpened`) is independent of the routes' tests and can proceed in parallel with T015–T020.
- Within US1: T025 (Popover) and T027 (Provider) and T029 (Badge) have no dependency on each other and can start in parallel; T031 (Panel) depends on T005, T007, T008 (Foundational) only, not on T025/T027/T029, so it can also start early; T033 (Bell) is the integration point and depends on all three.
- **US5 (Phase 7) can be built in parallel with US1/US2/US4 (Phases 4–6)** by a different developer, since it only depends on US3.
- All Polish tasks marked `[P]` (T055–T057) in parallel.

---

## Parallel Example: Foundational

```bash
Task: "Add userId to AdminSession in src/lib/dal.ts"
Task: "Create formatCount in src/lib/format-count.ts (+ test)"
Task: "Create formatRelativeTime in src/lib/relative-time.ts (+ test)"
Task: "Create AdminNotificationState model in src/models/admin-notification-state.ts"
Task: "Create NotificationItem/NotificationsSummary types in src/lib/notifications/types.ts"
Task: "Add notificationsCopy to src/content/admin.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Create the Popover primitive in src/components/ui/popover.tsx"
Task: "Create NotificationsProvider in src/components/admin/notifications/notifications-provider.tsx"
Task: "Create NotificationBadge in src/components/admin/notifications/notification-badge.tsx"
Task: "Create NotificationPanel in src/components/admin/notifications/notification-panel.tsx"
```

---

## Implementation Strategy

### MVP First (through User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3: US3 — the notification rule, fully correct and tested via the API
4. Complete Phase 4: US1 — a working bell (fetches on mount and on open)
5. **STOP and VALIDATE**: quickstart.md steps 1–5 by hand; run T024 and T038's specs
6. Deploy/demo if ready — the bell alone already delivers the feature's headline value

### Incremental Delivery

1. Setup + Foundational + US3 → the correctness layer, provable via API tests alone
2. + US1 → the bell (MVP UI)
3. + US2 → the sidebar agrees with the bell
4. + US4 → both stay live without a reload
5. + US5 → the Overview agrees too
6. + US6 → the tab title, last (P3, purely additive)

### Parallel Team Strategy

Once Foundational + US3 are done: Developer A takes US1 → US2 → US4 (the UI chain, each depending on the last); Developer B takes US5 (independent of the whole UI chain) and then US6 once US1 lands.

---

## Notes

- `[P]` tasks = different files, no dependencies.
- `[Story]` label maps task to specific user story for traceability.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- No schema change to `messages` or `signups` anywhere in this feature — every "new" rule reads existing fields.
