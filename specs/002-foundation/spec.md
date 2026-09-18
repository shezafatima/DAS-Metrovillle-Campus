# Feature Specification: Foundation

**Feature Branch**: `002-foundation`
**Created**: 2026-09-17
**Status**: Draft
**Input**: User description: "Feature Brief — 002 Foundation: Set up the data connection, admin authentication, and the admin area layout that every later admin feature builds on. References: docs/prd.md §2, §6.1, §6.2; research/design-tokens.md (brand colors and fonts for the admin). User stories: P1 admin account setup (one command creates the single admin from environment values, idempotent, explicit reset option updates the password, refuses passwords shorter than 12 characters); P1 admin login and logout (/admin/login, same generic error for wrong email or password, session survives reloads, logged-in visit to /admin/login goes to /admin, logout returns to /admin/login, no registration from UI or API); P1 protected admin area (unauthenticated /admin pages redirect to /admin/login then return to the requested page, admin API requests without a session are rejected, expired sessions behave as no session); P2 admin layout (own layout separate from public header/footer, sidebar Overview/News/Messages/Signups/Settings with active marking, top bar with admin email and logout, sidebar collapses to a menu button on small screens, placeholder pages); P2 login abuse protection (repeated failures temporarily blocked with a clear message, block survives server restarts); P3 shared building blocks (soft delete hidden from normal queries and restorable, public form protection via rate limiting and a hidden spam trap field, basic health check that reports database reachability without details). Deviations: admin area has no das.edu.pk reference; uses brand colors and fonts from research/design-tokens.md with a clean standard dashboard layout. Edge cases: database unreachable shows a generic service-unavailable message; missing environment values fail early naming the missing value; admin pages excluded from search engines and not linked from the public site; email matched case-insensitively. Out of scope: password reset by email, multiple admins, roles; news/messages/signups/settings functionality (003, 004, 007, 010); admin overview counts (010). Acceptance: e2e test covers login, logout, wrong credentials, redirect when logged out, and blocked-after-repeated-failures; every admin API route test proves unauthorized requests are rejected; tests prove the setup command never creates a second admin; admin layout works at 375, 768, 1024 and 1440px."

## Clarifications

### Session 2026-09-17

- Q: How long does an admin session last? → A: Rolling: expires after 7 days of inactivity; each visit extends it.
- Q: What is a failed-login block keyed by? → A: Both: per source address (5 failures / 15 min) and a looser per-account count (20 failures / 15 min); either triggers a 15-minute block.
- Q: What happens to live sessions when the setup command resets the password? → A: Reset ends all existing sessions; the admin must log in again everywhere.
- Q: Should security events be recorded? → A: Server log only: failed login, block, successful login, logout, and password reset are written to the application log with no password, no admin screen, and no stored audit table.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin account setup (Priority: P1)

The developer creates the single admin account with one setup command,
using an email and password supplied through the deployment
configuration rather than through any public sign-up screen. The
command is safe to run repeatedly: a second run reports that the admin
already exists and changes nothing. An explicit reset option updates
the existing admin's password, which is the only password-recovery
path in this phase.

**Why this priority**: Nothing in the admin area can be exercised —
by a person or by a test — until an admin account exists. This is the
first thing that must work, and it must be impossible for it to create
more than one account (PRD §2: one admin, one shared role).

**Independent Test**: With no admin present, run the setup command and
confirm exactly one admin exists. Run it again and confirm the count
is still one and the reported outcome is "already exists". Run it with
the reset option and a new password, then confirm the new password is
the one that works. This can be verified without any login screen.

**Acceptance Scenarios**:

