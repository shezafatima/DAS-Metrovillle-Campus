# Contract: Profile menu and Account page UI (010)

## Top bar layout

```text
[☰ trigger] | [Page title……(truncates)]            [ S ] [🔔]
                                                     ^profile ^bell (009)
```

- `AdminTopBar` receives `email` from `AdminShell`. The right cluster is `<div className="flex items-center gap-1"><ProfileMenu email={email} /><NotificationBell /></div>`.
- At 375px: the title truncates (`min-w-0 truncate`, existing). The profile and bell buttons (each `size-9`) never wrap or overlap the sidebar trigger.

## `ProfileMenu` (`src/components/admin/profile-menu.tsx`, client)

Built on the new `src/components/ui/dropdown-menu.tsx` (a wrapper around `@base-ui/react/menu`).

| Part | Spec |
|---|---|
| Trigger | A round `size-9` button showing `email.charAt(0).toUpperCase()`, `aria-label="Account menu"`, token colours only. `aria-haspopup="menu"` and `aria-expanded` come from Base UI. |
| Popup | Aligned to the trigger's end, `min-w-56`, max width `calc(100vw-2rem)`, and it never overflows the viewport at 375px. |
| Email | A group label (not focusable, not an item). `truncate`, with the full address in `title`. |
| Separator | — |
| "Account" | A menu item rendered as `<Link href="/admin/account">`, with the `UserRound` icon. |
| "Logout" | A menu item that submits a `<form action={logout}>` (the existing 002 action), with the `LogOut` icon and `data-leaves-page`. |

Behaviour (FR-003):
- Opens with click/tap, Enter, Space or ArrowDown. Focus then moves to the first item.
- ArrowUp and ArrowDown move between items. Home and End jump to the first and last. Enter activates the focused item.
- Escape closes the menu and returns focus to the trigger.
- The menu closes on outside click or tap, and after any item is chosen.
- The "Account" item is marked current (`aria-current="page"`) when the admin is on `/admin/account`.

Removed: `src/components/admin/admin-sidebar-footer.tsx` and its use in `app-sidebar.tsx`. The sidebar no longer shows the email or a logout control.

## Account page (`src/app/admin/(dashboard)/account/page.tsx`)

It is composed of section components (Constitution IX):

1. **`AccountSummary`** (server): shows the "Signed in as" email, read-only.
2. **`ChangePasswordForm`** (client), inside a `Card`:
   - Hidden autofill field: `<input type="email" name="username" autoComplete="username" value={email} readOnly hidden-visually>`.
   - `currentPassword`: `type="password"`, `autoComplete="current-password"`, `required`.
   - `newPassword`: `type="password"`, `autoComplete="new-password"`, `required`, `minLength={12}`, with helper text "At least 12 characters."
   - `confirmPassword`: `type="password"`, `autoComplete="new-password"`, `required`.
   - All three inputs are controlled and start as `""`. They are never set from server data.
   - Client-side pre-checks use the same zod schema (`src/lib/validation/account.ts`) for instant field messages. The server check is still authoritative.
   - The error message uses `role="alert"`. The success message uses `role="status"` and replaces the error.
   - The submit button, "Change password", is disabled while `pending`.
   - Dirty means any field is non-empty. `useUnsavedChanges(dirty, accountCopy.unsavedPrompt)` is active while dirty.
   - After each result:
     - `success`: clear all fields, show confirmation, and pass `passwordChangedAt` up to update the last-changed text.
     - `wrong_current`: clear the current field and focus it.
     - `changed_others_remain`: clear all fields and update last-changed. Show the "changed, but other devices may still be signed in" status with an inline **Sign out other devices** button, which opens the same confirm dialog as `SignOutOthersCard`. No error styling.
     - `changed_signed_out`: clear all fields and show the "changed, log in again" status with a Log in link. Do not auto-redirect, so the message stays readable.
     - `unconfirmed`: clear all fields, because the password may now be the new one, and show the "couldn't confirm" message.
     - `unauthorized`: `router.replace("/admin/login?next=/admin/account")`.
     - Anything else: keep the values.
3. **`SignOutOthersCard`** (client), inside a `Card`:
   - "Password last changed: {formatted date and time}" (from the server prop, updated live after a change).
   - A "Sign out other devices" button opens an `alert-dialog` with the body "Every other device will be signed out. This device stays signed in." and the actions Cancel / Sign out.
   - The result message uses `role="status"`.

Layout:
- Single column, `max-w-xl`, admin page padding tokens.
- At 375px the cards are full width with no horizontal scroll. At 1024px and 1440px the column stays at `max-w-xl`, left-aligned with the other admin pages.

## Copy

Everything goes in `src/content/admin.ts` as `accountCopy` (and a non-nav title
map `adminExtraPageTitles`). Components hold no hardcoded strings (Constitution IX).
