# Feature Specification: Admin Account

**Feature Branch**: `010-admin-account`  
**Created**: 2026-09-28  
**Status**: Draft  
**Input**: User description: "Feature Brief — 010 Admin Account. Lets the admin change their own password from inside the panel, instead of needing the setup script. The login email is fixed and can only be changed by running the setup script. No email or display name editing in this feature." (full brief recorded in `history/prompts/010-admin-account/`)

**References**: Feature 002 (login, sessions, setup command, lockout, security-event log); admin UI patterns from 002 and 009; decision from 002 that a password reset ends all existing sessions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Change password from the panel (Priority: P1)

The admin opens a profile control in the admin top bar (to the left of the
notification bell), which shows their initial. It opens a menu with their
email, an **Account** link and **Logout**. This menu replaces the current
logout control. On the Account page the admin enters their current password
and the new password twice. If everything checks out, they see a
confirmation, stay logged in on this device, and every other device is
signed out.

**Why this priority**: Today the only way to change the password is the
setup command, which needs access to the deployment. Letting the admin
rotate their own password is the core value of this feature.

**Independent Test**: Log in, open the profile menu, go to Account, change
the password, then confirm that login works with the new password and fails
with the old one. Also confirm that a second session opened before the
change is signed out, while the current one keeps working.

**Acceptance Scenarios**:

1. **Given** the admin is logged in, **When** they look at the admin top bar at any supported width, **Then** a profile control showing their initial appears immediately to the left of the notification bell.
2. **Given** the profile menu is closed, **When** the admin activates the profile control by mouse, touch, Enter or Space, **Then** a menu opens showing the admin's email, an Account link and a Logout item.
3. **Given** the profile menu is open, **When** the admin presses Escape, clicks outside it, or chooses an item, **Then** the menu closes. Focus returns to the profile control on Escape.
4. **Given** the profile menu is open, **When** the admin chooses Logout, **Then** the session ends and they land on the login page, exactly as the previous logout control behaved.
5. **Given** the profile menu is open, **When** the admin chooses Account, **Then** the Account page opens with empty password fields.
6. **Given** the Account page, **When** the admin submits the correct current password and a valid new password entered identically twice, **Then** the password is changed, a confirmation message appears, the fields are cleared, and the admin stays logged in on this device.
7. **Given** the admin is also logged in on a second device, **When** they change the password on the first device, **Then** the second device's next admin page or data request behaves as if it had no session.
8. **Given** the password was changed, **When** anyone logs in, **Then** the new password works and the old one fails with the standard generic login error.
9. **Given** the Account page, **When** the admin submits a wrong current password, **Then** a clear "current password is incorrect" error appears, the password is not changed, and no session is ended.
10. **Given** the Account page, **When** the two new-password entries differ, **Then** an error says they do not match and nothing changes.
11. **Given** the Account page, **When** the new password is shorter than 12 characters, **Then** an error states the 12-character minimum and nothing changes.
12. **Given** the Account page, **When** the new password is the same as the current one, **Then** an error says it must differ from the current password and nothing changes.
13. **Given** 5 wrong current-password submissions for the admin account within 15 minutes, **When** a further change attempt is made during the 15-minute block, **Then** it is refused with a "too many attempts, try again later" message in the same style as login, even if the current password is correct, and nothing changes.
14. **Given** the Account page's change-password check is blocked, **When** the admin logs out, logs back in (on the same or another device) and tries to change the password again within the 15-minute block, **Then** it is still refused with the "too many attempts" message and nothing changes.
15. **Given** the Account page's change-password check is blocked, **When** the admin (or anyone) logs in with the correct credentials, **Then** login is unaffected; and **given** login is blocked by failed logins, **When** a logged-in admin changes their password with the correct current password, **Then** the change is unaffected.

---

### User Story 2 - See password age and sign out other devices (Priority: P2)

On the Account page the admin can see when their password was last changed,
and can sign out every other device without changing the password. This
helps if they forgot to log out on a shared computer.

**Why this priority**: This is useful security hygiene, but the admin can
already get the same effect by changing the password (US1). It builds on the
same page.

**Independent Test**: Log in on two devices. On the first device, check that
the Account page shows the last-changed date, then choose "Sign out other
devices". Confirm that the second device is signed out, the first stays
logged in, and the password still works unchanged.

**Acceptance Scenarios**:

1. **Given** the admin opens the Account page, **When** it loads, **Then** it states when the password was last changed, as a readable date and time. A change made through the setup command counts as a change.
2. **Given** the admin has just changed the password (US1), **When** the confirmation appears, **Then** the last-changed date updates to the new time without a manual reload.
3. **Given** the admin is logged in on two devices, **When** they choose "Sign out other devices" on one and confirm, **Then** every other session ends, the current session remains valid, the password is unchanged, and a confirmation message appears.
4. **Given** there are no other sessions, **When** the admin chooses "Sign out other devices", **Then** the action succeeds harmlessly with the same confirmation.

---

### Edge Cases

