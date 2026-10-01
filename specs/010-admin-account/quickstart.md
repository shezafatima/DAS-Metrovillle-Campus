# Quickstart: Admin Account (010)

## Prerequisites

- `.env.local` with `MONGODB_URI`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (as in 002).
- An admin account seeded once, manually: `npm run seed:admin`.

## Try it

1. `npm run dev` and log in at `/admin/login`.
2. Click the round initial button left of the bell → **Account**.
3. Enter the current password and a new password (12 or more characters) twice → **Change password**. You see a confirmation, and "Password last changed" updates.
4. Open a second browser (or a private window) that was logged in before step 3. Its next click goes to the login page.
5. Log out through the profile menu → **Logout**. The old password is rejected and the new one works.
6. Log in on two browsers, then on one choose **Sign out other devices** → confirm. The other browser is signed out, and the password is unchanged.

## Forgot the password?

The recovery path is unchanged and manual only:

```bash
ADMIN_PASSWORD='<new 12+ char password>' npm run seed:admin -- --reset
```

This ends every session. It must never be added to build, deploy, postinstall or
startup scripts (Constitution IV).

## Run the tests

Run these **one after another**, never in parallel with `npm run build`:

```bash
# Unit + DB-backed (DB suites need MONGODB_URI; with-test-env.sh loads .env.local)
bash scripts/with-test-env.sh npx vitest run \
  src/lib/validation/account src/lib/password-change-lockout src/lib/account src/lib/dal \
  "src/app/admin/(dashboard)/account" src/components/admin/account src/components/admin/profile-menu

# E2E (serial "admin" project). On a slow disk, start the dev server first
# (npm run dev -- --port 3100 with the playwright.config.ts webServer env) —
# Playwright reuses it instead of timing out on the first compile.
npx playwright test e2e/admin-account-
npx playwright test e2e/admin-login-logout.spec.ts e2e/admin-layout.spec.ts   # logout/email moved to the profile menu
```

## Manual checks

- Password manager: on the Account page, the browser offers to fill the current password and to save the new one.
- Five wrong current passwords → "Too many attempts". Log out and back in → still blocked. Login itself still works.
- DevTools → Network: no Server Action response contains any password you typed.
