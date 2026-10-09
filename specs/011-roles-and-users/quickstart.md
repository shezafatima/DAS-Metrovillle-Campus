# Quickstart: Roles & Users (011)

## Setup after pulling 011

1. `npm install`. No new packages.
2. `npm run seed:admin`. It prints `Admin role confirmed: <ADMIN_EMAIL>` for an existing account, or `Admin created` for a new one.
   **This is required once.** Until you run it, the existing account is a content manager with no grants (research §13).
3. Start the dev server first (`npm run dev`), and wait for it to be ready before starting Playwright. See the admin E2E baseline note.

## Manual walkthrough

1. Log in as the seeded main admin. The sidebar shows Overview, News, Messages, Signups, Settings and **Users**.
2. Go to **Users**, then **Add user**. A panel slides in from the right over the list:
   - enter email `cm@example.test`, keep Content manager and tick **News**. (Choose Main admin and the ticks disappear.)
   - the password is hidden. Click **Generate** to fill and reveal one, or type your own (12+ characters). Use the eye to show or hide it.
   - press Escape (or click outside): because something is typed it asks first; say no to stay.
   - click **Add user**. The panel closes and `cm@example.test` is in the list at once, "Active".
   - reload the page and check the password is not shown anywhere.
3. In a private window, log in as `cm@example.test` with the password you set (the login field has the same eye toggle). You go straight to the overview, which shows Overview and News only. There is no "set your password" step.
   - Open the profile menu, then **Account**: it shows a note that the main admin manages your password, and no change-password form.
4. As the content manager, open `/admin/messages`. You are redirected to the overview with "You don't have access to that section."
   - `curl` (with that session cookie) to `GET /api/admin/signups/export` returns **403** `{"error":"forbidden"}`.
5. As the main admin, click **Edit** on `cm@example.test`, tick **Messages** in the panel, and **Save**. In the content manager's window, reload `/admin/messages`. It now opens, with no re-login.
6. As the main admin, **Disable** the content manager. Their next click or reload goes to the login page, and logging in again shows the generic failure. **Enable** brings them back. To reset their password, **Edit**, fill the password field (or Generate), **Save**: their sessions end and the new password is temporary.
7. Open **Users → Change record**. You see created, permissions changed and disabled entries, newest first, and no password anywhere.
8. On your own row there is no Edit, Disable or Delete control (only a link to the Account page). With only one main admin left, demoting or disabling them is refused with "At least one main admin must remain."
9. On a phone-width window (375px) the Add user panel opens at full width and the list is stacked cards.

## Tests

```bash
npm test                                          # unit and DB-backed suites (needs MONGODB_URI for DB suites)
npx vitest run src/lib/dal.test.ts src/lib/permissions.test.ts src/test/access-inventory.test.ts
npm run test:e2e -- e2e/admin-roles-*.spec.ts     # serial admin project; dev server already running with MONGODB_DB_NAME=dar_e_arqam_test
```

Never run `npm run build` and Playwright at the same time.

## Recovery

If every main admin is locked out, run `npm run seed:admin -- --reset`. It resets the ADMIN_EMAIL account's password, sets `role: main_admin`, clears `mustChangePassword`, and ends its sessions.
