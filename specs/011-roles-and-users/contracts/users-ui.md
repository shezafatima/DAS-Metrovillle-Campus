> **Revised 2026-09-30 (owner decision: the main admin controls every password; Constitution III amended, v2.0.0).**
> There is no forced first-login password change, no temporary-password state, no 7-day expiry and no `/admin/set-password` page. A content manager cannot change any password; only a main admin can, and a main admin changes their own on the Account page. Anything below that says otherwise is superseded.

# Contract: Users, panel and change record UI

Revised 2026-09-29 for the right-hand panel and the shared password input.

All screens follow the existing admin patterns: `admin-list` pagination (20 per page), table styles, the AlertDialog confirmation pattern, and the form field and message styles from 010. They must work at 375, 768, 1024 and 1440px with no horizontal page scroll (FR-035).

## `PasswordInput` (`src/components/ui/password-input.tsx`, FR-039)

The one password field for the whole admin. Used by: login, the Account page (current, new, confirm; main admin only) and the user panel.

- A plain `<input>` (so `name`, `autoComplete`, `value`, `onChange`, `ref`, pasting and password-manager autofill work as before) plus an eye button.
- **Hidden by default** (`type="password"`). The eye toggles `type` between `password` and `text`.
- The eye is a real `<button type="button">`: reached by Tab, activated by Enter/Space, `aria-pressed`, and an accessible name that says what it will do ("Show password" / "Hide password"; overridable).
- **Returns to hidden** when its form is submitted or reset, and when it unmounts (a closing panel).
- `revealNonce` (number): bumping it reveals the value and never hides it. The panel's Generate button uses it.

## `/admin/users` (main admin)

- Heading **Users**, an **Add user** button, and a link to **Change record** (`/admin/users/activity`).
- **Table (≥1280px)**: Email · Role · Sections · Status · Last login · Actions.
- **Stacked cards (<1280px)**: the same fields as label/value rows, with actions in a row at the bottom.
- **Sections**: a comma list of granted labels, "All" for a main admin, or "None".
- **Status** badges: Active · Disabled.
- **Last login**: admin date-time format, or "Never".
- **Row actions**: Edit · Disable/Enable · Delete. Password reset is in the Edit panel.
  - The **own row** shows none of Edit, Disable or Delete, is marked "(you)", and links to the Account page for the password (FR-026).
  - The only-remaining-main-admin row still shows the controls; the server refuses and shows "At least one main admin must remain."

## The right-hand panel (FR-036 to FR-038)

`src/components/ui/sheet.tsx` (a Base UI dialog styled as a side sheet) + `src/components/admin/users/user-panel.tsx`.

- Slides in from the right edge over the list, with a dimmed backdrop. The Users page stays where it is behind it; the URL does not change.
- **Width**: full width below 640px; a fixed `max-w-md` panel from 640px, full height, scrolling inside if it is taller than the screen.
- **Title**: "Add user" or "Edit user", with a one-line intro.
- **Fields** (in this order):
  1. **Email**: an input when adding, read-only text when editing.
  2. **Role**: radios, Content manager (default) / Main admin.
  3. **Sections**: one checkbox per grantable key (News, Messages, Careers (Signups), Settings, Page content). **Rendered only while Content manager is chosen.** Registrations and Users never appear (FR-004).
  4. **Password**: a `PasswordInput` with a **Generate** button beside it. Label "Password" when adding (required); "New password (optional)" when editing, with the hint "Leave empty to keep their current password. A new one ends all their sessions." Hint when adding: at least 12 characters, temporary, the user must choose their own at first login.
- **Generate**: fills a 20-character password (`generateTemporaryPassword`, Web Crypto, rejection sampling) and reveals it so it can be read out.
- **Validation**: the password is checked with `adminSetPasswordSchema` before anything is sent (required when adding; only when filled when editing). Server field errors show under the field they belong to; other errors show as one alert.
- **Buttons**: Cancel, and Add user / Save (disabled while pending).
- **Saving** closes the panel, shows a toast, and refreshes the list, so the user is there at once.
- **Closing** (Escape, a click outside, the X, Cancel): if anything has been typed or changed (an email, a password, a role change, a different set of sections), `window.confirm("You have unsaved changes. Close without saving?")` decides; "no" leaves the panel exactly as it was. With nothing changed it closes at once. Closing after a save never asks.
- The form is mounted only while the panel is open, so every opening starts clean and a password can never linger in state.

## `/admin/users/activity` (change record)

- Newest first, 20 per page.
- Columns: When · By · User · Change. On narrow widths each entry is a stacked card.
- Change text examples: "Account created (Content manager: News, Messages)", "Sections: added Messages; removed News", "Role: Content manager → Main admin", "Disabled", "Enabled", "Temporary password issued", "Deleted", "Set their password".

## `/admin/account`

- **Main admin**: email, the change-password form (three `PasswordInput` fields: current, new, confirm), password last changed, Sign out other devices.
- **Content manager**: email, a note "Your password is managed by the main admin. If you need it changed, ask them." (no change-password form; the server refuses the action anyway), and Sign out other devices.

## Overview and shell

- `?denied=1` shows a notice: "You don't have access to that section." with a Dismiss link.
- Cards and nav items appear only where `canAccess` allows. **Users** is in the nav for main admins.
- A content manager with no grants sees "No sections have been granted to you yet. Ask the main admin if you need access."
