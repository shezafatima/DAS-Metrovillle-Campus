---
id: 0001
title: Site shell specification
stage: spec
date: 2026-09-16
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: shezafatima
command: /sp.specify
labels: ["spec", "site-shell", "navigation", "footer"]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-site-shell/spec.md
 - specs/001-site-shell/checklists/requirements.md
 - .specify/scripts/powershell/create-new-feature.ps1
 - history/prompts/001-site-shell/0001-site-shell-specification.spec.prompt.md
tests:
 - none (specification-only change; no automated tests apply)
---

## Prompt

# Feature Brief — 001 Site Shell

Build the shared public site shell: top bar, header with main menu,
mobile menu, footer, and the page layout every public page uses.

## References
- Screenshots: screenshots/header-desktop.png,
  screenshots/header-mobile.png, screenshots/footer-desktop.png,
  screenshots/footer-mobile.png
  (TODO: replace with the actual filenames)
- Values: research/design-tokens.md
- Menu structure: docs/prd.md §4 (Metroville sitemap, not the full
  das.edu.pk menu)

## User Stories

### P1 — Desktop navigation
A visitor on a desktop can reach every public page from the header.
- The logo links to the home page.
- Menu items follow the PRD sitemap order: Home, About, Campuses,
  Academics, Admission, Resources, News, Contact.
- Items with sub-pages open a dropdown on hover and on keyboard focus,
  and close when the pointer or focus leaves.
- The current page's menu item is visibly marked as active.
- Look, spacing and hover effects match the reference.

### P1 — Mobile navigation
A visitor on a phone or tablet can reach every public page.
- At the reference site's collapse breakpoint, the menu is replaced
  by a menu button.
- The button opens the menu; items with sub-pages expand and collapse.
- The menu closes when a link is chosen, the close button is pressed,
  or Escape is pressed.
- The page behind does not scroll while the menu is open.
- Focus stays inside the open menu and returns to the menu button
  when it closes.

### P2 — Contact details and social links
A visitor can find how to reach the campus from any page.
- The top bar and footer show the campus phone, email and address as
  in the reference.
- Phone opens the dialer, email opens the mail app.
- Social links open in a new tab.
- All contact details and links are editable in one place without
  changing layout code.

### P2 — Footer
- Footer columns, quick links and bottom bar match the reference,
  with Metroville content.
- The bottom bar shows the copyright with the current year.

### P3 — Header scroll behavior
- The header matches the reference's scroll behavior (sticky or not,
  and any change in size or background while scrolling).

### P3 — Shared layout and placeholder pages
- Every public page renders inside the shell.
- Every route in the PRD sitemap exists, showing a simple placeholder
  inside the shell until its own feature is built, so navigation
  never leads to an error.
- Unknown URLs show a "page not found" page inside the shell with a
  link home.
- A "skip to content" link is the first focusable element.

## Deviations from the Reference
- No Franchise Offer menu item or link anywhere.
- Menu contains only pages in the PRD sitemap.
- All campus details are Metroville's, not the head office's.

## Edge Cases
- Very long menu labels or Urdu text do not break the layout.
- Menu works with keyboard only and with a screen reader.
- Missing social link values hide that icon instead of showing a
  broken link.
- About and Academics sub-pages are still TBD in the PRD: the menu
  must support a top-level item either with or without a dropdown,
  changed through the menu content only.

## Out of Scope
- Admin dashboard layout (feature 002).
- Site search (not in PRD).
- Signup form (feature 004), even if the reference footer shows one.
- Real content for any page other than the shell.

## Acceptance
- Matches reference screenshots and token values at 375, 768, 1024
  and 1440px.
- Every menu link reaches its page on desktop and mobile.
- An e2e test covers each user story.

## Response snapshot

Created feature branch `001-site-shell` and `specs/001-site-shell/spec.md`
via `.specify/scripts/powershell/create-new-feature.ps1 -Number 1 -ShortName
"site-shell"`. Hit and fixed a real script bug along the way: Windows
PowerShell 5.1's `Join-Path` only accepts two path segments (no
`-AdditionalChildPath`, which is PS7+ only), so the script's
`Join-Path $repoRoot 'history' 'prompts' $branchName` call died right
after creating the branch and copying the spec template, before writing
the JSON output or creating the PHR directory. Fixed by nesting two
two-argument Join-Path calls; manually created the missing
`history/prompts/001-site-shell/` directory to unblock this PHR.

Wrote spec.md following the template structure: 6 user stories (P1
desktop nav, P1 mobile nav, P2 contact/social, P2 footer, P3 scroll
behavior, P3 shared layout/placeholders) each with Why/Independent
Test/Given-When-Then acceptance scenarios; 4 edge cases; 24 functional
requirements (FR-001–FR-024); 4 key entities (Navigation Item, Contact
Info, Footer Content, Sitemap Route); 6 measurable success criteria;
plus Out of Scope and Assumptions sections. Cross-referenced
docs/prd.md §4 (sitemap order, confirmed matches brief) and noted that
research/design-tokens.md is the source for the collapse-breakpoint and
token values referenced but not restated in the spec.

Zero [NEEDS CLARIFICATION] markers were used — the brief was already
well-specified (explicit priorities, edge cases, deviations, scope
boundary), and the remaining open points (exact screenshot filenames,
real contact values, which breakpoint number) are all resolvable from
existing artifacts already in the repo, so they were recorded as
Assumptions instead of blocking questions. Generated the quality
checklist at specs/001-site-shell/checklists/requirements.md and
validated the spec against all items — all pass on the first iteration.

## Outcome

- ✅ Impact: Feature 001 (Site Shell) now has a validated, implementation-agnostic specification ready for `/sp.plan`. Also fixed a latent cross-platform bug in the shared feature-creation script that would have broken every future `/sp.specify` run on Windows PowerShell 5.1.
- 🧪 Tests: None run — specification-only artifact; no executable test surface yet.
- 📁 Files: Created `specs/001-site-shell/spec.md`, `specs/001-site-shell/checklists/requirements.md`; fixed `.specify/scripts/powershell/create-new-feature.ps1`; created this PHR.
- 🔁 Next prompts: `/sp.clarify` (optional, given zero markers) or directly `/sp.plan` for feature 001.
- 🧠 Reflection: The main judgment calls were (a) adding an "Out of Scope" and "Assumptions" section not literally present in the abbreviated spec-template excerpt, since the general guidelines explicitly call for documenting assumptions and the brief itself had a clear scope boundary worth preserving; and (b) treating the brief's own acknowledged gaps (TODO screenshot filenames, TBD contact values) as Assumptions resolvable from existing repo artifacts rather than spending 2 of the 3 allowed clarification slots on things that don't actually block writing a correct, testable spec.

## Evaluation notes (flywheel)

- Failure modes observed: `create-new-feature.ps1` failed on Windows PowerShell 5.1 due to a `Join-Path` positional-argument limit not present in PowerShell 7+; fixed in place.
- Graders run and results (PASS/FAIL): Spec quality checklist — all 16 items PASS on first pass.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