- **Password handling**: password fields are never pre-filled. Password values are never written to logs, never included in any response, and never shown back to the browser, including in error messages or after a failed submit.
- **Password managers**: fields are labelled and typed so that password managers can fill the current password and offer to save the new one. The email is available to them as the account identifier.
- **Unsaved input**: if any password field holds text and the admin tries to leave the Account page (in-app navigation, reload, closing the tab), they are warned first. After a successful change the fields are cleared, so no warning appears.
- **Service unavailable, password not saved**: if the new password did not save, the old password stays valid, no session is ended, the admin stays logged in, and a "couldn't save, nothing was changed" message appears with the typed fields left in place.
- **Password saved, but signing out other devices failed**: the admin is told the password **was** changed, but other devices may still be signed in. The "Sign out other devices" action is offered right there. No failure message is shown and the fields are cleared, because the new password is now the real one.
- **Password saved, but this device was signed out in the process**: the admin is told the password was changed and that they need to log in again with the new one, with a link to the login page.
- **Unable to tell whether the password saved** (the service is still failing when it is checked): the admin is told the change could not be confirmed and asked to reload and check "Password last changed". It must never say "nothing was changed" unless that has been confirmed.
- **Sign out other devices fails**: this device stays logged in, a "couldn't sign out other devices, try again" message appears, and retrying is safe.
- **Double submit**: submitting twice quickly results in at most one password change. The submit control is disabled while a request is in progress.
- **Session expires while on the page**: the submit is refused as unauthorized and the admin is sent to login, which returns them to the Account page afterwards (per 002).
- **Password changed on another device while this page is open**: this device's session has ended, so its next submit behaves like the case above.
- **Leading or trailing spaces**: passwords are taken exactly as typed, with no trimming, which matches login behaviour.
- **Phones (375px)**: the profile control, bell and sidebar menu button all fit in the top bar without overlapping or wrapping. The profile menu stays fully on screen.
- **Forgotten password**: the setup command's reset option remains the recovery path and continues to work unchanged, including ending all sessions.
- **Lockout scope**: the Account page has its own failure counter, separate from login's. A block on one never blocks the other. A successful password change does not reset a block that is already active. The block belongs to the account rather than the session, so logging out and back in, or switching devices, does not clear it. Only the 15-minute window expiring does.

## Requirements *(mandatory)*

### Functional Requirements

**Profile control and menu**

- **FR-001**: The admin top bar MUST show a profile control immediately to the left of the notification bell on every admin page. It shows the first letter of the admin's email in upper case and has an accessible name such as "Account menu".
- **FR-002**: Activating the profile control MUST open a menu containing the admin's email (as text, not a link), an "Account" link to the Account page, and a "Logout" item.
- **FR-003**: The menu MUST be fully keyboard operable (open with Enter/Space, move between items with arrow keys, activate with Enter). It MUST close on Escape, on a click or tap outside it, and after an item is chosen.
- **FR-004**: The Logout item MUST behave exactly as the current logout control does (FR-013 of 002). The previous standalone logout control and email display in the sidebar footer MUST be removed, so there is a single logout location.

**Change password (P1)**

- **FR-005**: The system MUST provide an Account page inside the admin panel. It is protected like every other admin page (FR-015/FR-017 of 002) and shows the login email as read-only text.
- **FR-006**: The Account page MUST have a change-password form with three empty fields: current password, new password, and confirm new password.
- **FR-007**: The system MUST verify the current password on the server before making any change. A wrong current password MUST produce a specific "current password is incorrect" error and change nothing. This message is allowed to be specific because the requester is already authenticated.
- **FR-008**: The system MUST reject, with a specific message and no change: a new password shorter than 12 characters or longer than 128 characters; a new password identical to the current one; and a confirmation that does not match the new password. The server MUST enforce these rules even if the page's own checks are bypassed.
- **FR-009**: On success the system MUST replace the stored password, end every other session belonging to the admin, keep the requesting session valid, record the change time, and show a confirmation message.
- **FR-010**: Failed current-password attempts on the Account page MUST be tracked in a counter that is separate from login's and keyed to the admin account, not to the source address or the session. Logging out and back in, starting a new session on another device, or ending sessions (by password change or "Sign out other devices") MUST NOT clear or reset the counter or an active block. After 5 failures within 15 minutes, change attempts MUST be refused for 15 minutes, even with the correct password, using a "too many attempts, try again later" message in the same style as login. The block MUST persist across a server restart, as login's does (002). A successful password change clears a failure count that is still below the limit. It can never clear an active block, because a blocked attempt is refused before the password is checked.
- **FR-010a**: Failed logins MUST NOT count toward or trigger the Account page block, and failed Account page checks MUST NOT count toward or trigger any login block.
- **FR-011**: After an unexpected failure during a password change, the system MUST check whether the new password was actually saved and report only what is true:
  - (a) not saved: a failure message saying nothing was changed; no session is ended and the admin stays logged in.
  - (b) saved, but ending other sessions failed: a message that the password was changed but other devices may still be signed in, with the "Sign out other devices" action offered; no failure message.
  - (c) saved, and this device's session was lost: a message that the password was changed and they must log in again with the new password.
  - (d) the check itself fails: a message that the change could not be confirmed, never a claim that nothing changed.

