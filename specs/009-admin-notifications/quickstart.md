# Quickstart: Admin Notifications (009)

How to run and verify the feature locally. Assumes 002 (foundation),
004 (signups) and 008 (messages) are set up.

## 1. Configure

Nothing new — no environment variable, dependency or service (research
§10). The `adminNotificationStates` collection is created by Mongoose
on first use.

## 2. Run

```bash
npm run dev
```

Log in at `http://localhost:3000/admin/login`, then any admin page
(`http://localhost:3000/admin`, `/admin/messages`, `/admin/signups`).

## 3. Verify by hand (mirrors the E2E specs)

1. With no messages or signups, every admin page: no bell badge, no
   sidebar badges, plain page titles. Open the bell → "You're all
   caught up — nothing new."
2. Submit a contact message at `/contact` and a signup at `/` (or
   `/resources`) from another tab. Within about a minute (or refresh),
   the bell shows **2**, Messages and Signups sidebar items each show
   **1**, and the browser tab title gains a `(2)` prefix.
3. Open the bell: both items listed, newest first, each with a name, a
   short description (subject / email), a relative time ("just now" /
   "X minutes ago"), and a "New" mark.
4. Choose the message item → lands on its detail page, panel closed,
   message now Read; bell/sidebar drop to **1** immediately (no wait
   for the timer).
5. Open the bell again, choose the signup item → lands on
   `/admin/signups`; the Signups sidebar badge clears immediately (the
   page's own "opened" marker fires); bell drops to **0**.
6. Repeat step 2's signup submission (same email, so it's a repeat
   submission per 004) → it counts as new again even though it was
   already "seen" — Signups badge and bell show **1** again.
7. Open the bell, choose "Mark all as read" → bell, both sidebar
   badges and the page title prefix all clear; the panel shows the
   empty state without closing.
8. Delete the message from its detail page in one tab; in another tab
   that still has an old bell panel open, wait for the next refresh
   (or trigger one) — the deleted item disappears from the panel
   rather than leading anywhere broken if clicked in the meantime.
9. Seed 15 new signups and 5 new messages → the bell panel shows
   exactly the 10 most recent across both, with working "see all
   messages" / "see all signups" links; the sidebar/bell counts still
   show the true totals (not capped at 10).
10. Seed 100+ new messages → every count shown (bell, sidebar,
    Overview) reads "99+".
11. `/admin` (Overview): the Messages and Signups cards' highlighted
    "new" counts match the sidebar at the same moment.
12. Collapse the sidebar to icons at 1024px+ → both badges remain
    visible on the icons. Resize to 375px → the bell panel opens full
    width, not a narrow dropdown.
13. Keyboard only: Tab to the bell, Enter/Space opens the panel with
    focus inside it; Tab moves through items and "Mark all as read";
    Escape closes and returns focus to the bell.
14. Log out and visit `/admin/login` → no bell, no sidebar (the page is
    outside the admin shell entirely).

## 4. Tests

```bash
npm test                                              # Vitest (DB suites skip without MONGODB_URI)
npx playwright test --project=admin -g "notifications"
```