1. **Given** no admin account exists and a valid email and a password of at least 12 characters are configured, **When** the setup command runs, **Then** exactly one admin account is created with that email and the command reports success.
2. **Given** an admin account already exists, **When** the setup command runs without the reset option, **Then** no second account is created, nothing about the existing account changes, and the command reports that the admin already exists.
3. **Given** an admin account already exists, **When** the setup command runs with the reset option and a new password of at least 12 characters, **Then** the existing account's password is replaced with the new one, no additional account is created, and the command reports that the password was updated.
3a. **Given** the admin is logged in on one or more devices, **When** the setup command resets the password, **Then** every existing session is ended and each device must log in again with the new password.
4. **Given** the configured password is shorter than 12 characters, **When** the setup command runs (with or without the reset option), **Then** it refuses, makes no change, and reports the minimum length.
5. **Given** the configured email or password is missing, **When** the setup command runs, **Then** it stops before touching any data and names the missing value.

---

### User Story 2 - Admin login and logout (Priority: P1)

An admin visits `/admin/login`, enters their email and password, and
lands on `/admin`. Their session persists across page reloads and new
tabs until they log out or it expires. Logging out ends the session
and returns them to the login page. Wrong credentials produce one
generic message that never reveals whether the email exists or which
field was wrong. There is no way to register a new account anywhere.

**Why this priority**: Login is the gate to everything staff will do
(publish news, read enquiries). It must be both usable and safe before
any admin feature can ship.

**Independent Test**: Seed the admin, log in with correct credentials
and confirm arrival at `/admin`; reload and confirm still logged in;
log out and confirm return to `/admin/login`; attempt login with a
wrong password, a wrong email, and a non-existent email and confirm
the identical error each time. Deliverable value: a working, safe
front door to the admin area.

**Acceptance Scenarios**:

1. **Given** the admin account exists, **When** the admin submits the correct email and password on `/admin/login`, **Then** they are taken to `/admin` and are recognised as logged in.
2. **Given** the admin is logged in, **When** they reload the page or open `/admin` in a new tab, **Then** they remain logged in without re-entering credentials.
3. **Given** the admin submits a correct email with a wrong password, **When** the login is rejected, **Then** the message shown is the same generic "email or password is incorrect" message as in scenarios 4 and 5.
4. **Given** the admin submits an email that belongs to no account, **When** the login is rejected, **Then** the message shown is identical to scenario 3 and gives no indication that the account does not exist.
5. **Given** the admin submits the correct email in a different letter case (e.g. `ADMIN@Example.com` for `admin@example.com`) with the correct password, **When** they log in, **Then** login succeeds.
6. **Given** the admin is logged in, **When** they visit `/admin/login`, **Then** they are sent straight to `/admin` without seeing the login form.
7. **Given** the admin is logged in, **When** they use the logout control, **Then** their session is ended, they land on `/admin/login`, and visiting `/admin` afterwards requires logging in again.
8. **Given** any visitor, **When** they look for a registration screen or attempt to create an account through any request the application accepts, **Then** no such screen exists and no such request creates an account.

---

### User Story 3 - Protected admin area (Priority: P1)

Every admin page except the login page requires a valid session. An
unauthenticated visitor is redirected to the login page and, after
logging in, returned to the page they originally asked for. Admin data
requests without a valid session are refused as unauthorized even when
the page-level redirect is bypassed. An expired session is treated
exactly like no session.

**Why this priority**: The constitution (Principle III) requires that
every admin route verifies the session on the server. Without this,
news, messages, and signup data would be exposed the moment those
features are built.

**Independent Test**: Without logging in, request each admin page and
confirm a redirect to `/admin/login`; log in from that redirect and
confirm arrival at the originally requested page. Without logging in,
call each admin data endpoint directly and confirm an unauthorized
response. Force a session to expire and confirm both behaviours match
the logged-out case.

**Acceptance Scenarios**:

1. **Given** no valid session, **When** a visitor opens any `/admin` page other than `/admin/login`, **Then** they are redirected to `/admin/login`.
2. **Given** a visitor was redirected to `/admin/login` from `/admin/news`, **When** they log in successfully, **Then** they land on `/admin/news`, not on `/admin`.
3. **Given** a visitor was redirected to login with a return destination that is not an admin page, **When** they log in, **Then** they land on `/admin` (the destination is ignored).
4. **Given** no valid session, **When** any admin data request is made directly (bypassing the page), **Then** it is refused as unauthorized and returns no admin data.
5. **Given** a session that has expired, **When** the admin opens an admin page or makes an admin data request, **Then** the behaviour is identical to having no session at all.
6. **Given** a valid session, **When** the admin opens any admin page or makes any admin data request, **Then** it is served normally.

