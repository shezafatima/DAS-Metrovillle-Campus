# Feature Specification: Admin Notifications

**Feature Branch**: `009-admin-notifications`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Feature Brief — 009 Admin Notifications: Unread indicators in the admin panel for new messages and new signups, updating while the admin is logged in. References: docs/prd.md §6; existing sidebar badge for new messages (008); admin layout and UI patterns from 002. User stories: P1 bell in the header (dot or total count; panel lists the 10 newest items mixing messages and signups, most recent first, with who it's from, a short description and how long ago; new items stand out; choosing an item goes to it and closes the panel; link to see all messages and all signups; mark all as read clears everything; empty state; closes on Escape/outside click/after choosing; keyboard usable). P1 unread indicator in the sidebar (Messages and Signups each show a count or dot; sidebar and bell always agree; visible expanded or collapsed; nothing shown when nothing new). P1 what counts as new (messages: status new; signups: created since the admin last opened the Signups page; opening a section clears its indicator; last-opened remembered per admin across devices and sessions). P2 updating without reloading (indicators refresh about once a minute without reloading; also refresh immediately after reading/deleting/changing a message's status or deleting a signup; checking pauses in a background tab and resumes when visible). P2 overview page (Messages and Signups cards show the same new counts as the sidebar). P3 page title indicator (browser tab title prefixed with the total count when something is new). Edge cases: a signup updated by a repeat submission counts as new again; deleted messages and signups are never counted; if a count can't load, the previous value stays with no error; counts above 99 display as 99+; the indicator and bell never appear on the login page; the panel opens full width on a phone; an item deleted in another tab disappears from the panel on the next refresh instead of a missing page. Out of scope: email/SMS/push notifications; a record of past alerts once read; server-pushed live updates; sounds; notifications for anything other than messages and signups. Acceptance: E2E test covering a submitted message and signup showing up in the bell and both sidebar indicators, opening the panel, choosing an item, and mark all as read; tests proving deleted records are never counted; tests proving the count endpoint rejects unauthorized requests; indicators correct expanded/collapsed at 375, 768, 1024 and 1440px."

## Reference Material

- `docs/prd.md` §6 (Admin panel).
- Building blocks from 002: admin layout, top bar, sidebar with a
  collapsible/icon-only mode, session-based admin protection.
- Building blocks from 008: the Messages sidebar badge and Overview
  "Messages" card, already wired to a live count of messages with
  status "new" — this feature adds the matching Signups side and the
  bell that combines both, without changing how message status itself
  works.
- Building blocks from 004: the Signup record, including that a repeat
  submission from an existing email updates the same record (its
  "last signed up" moment moves forward) rather than creating a new
  one.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bell in the header (Priority: P1)

On every admin page, a bell icon sits in the top bar. It shows a dot
when anything is new anywhere, and the total count once it is known.
Clicking (or activating by keyboard) the bell opens a panel listing the
newest new items — messages and signups mixed together, most recent
first — each showing who it is from, a short description, and how long
ago it arrived. Choosing an item takes the admin straight to it and
closes the panel. A "mark all as read" action clears everything at
once. When nothing is new, the panel says so.

**Why this priority**: The bell is the one place that answers "is
there anything I haven't seen yet?" across the whole admin panel; it is
the feature's headline surface.

**Independent Test**: With one new message and one new signup present,
open the bell and see both listed with a relative time; choose the
message and land on its detail page with the panel closed; reopen the
bell, choose the signup and land on the Signups list; with everything
now read/seen, reopen the bell and see the "nothing new" state.

**Acceptance Scenarios**:

1. **Given** any admin page other than the login page, **When** it is
   displayed, **Then** a bell icon is visible in the top bar.
2. **Given** at least one new message or new signup exists, **When**
   the bell is shown, **Then** it displays the total new count once it
   is known, or a dot if the count is not yet known.
3. **Given** nothing is new, **When** the bell is shown, **Then** it
   shows neither a dot nor a count.
4. **Given** two new messages and one new signup, **When** the admin
   opens the bell, **Then** the panel lists all three items ordered by
   arrival time, newest first, each showing sender/name, a short
   description (subject for a message, email for a signup) and a
   relative "how long ago" time, and each visibly marked as new.
5. **Given** more than 10 new items exist, **When** the panel is
   opened, **Then** only the 10 most recent are listed, and the panel
   offers a link to see all messages and a link to see all signups.
