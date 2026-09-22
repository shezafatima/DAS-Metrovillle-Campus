# Quickstart: News (003)

How to configure, run and verify news locally. Assumes the 002
foundation is set up (`specs/002-foundation/quickstart.md`): Atlas
reachable, admin seeded.

## 1. Configure

`.env.local` needs the three Cloudinary values already listed in
`.env.example` (they become **required** in this feature; the app fails
early naming the missing one, like every other required variable):

| Variable | Where to find it |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary console → Dashboard → "Cloud name" |
| `CLOUDINARY_API_KEY` | Dashboard → "API Key" |
| `CLOUDINARY_API_SECRET` | Dashboard → "API Secret" (server-only; never sent to the browser) |

No upload preset is needed — uploads are signed per request
(research §3). Uploads land in the folder `news/covers/`.

Atlas: your current IP must be on the cluster's Network Access list
(see PHR `history/prompts/general/0002-…`).

## 2. Install

```bash
npm install   # adds @tiptap/*, sanitize-html, cloudinary (research §14)
```

## 3. Run

```bash
npm run dev
```

- Admin: `http://localhost:3000/admin/news` (log in first).
- Public: `http://localhost:3000/news`.

## 4. Verify by hand (mirrors the E2E journey)

1. `/admin/news` → "New post". Type a title; watch the address fill in.
   Pick a category, keep language English, choose today's date, write a
   body with a heading, a list and a link. **Save as draft** → success
   toast; `/news` does **not** show it.
2. Open the post → **Publish** → `/news` shows the card (image
   placeholder, title, "<date> | <Category>", excerpt); click through to
   `/news/<slug>`.
3. Edit the title; save; the address is unchanged. Change the address by
   hand; the old one now returns "Page not found".
4. Upload a cover image (JPEG/PNG/WebP ≤ 5 MB) with alt text; save; the
   thumbnail, card and detail page all show it. Try a 6 MB file: a clear
   message, form untouched.
5. Create a second post with language **Urdu** and an Urdu title/body:
   the title field and editor switch to right-to-left in the Urdu font;
   same on the table, card and detail page. Search the admin list by
   part of the Urdu title.
6. Set a published post's date to tomorrow: it disappears from `/news`
   and shows a "Scheduled" marker in the admin table.
7. **Unpublish** → gone from `/news`; **Delete** → confirm dialog →
   gone from the admin list; `/news/<slug>` → "Page not found".
8. Category: `/news/head-office` lists only that category;
   `/news/nonsense` → "Page not found".
9. Edit a post, type, then click a sidebar link → browser confirm
   prompt appears.

## 5. Automated checks

```bash
npm test                 # Vitest: unit + DB suites (skip with a notice when MONGODB_URI is unset)
npx playwright test      # E2E: admin project (serial) + chromium project (public, 4 widths)
```

The Playwright admin specs stub `https://api.cloudinary.com/**` with
`page.route`, so no live Cloudinary account is needed to run them. The
sign route is unit-tested for its output shape and its 401.

## 6. Screenshot comparison

Reference captures: `screenshots/das.edu.pk_news_.png` (desktop),
`…(iPad Pro).png` (tablet), `…(Moto G Power).png` (phone), plus the
Urdu detail page `…news_head-office_%d9%81….png`. Card/banner token
values are extracted and recorded in `research/design-tokens.md`
("News cards") and `research/tokens/news-cards-{375,768,1024,1440}.json`
(`npx tsx research/extract-news-tokens.ts` to re-run). Key findings
worth knowing before comparing pixels: card typography is identical
at every width (not fluid), there is no grid gap — card separation
comes entirely from each card's own border — and the columns switch
at exactly Tailwind's default `md:`/`lg:` (768/1024).

## 7. Known gaps to close before shipping

- **Default OG image** (`SITE_OG_IMAGE`, `src/content/site-shell.ts`)
  currently points at the SVG logo, not a designed 1200×630 raster
  asset — replace it once one exists.
- **DB-backed and E2E tests were written but not executed** in the
  implementing sandbox — no route to MongoDB Atlas from that network
  (same IP-whitelist limitation as the 002 build notes). Run `npm test`
  with `MONGODB_URI` set and `npx playwright test` against a real Atlas
  + Cloudinary setup before merging; see the T075 PHR for what was and
  wasn't verified.
- **Cloudinary orphans**: replacing/removing a cover, or deleting a
  post, leaves the old Cloudinary asset in place (research §3) — no
  cleanup job exists yet.
