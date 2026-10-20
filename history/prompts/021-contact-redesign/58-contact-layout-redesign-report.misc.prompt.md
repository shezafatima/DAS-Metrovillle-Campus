---
id: 58
title: Contact layout redesign report
stage: misc
date: 2026-10-20
surface: agent
model: claude-sonnet-5-5
feature: 021-contact-redesign
branch: 021-contact-redesign
user: shezafatima
command: contact page layout redesign (report first)
labels: ["contact","layout","glow-border","e2e"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - none (read-only report)
tests:
  - none
---

## Prompt

Contact page layout redesign. Public site only. Theme colours and
fonts unchanged; no new colours. Use the attached reference
screenshot for LAYOUT only. Do not copy its text, colours, icons or
branding.

1. Structure
   - One large card, split into two columns from 1024 px up:
     left = contact details + map, right = the contact form.
   - Below 1024 px the two halves stack: details and map first, then
     the form.
   - Rounded corners and spacing from existing tokens; the two halves
     sit inside one card so they read as a single unit.

2. Left half: details on the navy theme background
   - Navy (existing token) background, white text.
   - Address, phone, email and school timings, read from Settings as
     today. Each line gets a clean, modern icon from lucide-react
     (e.g. MapPin, Phone, Mail, Clock) inside a small circle using the
     yellow/gold token, with the icon in navy. Icons are decorative
     (aria-hidden); the text carries the meaning.
   - Phone is a tel: link, email a mailto: link, white with a
     yellow/gold hover and visible focus ring.
   - Social links from Settings as a row of icons at the bottom of
     this half, each with an accessible name.
   - The map below the details inside the navy half: keep the
     existing lazy-loaded Google Maps embed, rounded corners, fixed
     height, and its current accessible title.

3. Right half: the form inside the yellow animated border
   - Reuse the moving glow border component from the About page's
     Core Values cards (the 3px gold ring with the transform-based
     rotation). Do not build a second border component; extend it if
     needed.
   - Light background inside the border, so the form fields stay as
     readable as today.
   - The border pauses while any form field has focus and while the
     pointer is over the form, and resumes after. Static gold border
     under prefers-reduced-motion. Paused when off screen.
   - The form itself is unchanged: same fields, validation, error
     colour (--color-error-strong), honeypot, rate limits and success
     message. Layout change only.

4. Checks
   - 375, 640, 768, 1024 and 1440 px: no sideways scroll, stacking
     order as specified, map never overflows.
   - Contrast: white on navy, navy on gold for the icon circles, and
     the form text on its light background; report measured ratios.
   - axe passes on /contact.
   - Report frame cost of the border on a 4x CPU-throttled profile,
     labelled as a proxy.

Before implementing, report:
- which E2E specs assert on the current contact layout (feature 008
  placed details above a full-width form, following the old
  reference, so the visual and layout specs will need updating);
- whether the glow border component can wrap a form without changes.

Do not implement until I've seen the report. Commit on its own branch.

## Response snapshot

Report: contact-visual.spec and contact-details.spec assert on the old four-column layout, the form band colour and an h2-based map locator, so they must be rewritten. contact-public, contact-protection and the unit tests use role and label selectors and stay. The glow border is CSS-only (globals.css .about-*) with an observer bound to a ul; it needs a generic wrapper and a pause-on-focus/hover rule. Five questions raised: Write Us column, banner, map link, social icons, branch name.

## Outcome

- ✅ Impact: report delivered; no code changed
- 🧪 Tests: none run
- 📁 Files: none
- 🔁 Next prompts: answers to the five questions, then implement
- 🧠 Reflection: the screenshot attachment did not arrive; flagged to the user

## Evaluation notes (flywheel)

- Failure modes observed: reference screenshot missing from the prompt
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
