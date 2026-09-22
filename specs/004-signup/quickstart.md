# Quickstart: Signup (004)

How to run and verify the signup feature locally. Assumes the 002
foundation is set up (`specs/002-foundation/quickstart.md`): Atlas
reachable, admin seeded.

## 1. Configure

Nothing new. No environment variable, dependency or external service is
added by this feature (research §13). The `signups` collection and its
indexes are created by Mongoose on first use.

## 2. Tokens first (once, before building the public UI)

```bash
npx tsx research/extract-signup-tokens.ts
```

Writes `research/tokens/signup-{375,768,1024,1440}.json`. Copy the
values into `research/design-tokens.md` ("Signup band" section) and
`src/app/globals.css` `@theme` as the `--*-signup-*` tokens named in
`contracts/signup-section.md`. If the live site's band differs from
`screenshots/das.edu.pk_.png`, stop and flag it (Constitution I) rather
than picking one.

## 3. Run

```bash
npm run dev
```

- Public: `http://localhost:3000/` — the signup band sits under the
  Home placeholder text.
- Admin: `http://localhost:3000/admin/signups` (log in first);
  `http://localhost:3000/admin` shows the Signups count.

## 4. Verify by hand (mirrors the E2E specs)

1. On `/`, submit with all fields empty → three "required" messages,
   nothing saved. Enter `ali@example`, `12345` → email and phone
   messages.
2. Enter "Ali Khan", `Ali@Example.COM`, `0300-1234567` → thank-you
   replaces the form. `/admin/signups` shows one row: `ali@example.com`,
   `03001234567`, page "Home", first = latest.
3. Click "Sign up someone else"; submit ` ALI@example.com `, "Ali Ahmed
   Khan", `+92 300 1234567` → same thank-you. Admin still shows **one**
   row, name updated, latest advanced, first unchanged.
4. Search "0300 123" → the row is found; search "ahmed" → found;
   filter "Resources" → empty state (only Home so far).
5. Delete → confirm → row gone, toast. Sign up again with the same
   email → the row is back with its original first date.
6. Submit six times quickly → the sixth shows "Please try again
   shortly" and keeps the typed values.
7. Export → `signups-<date>.csv` opens in Excel with an Urdu name (add
   one via the form: name `علی خان`) shown correctly.
8. Resize to 375 / 768 / 1024 / 1440 → single column / row + button
   below / row / row; no horizontal scroll.

## 5. Tests

```bash
npm test                                   # Vitest: unit + DB suites (DB suites skip without MONGODB_URI)
npm run test:e2e -- --project=forms        # signup public + visual specs (serial, clears throttle)
npm run test:e2e -- --project=admin        # admin signups list / delete-restore / export / overview
```

`e2e/global-setup.ts` wipes `signups` along with the other test
collections before the suite.