---

### User Story 4 - Admin layout (Priority: P2)

The admin area has its own visual shell, separate from the public
site's header and footer: a sidebar listing Overview, News, Messages,
Signups, and Settings with the current section marked active; a top
bar showing the logged-in admin's email and a logout control; and a
collapsed menu-button sidebar on small screens. Each section exists as
a placeholder page until its own feature is built.

**Why this priority**: Features 003, 004, 007, and 010 each add pages
into this shell. Building it once here means those features only add
content, not chrome. It is P2 because the login and protection stories
deliver security value on their own even with an unstyled area.

**Independent Test**: Log in and visit each of the five sections;
confirm the sidebar highlights the current one, the top bar shows the
admin's email, and the public header/footer are absent. Resize to
375px and confirm the sidebar is replaced by a menu button that opens
the same five links. Verified at 375, 768, 1024, and 1440px.

**Acceptance Scenarios**:

1. **Given** the admin is logged in, **When** any admin page renders, **Then** the public site header and footer are not present and the admin shell (sidebar and top bar) is.
2. **Given** the admin is logged in, **When** the sidebar renders, **Then** it lists exactly Overview, News, Messages, Signups, Settings in that order, and each link opens the matching section.
3. **Given** the admin is on a given section, **When** the sidebar renders, **Then** that section's entry is visibly marked as active and no other entry is.
4. **Given** the admin is logged in, **When** the top bar renders, **Then** it shows the admin's email and a logout control that performs the logout in User Story 2.
5. **Given** a viewport of 375px or 768px, **When** an admin page renders, **Then** the sidebar is hidden and a menu button is shown; activating it reveals the same five links, and it can be closed again.
6. **Given** a viewport of 1024px or 1440px, **When** an admin page renders, **Then** the sidebar is visible without needing a menu button.
7. **Given** the admin opens Overview, News, Messages, Signups, or Settings, **When** the page renders, **Then** a placeholder page with the section's title is shown, using the brand colors and fonts from `research/design-tokens.md`.
8. **Given** any admin page, **When** a search engine or link checker inspects it, **Then** it is marked as not to be indexed, and no public page links to it.

---

### User Story 5 - Login abuse protection (Priority: P2)

Repeated failed login attempts are temporarily blocked with a clear
"too many attempts, try again later" message. The block is remembered
even if the server restarts during the block window.

**Why this priority**: A single-admin site with a public login page is
an easy target for password guessing. Blocking repeated failures
bounds that risk. It is P2 because the P1 stories are needed first to
have anything to protect, and the risk is bounded further by the
12-character minimum.

**Independent Test**: Submit wrong credentials repeatedly until the
block message appears; confirm that even the correct password is
refused with the block message during the window; restart the server
during the window and confirm the block still applies; wait out the
window and confirm login works again.

**Acceptance Scenarios**:

1. **Given** fewer than 5 failed attempts from a source in the last 15 minutes and fewer than 20 failed attempts against the account in the last 15 minutes, **When** another wrong attempt is submitted, **Then** the generic wrong-credentials message from User Story 2 is shown.
2. **Given** a source has made 5 failed attempts within 15 minutes, **When** that source submits any further login attempt (correct or not) within the 15-minute block, **Then** it is refused with a "too many attempts, try again later" message and no session is created.
3. **Given** 20 failed attempts against the admin account within 15 minutes from any mix of sources, **When** any further login attempt for that account is submitted (correct or not) within the 15-minute block, **Then** it is refused with the same "too many attempts" message and no session is created.
4. **Given** a block is in effect, **When** the server restarts, **Then** the block remains in effect for the rest of its window.
5. **Given** the block window has elapsed, **When** the admin submits correct credentials, **Then** login succeeds.
6. **Given** a successful login, **When** it completes, **Then** the failed-attempt counts for that source and for the account are cleared.

---

