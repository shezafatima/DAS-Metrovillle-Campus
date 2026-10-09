# Quickstart: verifying the Home Page (006)

Prerequisites: an admin is seeded, and the dev server runs with the E2E environment variables (see memory/tooling notes). Never run `npm run build` and Playwright at the same time.

1. **Tokens first**: `npx tsx research/extract-home-tokens.ts` writes `research/tokens/home-sections-*.json`. Then check the "Home sections (006)" chapter in `research/design-tokens.md`.
2. **Hero**:
   - In Settings → Hero slides, add two slides and save. `/` shows them, and they advance after the display time.
   - Hide both and save. The default slide shows.
3. **Sections**: compare `/` at 1440, 1024, 768 and 375 with `screenshots/das.edu.pk_.png`, `…(iPad Pro).png` and `…(Moto G Power).png`, checking the order and the look of each section.
4. **Latest News**:
   - Publish a post. Within a minute it's first in Latest News.
   - Unpublish everything. The section disappears.
5. **Books**:
   - Put cover images at `public/images/home/books/book-01.jpg` … `book-10.jpg`. `/` shows them in that order under "Dar-e-Arqam Books", with arrows and swipe.
   - With only some files present, only those show and there are no broken images.
   - With no files, the section is gone.
6. **Dashboard**:
   - Change Students to 310000 and save. The dashboard counts up to 310000.
   - With reduced motion on, it shows 310000 at once.
7. **Links**:
   - "Join Now" goes to `/careers`, which is a placeholder until 012.
   - Photo/Videos goes to `/resources#photo-gallery`.
   - Downloads and Our Books go to `/resources#downloads` and `/resources#our-books`.
   - Call/Mail/Chat goes to `/contact`.
8. **Resilience**: with no slides, no posts and no covers, `/` still renders every other section.
9. **Motion**: with `prefers-reduced-motion`, nothing on the page moves by itself.