6. **Given** the panel is open, **When** the admin chooses a message
   item, **Then** the browser goes to that message's detail page and
   the panel closes; **When** they choose a signup item instead,
   **Then** the browser goes to the Signups list and the panel closes.
7. **Given** the panel is open with new items listed, **When** the
   admin chooses "Mark all as read", **Then** every new message becomes
   read, signups are recorded as seen up to that moment, the bell and
   both sidebar indicators clear, and the panel now shows the empty
   state.
8. **Given** nothing is new, **When** the admin opens the bell,
   **Then** the panel shows a friendly message that there is nothing
   new instead of a list.
9. **Given** the panel is open, **When** the admin presses Escape, or
   clicks outside the panel, or chooses an item, **Then** the panel
   closes.
10. **Given** the admin uses only a keyboard, **When** they tab to the
    bell and press Enter/Space, **Then** the panel opens with focus
    inside it, every item and the "Mark all as read" action are
    reachable by keyboard, and Escape closes the panel and returns
    focus to the bell.
11. **Given** a phone-width screen, **When** the panel is open,
    **Then** it fills the width of the screen rather than appearing as
    a narrow dropdown.

---

### User Story 2 - Unread indicator in the sidebar (Priority: P1)

The Messages and Signups items in the admin sidebar each show an
indicator when something new has arrived for them: a count when the
number is known, otherwise a dot. The sidebar and the bell always show
numbers that agree with each other. The indicators work the same way
whether the sidebar is expanded or collapsed to icons, and disappear
entirely when there is nothing new.

**Why this priority**: The sidebar is where the admin spends most of
their time; a badge there is the fastest way to notice new work without
opening the bell.

**Independent Test**: With new messages and new signups present, see
both sidebar items show a count that matches the bell's total when
summed; collapse the sidebar to icons and see both indicators still
present; clear everything and see both indicators disappear.

**Acceptance Scenarios**:

1. **Given** new messages exist, **When** any admin screen is shown,
   **Then** the Messages sidebar item shows the new-message count (or
   a dot if not yet known).
2. **Given** new signups exist, **When** any admin screen is shown,
   **Then** the Signups sidebar item shows the new-signup count (or a
   dot if not yet known).
3. **Given** the counts shown by the bell and the sidebar at the same
   moment, **When** compared, **Then** the sidebar's two counts sum to
   the bell's total.
4. **Given** the sidebar is collapsed to icons, **When** something is
   new, **Then** the same indicator remains visible on the collapsed
   icon.
5. **Given** nothing is new for a section, **When** any admin screen is
   shown, **Then** that section's sidebar item shows no indicator.

---

### User Story 3 - What counts as new (Priority: P1)

A message counts as new exactly when its status is "new" (as already
built in 008). A signup counts as new when it arrived, or was updated
by a repeat submission, since the admin last opened the Signups list.
Opening a section clears its own indicator: for messages the count
falls as each one is individually read; for signups, opening the list
resets the new-signup count. The moment the admin last opened Signups
is remembered for that admin regardless of which device or session they
use next.

**Why this priority**: This rule is what every other indicator in the
feature depends on; without a shared, correct definition of "new" the
bell and sidebar cannot agree with each other or with reality.

**Independent Test**: Seed one new message and confirm it counts;
open it and confirm the messages-new count falls by one. Seed a signup,
confirm it counts as new, open the Signups list and confirm the count
drops to zero; sign in from a second browser session and confirm the
Signups indicator is still cleared (the "last opened" moment carried
over).

**Acceptance Scenarios**:

1. **Given** a message with status "new", **When** any count or the
   panel is computed, **Then** that message is included as new; once
   its status is no longer "new", it is excluded.
2. **Given** a signup created after the admin's last recorded visit to
   the Signups list, **When** any count or the panel is computed,
   **Then** that signup is included as new.
3. **Given** a signup created before the admin's last recorded visit to
   the Signups list, and never updated since, **When** any count or the
   panel is computed, **Then** that signup is excluded.
4. **Given** the admin opens the Signups list, **When** the page has
   loaded, **Then** the new-signup count becomes zero and the moment is
   recorded as the admin's new "last opened" time.
5. **Given** the admin's last-opened moment for Signups was recorded
   during a previous session, **When** they sign in again — from the
   same or a different device — **Then** the new-signup count is
   computed from that same recorded moment, not reset to "everything is
   new".

---

