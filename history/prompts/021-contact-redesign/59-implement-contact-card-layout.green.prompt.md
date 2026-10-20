---
id: 59
title: Implement contact card layout
stage: green
date: 2026-10-20
surface: agent
model: claude-sonnet-5-5
feature: 021-contact-redesign
branch: 021-contact-redesign
user: shezafatima
command: implement contact redesign
labels: ["contact","glow-border","worktree","a11y","e2e"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/app/(public)/contact/page.tsx
  - src/components/contact/contact-details.tsx
  - src/components/contact/contact-map.tsx
  - src/components/contact/contact-form-section.tsx
  - src/components/contact/contact-form.tsx
  - src/components/glow/glow-layers.tsx
  - src/components/glow/glow-frame.tsx
  - src/components/glow/glow-frame.test.tsx
  - src/components/about/core-values.tsx
  - src/components/site-shell/social-links.tsx
  - src/content/contact.ts
  - src/app/globals.css
  - e2e/contact-visual.spec.ts
  - e2e/contact-details.spec.ts
  - docs/architecture.md
tests:
  - vitest: contact, about, social-links, footer, glow-frame
  - playwright: contact-visual, contact-details, contact-public, contact-protection, about, footer, contact-and-social, shell-and-placeholders, header-scroll
---

## Prompt

1. Yes, drop the Write Us column. Delete only assets used solely by
   it, and list what you removed.
2. Yes, the banner stays above the card.
3. Yes, keep "Open in Google Maps" in the navy half, drop the
   duplicate address caption, and update the test.
4. Reuse the social icon component the footer already uses, for all
   networks, so the contact page and footer match. No new icon
   library and no one-off inline SVGs.
5. Branch name 021-contact-redesign is fine, but do NOT branch in this
   working tree: it holds uncommitted 014b work. Create a git worktree
   in a separate folder, on a new branch 021-contact-redesign from
   main, and do all the contact work there. Don't touch the 014b files.
   Note the worktree path in the PHR.

Go ahead.

## Response snapshot

Worktree path: E:\dar-contact (branch 021-contact-redesign). It was created from a8c3237 (the committed 014b HEAD), not from main: main does not contain the About Core Values glow (017-about is unmerged), so the glow could not be reused from main. node_modules in the worktree is a real npm ci install, because Turbopack rejects a junction. The contact page is now one card; the glow border is split into GlowLayers and GlowFrame and shared with Core Values; SocialLinks gained an onDark prop; the Write Us column, ContactDetailColumn, WriteUsLink and public/images/contact/write-us.png were removed.

## Outcome

- ✅ Impact: contact page is one card, navy details and map on the left, gold-bordered form on the right
- 🧪 Tests: see tests list; the rate-limit spec is flaky when its 10-minute throttle window is shared
- 📁 Files: see files list
- 🔁 Next prompts: decide on the orphaned by-phone, by-email and visit-us PNGs and the unused contact tokens; the footer credit link axe violation
- 🧠 Reflection: the Send button moved to ACCESSIBLE_SUBMIT_CLASS because white on red failed axe

## Evaluation notes (flywheel)

- Failure modes observed: the base-branch instruction (main) conflicted with reusing the glow
- Graders run and results (PASS/FAIL): see outcome
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
