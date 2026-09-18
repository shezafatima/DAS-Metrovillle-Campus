---
id: 0021
title: Simplify footer to bottom bar only
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: ["content", "footer", "spec-correction"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - src/components/site-shell/footer.tsx
 - src/components/site-shell/footer.test.tsx
 - src/content/site-shell.ts
tests:
 - vitest run (full suite) — 39 passed
 - tsc --noEmit — no errors
---

## Prompt

here is the only footer I need [Image #2: reference screenshot of das.edu.pk's footer — a single grey bottom bar reading "© Dar-e-Arqam Schools | All Rights Reserved | Crafted Excellence with ❤ by softLINKS" with social icons on the right; no columns, no quick-links row, no phone/email/address, no copyright year]

(follow-up) top bar social links mustbe allign in center in mobile view

## Response snapshot

The footer had grown a top section (phone/email/address block, an empty `columns` array, and an 8-item `quickLinks` row) above the bottom bar, added earlier to satisfy spec.md's FR-010/FR-014 even though research/design-tokens.md had already documented the real reference footer as bottom-bar-only. The user's screenshot confirmed that ground truth directly and asked to match it exactly.

Before removing the phone/email/address display, asked whether that was acceptable given the Contact page is still just a placeholder (so contact details would temporarily show nowhere on the site) — user confirmed yes, remove for now.

Rewrote `footer.tsx` down to the single bottom-bar row: brand-name copyright text (linked to `/`), "All Rights Reserved", a "Crafted Excellence with ❤ by" credit, and `SocialLinks` (dark variant). Also removed the copyright year entirely — the reference bottom bar text (both the user's screenshot and research/tokens/home-1440.json's `footerBottomBar` sample) has no year at all, contradicting FR-015; matched the real reference over the written FR. Simplified `FooterContent` in `src/content/site-shell.ts` to just `{ bottomText: string }`, removing the now-unused `FooterColumn`/`FooterLink` types and the `columns`/`quickLinks` fields. Updated `footer.test.tsx` to drop the removed tel:/mailto:/year assertions and cover the brand-name link and social-icons presence instead.

Mid-edit, the user directly hand-edited `footer.tsx` in their own editor concurrently (visible via file-changed-on-disk notices) — first swapping the credit name from "softLINKS" to "Sheza Fatima", then wrapping it in a real link to `https://sheza-fatima.vercel.app/`. One intermediate save left a broken `<Lin` JSX fragment (invalid syntax, tests failed to transform); flagged it rather than overwriting, and the user completed the edit into a valid `<Link>` on their own. Left their content as-is once it resolved.

## Outcome

- ✅ Impact: Footer now renders as exactly the reference's single bottom bar (brand name, all-rights-reserved, credit link, social icons) with no phantom sections or fabricated copyright year; phone/email/address content is no longer duplicated in the footer (still defined in `contactInfo` for whenever the real Contact page is built).
- 🧪 Tests: full vitest suite passes (39 tests) after updating footer.test.tsx; `tsc --noEmit` clean after the FooterContent type simplification.
- 📁 Files: src/components/site-shell/footer.tsx, src/components/site-shell/footer.test.tsx, src/content/site-shell.ts.
- 🔁 Next prompts: specs/001-site-shell/spec.md's FR-010, FR-014, FR-015 and User Stories 3/4 still describe the old (columns + quick-links + contact-info-in-footer + copyright year) footer and are now stale — worth a follow-up pass to correct them the way the earlier top-bar-contact-info assumption was corrected, so the spec matches what's actually built.
- 🧠 Reflection: research/design-tokens.md had already recorded the true reference footer shape before this feature's first implementation pass; the spec's FR-010/FR-014 diverged from that recorded research anyway. Worth checking, on future features, whether a spec's FRs actually match the research doc's own findings before building against the FRs.

## Evaluation notes (flywheel)

- Failure modes observed: a concurrent hand-edit landed briefly in an invalid intermediate state (`<Lin` fragment); correctly flagged instead of auto-fixing or reverting, and the user resolved it themselves.
- Graders run and results (PASS/FAIL): vitest full suite — PASS; tsc --noEmit — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): correct spec.md's FR-010/FR-014/FR-015 and the User Story 3/4 text to match the now-implemented bottom-bar-only footer, following the existing "corrected during implementation" precedent already in the Assumptions section.
