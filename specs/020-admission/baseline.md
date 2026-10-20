# 020-admission: baseline, checks and completion report

## T001 — starting point

- The two uncommitted `020-news-category-label` edits were committed on that branch (`f89c911`, requester's choice), and `020-admission` was fast-forwarded onto it. No admission work was mixed in.
- **E2E baseline (T001), taken on `main` (624e505, 012-careers), not on this branch** (requester 2026-10-14): a git worktree of `main` in `E:/dar-e-arqam-mc-baseline` (node_modules linked, `.env.local` copied), `npm run build`, `next start -p 3100` on the test database (`MONGODB_DB_NAME=dar_e_arqam_test`), Playwright with `--workers=1`. The worktree was removed afterwards.
- Specs run (those on `main` that this feature touches or that cover changed code): page-sections, desktop-navigation, mobile-navigation, home-cards, home, admin-settings-access, -saving, -layout, -stats-video, -contact, -hero.
- Result: **42 passed, 42 failed** in 50 min. Passed in full: page-sections (12), admin-settings-stats-video (7). Most failures are environmental: `page.goto("/")` never reaches the "load" event on the production home page within the timeout (desktop/mobile navigation, home, home-cards), and admin `beforeEach` database resets time out (30 s) against the remote test database.

<details><summary>Failing on main</summary>

- [admin] › e2e/admin-settings-access.spec.ts:22:7 › settings — permission-gated (005 US1) › signed out, every settings page goes to the login page and returns afterwards
- [admin] › e2e/admin-settings-access.spec.ts:29:7 › settings — permission-gated (005 US1) › a content manager without settings does not see it, is redirected from every page, and is refused the requests
- [admin] › e2e/admin-settings-contact.spec.ts:22:7 › settings — contact & social (005 US2) › nothing has been saved: the top bar, footer and Contact page show the content-file values (SC-001)
- [admin] › e2e/admin-settings-contact.spec.ts:44:7 › settings — contact & social (005 US2) › the admin edits the details and the Contact page, top bar and footer show them; a cleared link hides its icon
- [admin] › e2e/admin-settings-hero.spec.ts:104:7 › settings — hero slides (005 US3) › deleting a slide asks first, and it is kept as deleted (soft delete) (1.3m)
- [admin] › e2e/admin-settings-hero.spec.ts:57:7 › settings — hero slides (005 US3) › add two slides, reorder them, hide one, save, and it all persists; the last visible slide can never be removed (1.3m)
- [admin] › e2e/admin-settings-layout.spec.ts:43:9 › settings — layout at four widths (005 FR-035) › 1024px: every group page fits and its controls do not overlap
- [admin] › e2e/admin-settings-layout.spec.ts:43:9 › settings — layout at four widths (005 FR-035) › 1440px: every group page fits and its controls do not overlap
- [admin] › e2e/admin-settings-layout.spec.ts:59:9 › settings — layout at four widths (005 FR-035) › 1024px: the slide panel fits the screen
- [admin] › e2e/admin-settings-layout.spec.ts:59:9 › settings — layout at four widths (005 FR-035) › 1440px: the slide panel fits the screen
- [admin] › e2e/admin-settings-saving.spec.ts:16:7 › settings — saving and publishing (005 US7) › two admins on the same group: the second save is refused, their edit stays on screen, the first save is kept
- [chromium] › e2e/desktop-navigation.spec.ts:31:9 › Desktop navigation at 1024px › the main menu renders in the fixed order
- [chromium] › e2e/desktop-navigation.spec.ts:31:9 › Desktop navigation at 1440px › the main menu renders in the fixed order
- [chromium] › e2e/desktop-navigation.spec.ts:52:9 › Desktop navigation at 1024px › a menu item with sub-pages opens and closes its dropdown
- [chromium] › e2e/desktop-navigation.spec.ts:52:9 › Desktop navigation at 1440px › a menu item with sub-pages opens and closes its dropdown
- [chromium] › e2e/desktop-navigation.spec.ts:66:9 › Desktop navigation at 1024px › every menu item reaches its page
- [chromium] › e2e/desktop-navigation.spec.ts:66:9 › Desktop navigation at 1440px › every menu item reaches its page
- [chromium] › e2e/home-cards.spec.ts:110:7 › quick-access cards on a mouse › auto-advances on its own, one card at a time, and loops past the last card (2.0m)
- [chromium] › e2e/home-cards.spec.ts:119:7 › quick-access cards on a mouse › a click on a side card brings it to the centre (2.0m)
- [chromium] › e2e/home-cards.spec.ts:134:7 › quick-access cards on a keyboard › Tab reaches the centre card, focus reveals the back, arrows move between cards and keep focus (2.0m)
- [chromium] › e2e/home-cards.spec.ts:155:7 › quick-access cards on a keyboard › with reduced motion the back cross-fades in (no turn) and nothing advances by itself (2.0m)
- [chromium] › e2e/home-cards.spec.ts:177:7 › quick-access cards on touch › first tap flips the card without navigating; a second tap on its link follows it (2.0m)
- [chromium] › e2e/home-cards.spec.ts:194:7 › quick-access cards on touch › a small wobble still flips; a real drag changes the slide and never also flips (2.0m)
- [chromium] › e2e/home-cards.spec.ts:218:7 › quick-access cards on touch › a touch pauses auto-advance and it resumes after a few seconds (2.0m)
- [chromium] › e2e/home-cards.spec.ts:40:9 › quick-access cards at 1440px › one centred larger card, a faded card on each side, the fourth parked; no buttons or dots; no sideways scroll (2.0m)
- [chromium] › e2e/home-cards.spec.ts:40:9 › quick-access cards at 375px › one centred larger card, a faded card on each side, the fourth parked; no buttons or dots; no sideways scroll (2.0m)
- [chromium] › e2e/home-cards.spec.ts:58:9 › quick-access cards at 1440px › content is unchanged: every card keeps its title, text and a Read More link to its page, in the accessibility tree (2.0m)
- [chromium] › e2e/home-cards.spec.ts:58:9 › quick-access cards at 375px › content is unchanged: every card keeps its title, text and a Read More link to its page, in the accessibility tree (2.0m)
- [chromium] › e2e/home-cards.spec.ts:76:7 › quick-access heading › has a heading, and a three-line yellow stroke that is hidden from assistive tech and draws in when scrolled to (2.0m)
- [chromium] › e2e/home-cards.spec.ts:98:7 › quick-access cards on a mouse › hover flips the centre card and shows its link; leaving turns it back; auto-advance waits meanwhile (2.0m)
- [chromium] › e2e/home.spec.ts:5:5 › home page loads inside the shell
- [chromium] › e2e/mobile-navigation.spec.ts:104:9 › Mobile navigation at 375px › keyboard focus stays inside the menu and returns to the menu button on close
- [chromium] › e2e/mobile-navigation.spec.ts:104:9 › Mobile navigation at 768px › keyboard focus stays inside the menu and returns to the menu button on close
- [chromium] › e2e/mobile-navigation.spec.ts:23:9 › Mobile navigation at 375px › the full menu is hidden and a menu button is shown instead
- [chromium] › e2e/mobile-navigation.spec.ts:23:9 › Mobile navigation at 768px › the full menu is hidden and a menu button is shown instead
- [chromium] › e2e/mobile-navigation.spec.ts:35:9 › Mobile navigation at 375px › opening the menu button lists every top-level item
- [chromium] › e2e/mobile-navigation.spec.ts:35:9 › Mobile navigation at 768px › opening the menu button lists every top-level item
- [chromium] › e2e/mobile-navigation.spec.ts:50:9 › Mobile navigation at 375px › an item with sub-pages expands and collapses in place
- [chromium] › e2e/mobile-navigation.spec.ts:50:9 › Mobile navigation at 768px › an item with sub-pages expands and collapses in place
- [chromium] › e2e/mobile-navigation.spec.ts:66:9 › Mobile navigation at 375px › closes via link selection, the close control, and Escape
- [chromium] › e2e/mobile-navigation.spec.ts:66:9 › Mobile navigation at 768px › closes via link selection, the close control, and Escape
- [chromium] › e2e/mobile-navigation.spec.ts:92:9 › Mobile navigation at 375px › the page behind does not scroll while the menu is open
- [chromium] › e2e/mobile-navigation.spec.ts:92:9 › Mobile navigation at 768px › the page behind does not scroll while the menu is open

</details>

## Redirect mapping (FR-003)

| Old address | New address | Checked |
|---|---|---|
| /admission/admission-procedure | /admission#admission-procedure | derived from `pageSections` (unchanged mechanism) |
| /admission/uniform | /admission#uniform | derived from `pageSections` |
| /admission/class-levels | /admission | `curl` on the dev server: 308 → /admission |

## Links checked (FR-004, T057)

Grep over the repo (excluding `node_modules`, `.next*`, `history`, `specs`, `docs/content-source`) for `class-levels`, `Class Levels`, `AnchoredPage`, `AnchoredSection`:

- `src/content/site-shell.ts`: menu entry removed (desktop dropdown, mobile menu, footer and site search all derive from it).
- `e2e/page-sections.spec.ts`: updated (sections list, redirect, menu entries, mobile anchor now Uniform).
- `src/components/site-shell/anchored-sections.tsx`: deleted (its only consumer was the old placeholder `/admission`).
- No other source links to a removed section. The home "Admission Procedure" card still links to `/admission#admission-procedure`.

## Photos (FR-013, FR-014)

| Source | Site file | Group | Size |
|---|---|---|---|
| public/images/uniform/kids-boys-uniform.png | /images/admission/uniform/kids-boys.png | Kids – Boys | 24,472 B (already optimal; copied unchanged) |
| public/images/uniform/kids-girls-uniform.png | /images/admission/uniform/kids-girls.png | Kids – Girls | 28,114 B (copied unchanged) |
| public/images/uniform/hifz-uniform.png (supplied by the requester 2026-10-14) | /images/admission/uniform/hifz-boys.png | Hifz – Boys | 140,470 → 64,934 B (lossless) |
| public/images/uniform/boys-uniform.png | /images/admission/uniform/senior-boys.png | Senior – Boys | 24,174 B (copied unchanged) |
| public/images/uniform/girls-uniform.png | /images/admission/uniform/senior-girls.png | Senior – Girls | 24,322 B (copied unchanged) |

All keep their transparency; every photo sits on a light grey panel (`--color-home-flip-front`) so white clothes stay visible. The Hifz girls' card is not shown (spec V8). `public/images/uniform/` is left in place for the requester to keep or delete.

## Home coverflow unchanged (T047, partial)

- Server-rendered HTML of `section[aria-label="Quick links"]` on `/` was saved before and after the refactor and is **identical** (the after-fetch was confirmed to be served by the new `FlipCoverflow` chunk).
- `e2e/home-cards.spec.ts` / `e2e/home.spec.ts`: **pending** (needs the Playwright server).

## Test runs so far

| Run | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| ESLint on every touched file | pass (one pre-existing warning in `src/lib/settings/mutations.test.ts`) |
| Vitest: settings schema/defaults/public/admission, admission window + server, content fidelity, admission components, page test, site-shell, site search | pass |
| Vitest (DB): `settings/actions.test.ts` incl. the admission access matrix and save cases | 30/30 pass |
| Playwright | **pending** (see T001) |
| `npm run build` route table | **pending** |

## Client review list

See `admissionReviews` in `src/content/admission/index.ts`.
