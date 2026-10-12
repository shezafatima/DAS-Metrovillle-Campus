# Quickstart: 017-about

## Run and look

```bash
npm run dev          # http://localhost:3000/about
```

- In development, the Our Management Team section shows 3 labelled placeholder cards.
- To see the production behaviour locally, run `npm run build && npm start`. The team section and its menu entry disappear while `members` is empty.
- Never run the build and Playwright at the same time (project memory).

## Tests

```bash
npx vitest run src/lib/about src/content/about src/components/about src/content/site-shell.test.ts
npx playwright test e2e/about.spec.ts e2e/page-sections.spec.ts --project=chromium
```

Pre-start the dev server on port 3100 with the Playwright env if it is slow to boot (see `playwright.config.ts` `webServer.env`).

## Common content edits (no component change)

| Task | Edit |
|---|---|
| Add a team member | Append `{ id, name, designation, description, photo: null }` to `members` in `src/content/about/management-team.ts` |
| Add a photo | Upload to Cloudinary (public media) and set `photo: { url, publicId, width, height }` |
| Apply an approved typo fix | Change the text in the content file **and** the matching line in `docs/content-source/about/*.txt`, and note the approval in `review.notes` |
| Mark a section approved | Set `review.status` to `"approved"` and remove the `PENDING CLIENT APPROVAL` comment |

## Manual check before done

At 375, 768, 1024 and 1440 px, check that:
- There is no sideways scroll.
- Sections appear in order.
- The V&M panels stack below `md`.
- Values show 1, 2 then 3 columns.
- Message photos alternate sides at `lg`.
- Each menu anchor lands with its heading below the header.
