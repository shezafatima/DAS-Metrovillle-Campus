# Quickstart: Site Shell

## Run it

```bash
npm run dev
```

Visit `http://localhost:3000` and every PRD sitemap route (`/about`,
`/campuses`, `/academics`, `/admission`, `/resources`, `/news`,
`/news/anything`, `/contact`) — each renders inside the shared header/
top-bar/footer shell, showing placeholder content until its own feature is
built. An unmatched URL (e.g. `/nope`) renders the shell's "page not found"
view with a link home.

## Check it against the reference

Resize the browser (or use devtools device emulation) to 375px, 768px,
1024px and 1440px and compare against `screenshots/das.edu.pk_*` at the
matching viewport. At `1024px` and above the full desktop menu is visible;
below `1024px` a menu button replaces it (research.md §1).

## Edit shared content without touching layout code

Everything in the top bar, header menu and footer that isn't pure layout
lives in one file:

```
src/content/site-shell.ts
```

- Add/remove/reorder a menu item, or give one sub-pages, by editing
  `navigationItems` — `NavDesktop`/`NavMobile` pick up the change with no
  code edit (FR-004, FR-013).
- Update the phone, email, address or a social link by editing
  `contactInfo` — it's read by both the top bar and the footer.
- Update footer columns/quick links by editing `footerContent`.

## Run the tests

```bash
npm test          # Vitest — content shape, href construction, active-item logic
npm run test:e2e  # Playwright — one spec per user story (e2e/*.spec.ts)
```

## Accessibility check (manual, backs SC-004)

1. Load any page, press Tab once — the first focused element is "Skip to
   content" (FR-019).
2. At desktop width, Tab into a menu item with sub-pages — its dropdown
   opens; Tab or click away — it closes (FR-003).
3. At mobile width, open the menu button, Tab through it — focus never
   leaves the menu; press Escape — it closes and focus returns to the menu
   button (FR-007, FR-009).