### User Story 4 - Updating without reloading (Priority: P2)

While the admin is signed in, the bell and sidebar indicators keep
themselves current without the admin reloading the page: roughly once a
minute in the background, and immediately whenever the admin reads,
deletes or changes the status of a message, or deletes a signup. The
automatic check pauses while the browser tab is not in view and picks
up again as soon as it is.

**Why this priority**: Without this, the indicators would only be as
fresh as the last full page load, undermining their purpose as an
at-a-glance signal — but the panel and sidebar are still useful even if
the admin has to refresh manually, so this is not required for a first
usable version.

**Independent Test**: With the admin panel open and idle, create a new
message from another session and see the bell/sidebar update within
about a minute without a reload; then read a message and see the count
fall immediately; put the tab in the background, create another new
item, bring the tab back to the front and see it appear shortly after
without waiting a full extra minute of hidden time.

**Acceptance Scenarios**:

1. **Given** the admin is signed in and idle on an admin page, **When**
   a new message or signup is created elsewhere, **Then** the bell and
   sidebar reflect it within about one minute without the admin
   reloading the page.
2. **Given** the admin reads a message, marks it responded, sets its
   status, or deletes it, **When** that action completes, **Then** the
   indicators update immediately, without waiting for the timed check.
3. **Given** the admin deletes a signup, **When** that action
   completes, **Then** the indicators update immediately.
4. **Given** the browser tab is in the background, **When** time
   passes, **Then** the automatic check does not run; **When** the tab
   becomes visible again, **Then** checking resumes.

---

### User Story 5 - Overview page (Priority: P2)

The admin Overview's Messages and Signups cards show the same new
counts as the sidebar, computed from the same source, so a glance at
the Overview never disagrees with the sidebar or the bell.

**Why this priority**: Convenience and trust — the Overview is already
useful without this, but any mismatch between it and the sidebar would
undermine confidence in all the counts.

**Independent Test**: With two new messages and one new signup, open
the Overview and see the Messages card highlight 2 and the Signups
card highlight 1, matching the sidebar at the same moment.

**Acceptance Scenarios**:

1. **Given** new messages exist, **When** the Overview is shown,
   **Then** the Messages card's new count equals the sidebar's
   Messages count at that moment.
2. **Given** new signups exist, **When** the Overview is shown,
   **Then** the Signups card shows a new count equal to the sidebar's
   Signups count at that moment.

---

### User Story 6 - Page title indicator (Priority: P3)

When something is new anywhere, the browser tab's title is prefixed
with the total new count, so the admin notices even while working in a
different tab.

**Why this priority**: A nice-to-have attention cue; the bell and
sidebar already surface the same information while the tab is in
focus.

**Independent Test**: With nothing new, confirm the tab title is
unprefixed; create a new message, switch to another tab, and see the
admin tab's title gain a count prefix; clear everything and see the
prefix disappear.

**Acceptance Scenarios**:

1. **Given** the combined new count is greater than zero, **When** any
   admin page's title is shown, **Then** it is prefixed with that
   count.
2. **Given** the combined new count is zero, **When** any admin page's
   title is shown, **Then** no prefix is present.
3. **Given** the count changes while the admin panel is open, **When**
   the indicators next update, **Then** the title prefix updates to
   match.

---

### Edge Cases

- A signup whose record is updated by a repeat submission (matching an
  existing email, per 004) counts as new again if that update happened
  after the admin's last Signups visit — even if it had already been
  seen and stopped counting as new before the update.
- Deleted messages and deleted signups are never counted or shown, in
  the bell, the sidebar or the Overview cards.
- If a count cannot be loaded (e.g. a request fails), the previously
  displayed value stays on screen and no error is shown to the admin.
- Any displayed count above 99 shows as "99+" (bell total, each sidebar
  indicator, each Overview highlight).
- The bell and both sidebar indicators never appear on the admin login
  page.
- The panel opens full width on a phone-sized screen rather than as a
  narrow dropdown.
- An item shown in the panel that is deleted in another tab or session
  disappears from the panel on the next refresh; choosing it before
  that refresh behaves the same as opening an already-deleted record
  elsewhere in the admin (a graceful "no longer available" outcome),
  never a broken or missing page.
- A count endpoint or refresh request made without a valid admin
  session is refused, the same as every other admin data request.

## Requirements *(mandatory)*

### Functional Requirements

**Bell**

- **FR-001**: Every admin page except the login page MUST show a bell
  icon in the top bar.