### User Story 6 - Shared building blocks for later features (Priority: P3)

Three reusable capabilities are ready and tested so that features
003–007 can adopt them without rebuilding: soft delete (deleted
records are hidden from normal listings and can be restored), public
form protection (request rate limiting plus a hidden spam-trap field
that real visitors never fill in), and a basic health check that
reports whether the data store is reachable without exposing any
details.

**Why this priority**: These are enablers rather than user-facing
value in this feature. They are P3 because nothing an admin or
visitor does in this feature depends on them, but every later
data-bearing feature does.

**Independent Test**: Using a test record type, delete a record and
confirm it disappears from normal listings, remains recoverable, and
reappears after restore. Submit a protected form more times than the
limit allows and confirm the excess submissions are refused; submit
one with the hidden trap field filled and confirm it is rejected
without being stored. Call the health check with the data store up and
down and confirm the two distinct outcomes, with no internal details
in either.

**Acceptance Scenarios**:

1. **Given** a record has been soft-deleted, **When** a normal listing or lookup runs, **Then** the record is not included.
2. **Given** a record has been soft-deleted, **When** it is restored, **Then** it reappears in normal listings with its original data intact.
3. **Given** a public form endpoint using the protection, **When** the same source submits more times than the limit within the window, **Then** the excess submissions are refused with a clear "too many requests" outcome and are not stored.
4. **Given** a public form endpoint using the protection, **When** a submission arrives with the hidden spam-trap field filled in, **Then** it is rejected and not stored, and the response gives no indication of why.
5. **Given** the data store is reachable, **When** the health check is called, **Then** it reports healthy.
6. **Given** the data store is unreachable, **When** the health check is called, **Then** it reports unavailable, and the response contains no connection details, addresses, credentials, or error text.

---

### Edge Cases

- **Data store unreachable at login**: the login page shows a generic "service unavailable, please try again later" message. No stack trace, connection string, host name, or error text is shown to the visitor.
- **Missing configuration values**: the application and the setup command stop early with a clear message naming the missing value (e.g. "ADMIN_EMAIL is not set"); they never start in a half-configured state or fall back to a default credential.
- **Search engines and public linking**: every admin page is marked as not to be indexed, and no public page links to any admin page.
- **Email letter case**: the email is matched case-insensitively at login; the setup command stores it in a normalised form so a single account cannot be duplicated by case variation.
- **Leading/trailing whitespace in email**: trimmed before matching, both at setup and at login.
- **Session expiry mid-visit**: the next admin page request redirects to login and, on success, returns the admin to the page they were on.
- **Logout with no session**: harmless; lands on `/admin/login` without error.
- **Setup command with reset option but no existing admin**: creates the admin (same as a first run) and reports creation, not update.
- **Block window and restart**: a block that began before a restart still expires at its original time, not later.
- **Return destination tampering**: a return destination that points outside the admin area, or to another site, is ignored and the admin lands on `/admin`.

## Requirements *(mandatory)*

### Functional Requirements

**Admin account setup**

- **FR-001**: The system MUST provide a single setup command that creates the admin account from the configured admin email and password, with no public sign-up screen or account-creation request available anywhere.
- **FR-002**: The setup command MUST be idempotent: when an admin already exists and the reset option is not given, it MUST create nothing, change nothing, and report that the admin exists.
- **FR-003**: The setup command MUST accept an explicit reset option that replaces the existing admin's password without creating a second account, and MUST end all existing sessions when it does so.
- **FR-004**: The setup command MUST refuse any password shorter than 12 characters, make no change, and state the minimum length.
- **FR-005**: The setup command MUST stop early and name the missing value when the admin email or password is not configured.
- **FR-006**: At most one admin account MUST exist at any time; the system MUST enforce this regardless of how many times or how concurrently the setup command runs.
- **FR-007**: Passwords MUST never be stored or logged in readable form.

**Login and logout**

