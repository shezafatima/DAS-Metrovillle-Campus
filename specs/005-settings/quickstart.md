# Quickstart: verifying Settings (005)

Prerequisites: `MONGODB_URI` set; an admin seeded (`npm run seed:admin`); for uploads in tests, `NEWS_COVER_VERIFY=skip` (non-production) or real Cloudinary env vars. Never run `npm run build` and Playwright at the same time.

## 1. Nothing changes on release (US2 scenario 1, SC-001)

1. Start the app with an empty `settings` collection.
2. Open `/`, `/contact`: the top bar and footer social icons (Facebook, YouTube, Instagram, TikTok), the Contact page phone, email, address, hours and map link equal the pre-005 values.
3. Automated: `src/lib/settings/defaults.test.ts` asserts `defaultsFor(contactDefinition)` deep-equals `contactInfo`; `e2e/admin-settings-contact.spec.ts` first test compares the rendered values.

## 2. Edit contact details (US2)

1. Sign in as main admin → **Settings → Contact & social**.
2. Change the phone; clear the TikTok link; **Save**.
3. Success toast. Reload the public site: the new phone on `/contact`, no TikTok icon in the top bar or footer (within one minute; immediately for a normal request after the save's tag revalidation).
4. Enter `not-an-email` → field error, nothing saved, other typed values remain.

## 3. Hero slides (US3)

1. **Settings → Hero slides**: one placeholder slide exists.
2. **Add slide** (panel opens from the right): upload a desktop image, add alt text → Add. Add a second slide.
3. Move the second slide up (up button), hide the first, **Save**. Reload: order and hidden state persisted.
4. Try to hide the only visible slide: control disabled with "At least one visible slide is required". Send a crafted save with none visible: refused with the same message.
5. Delete a slide → confirm dialog → Save → it disappears; the document still holds it with `deletedAt`.

## 4. Stats, video (US4, US5)

- Stats: `-5`, `2.5`, `abc`, empty, `100000001` → each refused with "whole numbers from 0 to 100,000,000".
- Video: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` accepted; `https://vimeo.com/1` refused "Enter a YouTube video address"; clear + save stores `""`.

## 5. Gallery (US6)

Select 3 valid images plus one 6 MB file and one `.gif`: the three upload with progress, the other two are listed with "Images must be JPG, PNG or WebP, up to 5 MB." Add a caption, move an image up, delete one (confirm), Save, reload.

## 6. Access (US1)

As a content manager without `settings`: open `/admin/settings/hero` → redirected to `/admin` with the no-access message; `POST /api/admin/settings/uploads/sign` → 403; the Server Action returns `forbidden`. Signed out: login redirect / 401.

## 7. Saving and conflicts (US7)

1. Open the same group in two browsers as two admins. Save in the first. Save in the second: "This group was changed by someone else. Reload to see their changes." and the second admin's edits are still on screen.
2. Edit a field and click a sidebar link or reload: the browser warns; with no changes it does not.
3. Stop MongoDB (or set a wrong `MONGODB_URI` for the public server only): `/` and `/contact` still render using the last read (or defaults) — no error page.

## Test commands

```
npm test -- src/lib/settings src/app/admin/\(dashboard\)/settings src/app/api/admin/settings src/test/access-inventory.test.ts src/app/api/admin/access-matrix.test.ts
npx playwright test e2e/admin-settings-*.spec.ts --project=admin
```

E2E files (admin project, serial): `admin-settings-access`, `admin-settings-contact`, `admin-settings-hero`, `admin-settings-stats-video`, `admin-settings-gallery`, `admin-settings-uploads` (oversized and wrong-type rejected), `admin-settings-saving` (conflict, unsaved-changes warning, unreadable-settings render).