- **FR-002**: The bell MUST show a dot when the combined new count is
  not yet known but is not necessarily zero (e.g. before the first
  successful load), and MUST show the combined total (messages new +
  signups new) once known; when the combined total is zero, MUST show
  neither.
- **FR-003**: Activating the bell (by click or keyboard) MUST open a
  panel listing the newest new items across messages and signups
  combined, most recent first, up to 10 items.
- **FR-004**: Each panel item MUST show who it is from (the message
  sender's name, or the signup's name/email), a short description (the
  message's subject, or the signup's email), and a relative "how long
  ago" time, and MUST be visibly marked as new.
- **FR-005**: Choosing a message item MUST navigate to that message's
  detail page (008) and close the panel; choosing a signup item MUST
  navigate to the Signups list and close the panel.
- **FR-006**: The panel MUST always offer a link to see all messages
  (the Messages inbox) and a link to see all signups (the Signups
  list).
- **FR-007**: The panel MUST offer a "Mark all as read" action that, in
  one step, changes every message with status "new" to "read" and
  records the current moment as the admin's Signups "last opened" time,
  so both counts and the panel become empty.
- **FR-008**: When the combined new count is zero, the panel MUST show
  a friendly message that there is nothing new instead of a list.
- **FR-009**: The panel MUST close on the Escape key, on a click
  outside it, and immediately after an item is chosen.
- **FR-010**: The bell and its panel MUST be fully usable by keyboard —
  opening, moving between items, choosing one, triggering "Mark all as
  read", and closing — with visible focus and correct roles/labels for
  assistive technology.
- **FR-011**: On a phone-sized viewport, the panel MUST render as a
  full-width surface rather than a narrow dropdown.

**Sidebar**

- **FR-012**: The Messages sidebar item MUST show the count of
  non-deleted messages with status "new" (as already built in 008),
  hidden entirely when zero.
- **FR-013**: The Signups sidebar item MUST show the new-signup count
  when known, or a dot when not yet known, hidden entirely when there
  is nothing new.
- **FR-014**: The sidebar's two indicators and the bell's combined
  total MUST be computed from the same underlying counts, so they
  never disagree.
- **FR-015**: Both sidebar indicators MUST remain visible and correctly
  positioned whether the sidebar is expanded or collapsed to icons.

**What counts as new**

- **FR-016**: A message counts as new exactly when it is not deleted
  and its status is "new".
- **FR-017**: A signup counts as new exactly when it is not deleted and
  it was created, or most recently updated by a repeat submission,
  after the admin's recorded "last opened Signups" moment.
- **FR-018**: Opening the Signups list MUST record the current moment
  as that admin's new "last opened Signups" time, immediately reducing
  the new-signup count to zero.
- **FR-019**: The "last opened Signups" moment MUST be remembered per
  admin account and MUST be available the same way regardless of which
  device, browser or session that admin next uses.

**Live updates**

- **FR-020**: While an admin is signed in, the bell and sidebar
  indicators MUST refresh automatically on a roughly one-minute
  interval without a full page reload.
- **FR-021**: The indicators MUST also refresh immediately after the
  admin reads, deletes or changes the status of a message, or deletes a
  signup.
- **FR-022**: Automatic refreshing MUST pause while the browser tab is
  hidden and resume once it becomes visible again.

**Overview**

- **FR-023**: The admin Overview's Messages and Signups cards MUST show
  new counts drawn from the same source as the sidebar indicators, so
  all three agree at any given moment.

**Page title**

- **FR-024**: When the combined new count is greater than zero, every
  admin page's browser tab title MUST be prefixed with that count; when
  it is zero, no prefix MUST be shown.

**Correctness and access**

- **FR-025**: Deleted messages and deleted signups MUST never be
  counted or displayed by any indicator, the panel, or the Overview
  cards.
- **FR-026**: If a count cannot be loaded, the previously displayed
  value MUST remain on screen and no error MUST be shown to the admin.
- **FR-027**: Any displayed count greater than 99 MUST be shown as
  "99+" (the bell total, each sidebar indicator, each Overview
  highlight).
- **FR-028**: The bell and both sidebar indicators MUST never appear on
  the admin login page.
- **FR-029**: If an item shown in the panel has since been deleted, the
  next refresh MUST remove it from the panel; choosing it before that
  refresh MUST NOT produce a broken or missing page.