- **FR-008**: `/admin/login` MUST accept an email and password and, on success, take the admin to `/admin` (or to a valid admin return destination, see FR-016).
- **FR-009**: On failure, `/admin/login` MUST show one generic message that is identical for a wrong password, a wrong email, and a non-existent account, and MUST take a comparable amount of time in each case so the outcome cannot be inferred.
- **FR-010**: Email matching at login MUST be case-insensitive and ignore surrounding whitespace.
- **FR-011**: A successful login MUST establish a session that persists across page reloads and new tabs until logout or expiry.
- **FR-012**: Visiting `/admin/login` with a valid session MUST redirect to `/admin` without showing the form.
- **FR-013**: A logout control MUST end the session and return the admin to `/admin/login`; a later visit to `/admin` MUST require login again.
- **FR-014**: When the data store cannot be reached during login, the page MUST show a generic "service unavailable" message with no technical details.

**Protected admin area**

- **FR-015**: Every `/admin` page except `/admin/login` MUST redirect visitors without a valid session to `/admin/login`.
- **FR-016**: After a redirect-to-login, a successful login MUST return the admin to the originally requested admin page; a return destination that is not an admin page on this site MUST be ignored in favour of `/admin`.
- **FR-017**: Every admin data request MUST verify the session on the server and refuse requests without a valid session as unauthorized, returning no admin data, independent of any page-level redirect.
- **FR-018**: An expired session MUST behave identically to no session for both pages and data requests.
- **FR-019**: Sessions MUST expire after 7 days of inactivity, with each admin visit extending the window (rolling expiry), and MUST be invalidated immediately on logout.

**Admin layout**

- **FR-020**: Admin pages MUST use their own layout that does not include the public site header or footer.
- **FR-021**: The admin layout MUST include a sidebar with exactly these entries in this order: Overview, News, Messages, Signups, Settings, each linking to its section, with the current section visibly marked active.
- **FR-022**: The admin layout MUST include a top bar showing the logged-in admin's email and a logout control.
- **FR-023**: At 375px and 768px the sidebar MUST be hidden behind a menu button that reveals the same entries; at 1024px and 1440px the sidebar MUST be visible without a menu button.
- **FR-024**: Overview, News, Messages, Signups, and Settings MUST each exist as a placeholder page showing the section title, to be replaced by features 003, 004, 007, and 010.
- **FR-025**: All admin visual values (colors, fonts, spacing) MUST come from `research/design-tokens.md` through named tokens, per Constitution Principle V; missing values are added to the token file first.
- **FR-026**: Every admin page MUST be marked as not to be indexed by search engines, and no public page MUST link to any admin page.

**Login abuse protection**

- **FR-027**: Failed login attempts MUST be counted on two independent keys: per source address (5 failures within 15 minutes) and per account (20 failures within 15 minutes from any sources). Reaching either threshold MUST refuse further attempts on that key with a clear "too many attempts, try again later" message for 15 minutes, regardless of whether the submitted credentials are correct.
- **FR-028**: Both block states MUST survive a server restart and expire at their original times.
- **FR-029**: A successful login MUST clear the failed-attempt counts for both the source and the account.

**Shared building blocks**

- **FR-030**: The system MUST provide a soft-delete capability: deleted records carry a deletion marker, are excluded from normal listings and lookups by default, and can be restored with their data intact.
- **FR-031**: The system MUST provide reusable public-form protection consisting of (a) per-source rate limiting that refuses excess submissions within a window with a clear "too many requests" outcome and (b) a hidden spam-trap field whose presence causes silent rejection without storage.
- **FR-032**: The system MUST expose a health check that reports only "healthy" or "unavailable" based on data-store reachability and never includes connection details, error text, versions, or credentials.
- **FR-033**: The application MUST fail early at startup with a clear message naming any missing required configuration value, and MUST never fall back to a built-in default credential or connection.

**Security event logging**

- **FR-034**: The system MUST write each of these events to the application log with a timestamp, the event type, the source address, and the outcome: failed login, block triggered, successful login, logout, and password reset via the setup command. Log entries MUST never contain a password or session identifier. No stored audit table and no admin screen are part of this feature.

### Key Entities