**Session visibility (P2)**

- **FR-012**: The Account page MUST display the date and time the password was last changed. The value comes from the most recent change made through this page or through the setup command. For an account that has never been changed, it shows when the password was first set.
- **FR-013**: The Account page MUST provide a "Sign out other devices" action, with a confirmation step, that ends every session except the current one without changing the password, then shows a confirmation.

**Security and safety**

- **FR-014**: Every account-related data request (change password, sign out other devices, reading last-changed) MUST verify the session on the server and refuse unauthorized requests without revealing account data. Change-password and sign-out-others MUST only be accepted from the admin panel's own origin.
- **FR-015**: Passwords (current or new) MUST NOT appear in any response body, error message, redirect, URL, or log entry, and MUST NOT be sent back to fill form fields after a submit.
- **FR-016**: The following MUST be written to the application log in the same format as the security events in 002 (timestamp, event type, source address, outcome, with no password or session identifier): successful password change from the panel, failed current-password attempt, a block triggered from the Account page, and sign out of other devices.
- **FR-017**: The Account page MUST warn before the admin navigates away while any password field contains text.
- **FR-018**: The password fields MUST be set up so that browsers and password managers can autofill the current password and save the new one. Pasting MUST NOT be blocked.
- **FR-019**: The setup command MUST remain run-manually-only. This feature MUST NOT wire it into build, deploy, postinstall, or any startup path. Its reset option MUST keep working as the recovery path, and it MUST update the last-changed time.

**Layout**

- **FR-020**: The profile control, profile menu, and Account page MUST be usable without horizontal scrolling or overlapping controls at 375, 768, 1024 and 1440px widths, and MUST follow the existing admin UI patterns (typography, spacing, form field and message styles).

### Key Entities *(include if feature involves data)*

- **Admin** (from 002): exposes when the password was **last changed**. This comes from the stored password record and updates whenever the password is replaced from the panel or by the setup command (`npm run seed:admin -- --reset`). No new stored field is added. The email stays fixed in this feature.
- **Session** (from 002): unchanged in shape. A session can now also end because of a panel password change or "sign out other devices", but in both cases the session making the request survives.
- **Password-change failure record** (new): failed current-password checks for the admin account, each with its time, plus any active block and when it ends. It belongs to the admin account, not to any session. It is separate from 002's login failed-attempt records and never read by login.

## Assumptions

- "The admin's initial" means the first character of the login email, upper-cased. There is no display name or photo this phase.
- The confirmation message is inline on the Account page, consistent with the existing admin success-message pattern.
- The rest of 002's password policy applies: length is the only strength rule (at least 12 characters), with no composition rules and no maximum below a generous limit.
- Sign out other devices asks for confirmation because it is disruptive. Changing the password does not add a separate confirmation step, since typing the current password already confirms intent.
- The Account page is reached from the profile menu only. No sidebar navigation item is added.
- The E2E suite stays small: roughly one journey per user story, plus focused checks on unauthorized access, absence of passwords in responses and logs, and the four layout widths.

## Constitution Exceptions

- **Principle XI (three-case access matrix)**:
  - **The rule:** every admin route needs tests for no session, wrong role and correct role.
  - **What this feature tests:** only **no session** and **correct session**. Roles do not exist yet; they arrive in 011-roles-and-users.
  - **Why nothing is exposed:** the account actions are self-service, taking the target account from the session and accepting no user id.
  - **Where the third case lives:** the wrong-role case is recorded as a required acceptance criterion in `docs/briefs/011-roles-and-users.md` ("Carried over from 010").
  - **Approval:** approved by the project owner on 2026-09-28. This exception expires when 011 is done.

## Out of Scope

- Changing the login email or display name (setup command only).
- Password reset by email (there is no email service this phase).
- Two-factor authentication.
- Multiple admin accounts, roles or invitations.
- Profile photos or avatars beyond the initial.
- A list of individual active sessions or devices.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The admin can change their password from the panel, from opening the profile menu to seeing the confirmation, in under 1 minute, without using the setup command.
- **SC-002**: After a successful change, the old password fails and the new one succeeds on 100% of login attempts, and 100% of other sessions are signed out by their next request, while the current session continues uninterrupted.
- **SC-003**: 100% of invalid submissions (wrong current password, mismatch, under 12 characters, same as current) leave the password and all sessions unchanged.
- **SC-004**: 100% of account-related requests made without a valid session are refused and return no account data.
- **SC-005**: A search of all responses and log output captured during the test run finds zero occurrences of any password used in the tests.
- **SC-006**: After 5 failed current-password checks within 15 minutes, 100% of further change attempts in the block window are refused, including ones with the correct current password and ones made from a fresh session after logging out and back in. Meanwhile, login with correct credentials succeeds on 100% of attempts, and the reverse holds when login is the one blocked.
- **SC-007**: At 375, 768, 1024 and 1440px, the profile control, profile menu and Account page show no overlap, clipping or horizontal scroll, and the menu can be fully operated by keyboard alone.
- **SC-008**: Logout from the profile menu ends the session and returns the admin to the login page on 100% of attempts.