- **FR-030**: Every request that reads or refreshes notification counts
  or panel contents MUST reject requests without a valid admin session,
  using the same protection as every other admin data route (002).

### Key Entities

- **Notification Item**: A single message or signup as shown in the
  bell panel — who it is from, a short description, when it arrived,
  which kind it is, and where choosing it goes. Built from existing
  Message (008) and Signup (004) records; not stored separately.
- **Admin Notification State**: Per admin account, the moment they last
  opened the Signups list — the one piece of new state this feature
  introduces. Persisted so it outlives any single session or device.
  Messages need no equivalent state: their own "new/read/responded"
  status (008) already serves this purpose.

## Assumptions

- The bell's combined total is the sum of the new-message count and the
  new-signup count.
- The bell shows a dot rather than a number only before the indicators
  have loaded for the first time in a page view; once loaded, it always
  shows the number (with zero meaning "show nothing").
- "Mark all as read" only ever moves messages from "new" to "read"; it
  never changes messages already "read" or "responded", and it never
  changes or deletes any signup record — it only advances the admin's
  "last opened Signups" moment to now.
- Every item listed in the panel is, by definition, currently new; the
  "new items stand out from ones already seen" treatment is the same
  visual convention already used for unread rows in the Messages inbox
  (008) — bold text plus a "New" label — applied uniformly to every
  panel item, since the panel only ever lists new items.
- "Opening the Signups list" means the Signups page has loaded for the
  admin; it does not require any further interaction on that page.
- The automatic refresh (about once a minute) is a timed check
  initiated from the admin's browser, not a message pushed by the
  server (consistent with Out of Scope).
- Relative "how long ago" times in the panel use the same style already
  used elsewhere in the admin.
- Because the admin account collection currently holds exactly one
  admin (002), the per-admin "last opened Signups" record still stores
  an explicit admin identifier, so behaviour is unchanged if a second
  admin account is ever added.
- The combined bell count and each individual indicator apply the same
  "99+" display rule independently.

## Dependencies

- 002-foundation: admin session protection for all notification data
  requests, the admin top bar and sidebar (including its
  expanded/collapsed icon mode), the Overview page shell.
- 004-signup: the Signup record and its "created" / "most recently
  updated by a repeat submission" timestamps, and the Signups list
  page that opening resets against.
- 008-contact-messages: the Message record and its new/read/responded
  status, the message detail page that a chosen message item opens,
  and the existing Messages sidebar badge and Overview card that this
  feature's sidebar/Overview requirements extend to agree with the
  bell.

## Out of Scope

- Email, SMS or browser push notifications.
- Keeping a history of past alerts once they have been read or seen —
  the panel only ever lists what is currently new.
- Live updates pushed from the server; a timed check is sufficient.
- Sounds.
- Notifications for anything other than messages and signups.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An automated end-to-end test submits one contact message
  and one signup, then confirms the bell and both sidebar indicators
  show the arrivals, the panel lists both items, choosing each item
  opens the correct destination, and "Mark all as read" clears the
  bell, both sidebar indicators and the panel.
- **SC-002**: Automated tests prove a deleted message and a deleted
  signup are excluded from the bell, sidebar and Overview counts.
- **SC-003**: Automated tests prove every notification count and panel
  request is rejected without a valid admin session.
- **SC-004**: Indicators render correctly — present when something is
  new, absent when nothing is, with no layout defects — with the
  sidebar expanded and with it collapsed, at 375, 768, 1024 and 1440px.
- **SC-005**: With the admin signed in and idle, a new message or
  signup created elsewhere is reflected in the bell and sidebar within
  about one minute without a page reload — proven by an automated test.
- **SC-006**: Reading, deleting or changing the status of a message, or
  deleting a signup, updates the indicators immediately rather than
  waiting for the timed refresh — proven by an automated test.
- **SC-007**: The Overview's Messages and Signups new counts match the
  sidebar's counts at the same moment — proven by an automated test.
- **SC-008**: With more than 10 new items across both kinds, the panel
  shows exactly the 10 most recent, newest first, each with a working
  "see all messages" and "see all signups" link.
- **SC-009**: A count above 99 always displays as "99+" in the bell,
  sidebar and Overview — proven by an automated test.
- **SC-010**: An admin's "last opened Signups" moment persists across a
  new sign-in (including from a different browser), so the new-signup
  count is not reset to "everything is new" on a fresh session —
  proven by an automated test.
