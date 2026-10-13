# Quickstart: Resources Page (019)

## Run and look

```bash
npm run dev                     # then open http://localhost:3000/resources#mobile-apps
```

Check at 375, 768, 1024 and 1440 px:

- **Intro**: the heading and text sit beside the flyer from 768 px up, and stack below that. The flyer is whole, never cropped.
- **Grid**: 1, 2 or 4 columns, with equal card heights in a row.
- **Scarlet English**: shows "Download for Android" and the outside-the-Play-Store note.
- **Math, Urdu and LMS App**: each shows "Not available at the moment" and no button.
- **Menu**: the Resources menu (desktop dropdown and mobile group) lists Photo Gallery, then Mobile Apps. Each lands with its heading clear of the header.

The Photo Gallery section shows only when an album has photos (007). Add one in Admin → Settings → Gallery to see both sections.

## Tests

Never run `npm run build` and Playwright at the same time (project memory). Run them in sequence.

```bash
npm test -- src/lib/resources src/content/resources src/components/resources src/components/about
npx playwright test e2e/resources.spec.ts e2e/page-sections.spec.ts --project=chromium
npx playwright test e2e/admin-resources-gallery.spec.ts e2e/admin-gallery-public.spec.ts --project=admin
npm run lint && npx tsc --noEmit
```

Admin E2E tests already fail on unchanged code (project memory). Compare the failure sets before and after this change. Don't expect zero failures.

## Common content edits

| Change | Where | Notes |
|---|---|---|
| The client supplies a working link for an app | `apps[].url` in `src/content/resources/mobile-apps.ts` | Set `linkType` to match (`play-store`, `app-store` or `direct-download`). The button and its wording appear automatically. Update `referenceLinks` and the review notes, and tick the item in `docs/content-source/resources/client-review.md`. |
| A link stops working | Set its `url` to `""` | The card switches to "Not available at the moment". |
| The client approves a text fix (R1 or R2) | `heading` / `body` **and** `docs/content-source/resources/mobile-apps.txt` | Change both together, or `fidelity.test.ts` fails. |
| The client approves or rewords the notes or button labels | `mobileAppsCopy` in the same file | Remove the `PENDING CLIENT APPROVAL` comment once approved. |
| Replace the flyer | `image` (path, width, height) and `imageAlt` | Keep it local or on Cloudinary. Never link to das.edu.pk. |
| Change an icon | `apps[].icon` | Choose one of `APP_ICON_KEYS`. Adding a new key means adding it to the enum and to the component's icon map. |

## Owner review screenshots

After implementation, save `specs/019-resources/screenshots/mobile-apps-{375,768,1024,1440}.png` for the owner and client.