- **Admin**: The single staff account. Attributes: email (unique, stored normalised), password (stored only in non-readable form), created and last-updated times. Exactly one exists.
- **Session**: A logged-in admin's authenticated state. Attributes: the admin it belongs to, creation time, expiry time. Ends on logout, expiry, or a password reset.
- **Login attempt record**: A count of recent failed logins and any active block, keyed either by the attempting source address or by the account email (two independent records). Persists across restarts. Cleared on successful login or when the window elapses.
- **Soft-deletable record (pattern)**: Any record type adopting a deletion marker (deleted-at time). Later features (news, messages, signups) apply this pattern; this feature establishes and tests it.

## Deviations from the Reference

- The admin area has no das.edu.pk counterpart, so Constitution Principle I (exact reproduction of the reference) does not apply to it. The admin area uses the site's brand colors and fonts from `research/design-tokens.md` in a clean, standard dashboard layout. This is not a deviation from the constitution; it is the absence of a reference, and Principle V (tokens only) still applies in full.

## Assumptions

- **Session lifetime**: confirmed in Clarifications — rolling 7-day idle expiry, each visit extends it; no absolute cap this phase.
- **Login block thresholds**: confirmed in Clarifications — per source address 5 failures / 15 min, per account 20 failures / 15 min, either triggers a 15-minute block. The per-account threshold is deliberately looser so an abuser rotating addresses is still stopped, while the worst they can inflict on the real admin is a 15-minute delay.
- **Public form rate limit**: 5 submissions per source per 10 minutes, applied by later features that adopt the protection. Thresholds are adjustable per form.
- **Health check exposure**: the health check is reachable without login (it exposes nothing) so that hosting can monitor the site.
- **Return destination**: only paths within `/admin` on this site are honoured as a post-login destination.
- **Restore surface**: this feature provides the soft-delete and restore capability and tests it; no admin screen for restoring records is part of this feature.
- **Placeholder pages**: each shows its section title and a short "coming soon" note; no functionality.
- **Password recovery**: per PRD §6.1 and §11 Q7, there is no email-based reset this phase; the setup command's reset option is the sole recovery path and requires access to the deployment configuration.
- **Password rules**: only the 12-character minimum is enforced; no composition rules, since length is the more effective control and the account is not self-served.

## Out of Scope

- Password reset by email, multiple admin accounts, roles or permissions.
- News, messages, signups, and settings functionality (features 003, 004, 007, 010).
- Admin overview counts (feature 010).
- Any admin UI for restoring soft-deleted records.
- A stored audit trail or admin screen for security events (server log only this phase).
- Any public-facing form; this feature only provides the protection later forms will use.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin with the correct credentials can go from opening `/admin/login` to seeing `/admin` in under 10 seconds on first attempt, with no additional steps.
- **SC-002**: 100% of admin pages and admin data requests refuse access without a valid session; a scan of every admin route without a session yields zero successful responses.
- **SC-003**: The setup command run 10 times in a row, including concurrently, leaves exactly one admin account.
- **SC-004**: The failure message for a wrong password, a wrong email, and a non-existent account is byte-for-byte identical, and the response times differ by no more than a margin that cannot distinguish the cases in practice.
- **SC-005**: After either block threshold (5 per source, 20 per account) is reached, 100% of further attempts on that key within the window, including with the correct password, are refused with the "too many attempts" message; the block persists across a server restart.
- **SC-006**: The admin layout renders correctly, with sidebar or menu button as specified, at 375, 768, 1024, and 1440px with no horizontal scrolling and every sidebar link reachable.
- **SC-007**: End-to-end tests cover login, logout, wrong credentials, logged-out redirect with return, and blocked-after-repeated-failures, and all pass.
- **SC-008**: The soft-delete, form-protection, and health-check building blocks each have passing tests demonstrating the behaviours in User Story 6, so features 003–007 can adopt them without additional foundation work.
- **SC-009**: With the data store unreachable, the login page and health check return only generic messages; a review of their responses finds zero technical details (host names, connection strings, error text, stack traces).
- **SC-010**: Starting the application or the setup command with a required configuration value missing fails within seconds with a message naming that exact value.
