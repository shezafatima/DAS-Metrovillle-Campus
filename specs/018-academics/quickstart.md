# Quickstart: 018-academics

## Run and look

```bash
npm run dev          # http://localhost:3000/academics
```

- In development, Teachers' Training shows 3 labelled placeholder photo tiles. No video blocks render, because the URLs are empty.
- To see production behaviour, run `npm run build && npm start`: no photo block, no video blocks, and the overview shows the emblem panel.
- Never run the build and Playwright at the same time (project memory).

## Tests

```bash
npx vitest run src/lib/academics src/lib/video src/lib/content src/content/academics src/components/academics src/components/media src/lib/about src/content/site-shell.test.ts
npx playwright test e2e/academics.spec.ts e2e/page-sections.spec.ts e2e/site-search.spec.ts e2e/admin-home-page.spec.ts --project=chromium
```

Start the Playwright dev server on port 3100 with the Playwright env first if it is slow to boot. Admin E2E has known existing failures, so compare failure sets before and after rather than expecting an all-green run.

## Common content edits (no component change)

| Task | Edit |
|---|---|
| Add the Teachers' Training video | Set `video.url` in `src/content/academics/teachers-training.ts` (a YouTube watch, youtu.be, embed or Shorts URL) |
| Add the Hifz video | Set `video.url` in `src/content/academics/hifz-e-quran.ts` (an Instagram post or reel URL). To use YouTube instead, also set `provider: "youtube"` |
| Add a poster | Put the file in `public/images/academics/`, then set `video.poster: { url: "/images/academics/…", publicId: "", width, height }` |
| Add training photos | Put 2–3 files in `public/images/academics/teachers-training/`, then add `{ id, image: {…}, alt }` entries to `photos` |
| Add the overview photo | Set `image` and `imageAlt` in `src/content/academics/academic-overview.ts` |
| Apply an approved text fix | Change the content file **and** the matching line in `docs/content-source/academics/*.txt`, and record the approval in `review.notes` |
| Approve T1 | Remove its `PENDING CLIENT APPROVAL` comment and the `OWNER_ADDITIONS` tag note, and update `review` |

## Manual check before done

At 375, 768, 1024 and 1440 px, check that:

- There is no sideways scroll.
- The overview and training text sit beside the image or collage from 768 px and stack below it.
- The videos keep 16:9, and the collage doesn't overlap the text or the video.

Also:

- With the cookie `e2e-academics-media=two`, then `three`, take screenshots of the Instagram frame at all four widths for the owner (research R4).
- Confirm `/academics` and `/` are listed as static (○) in the `next build` output.
