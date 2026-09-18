---
id: 0019
title: Swap social icons to react-icons
stage: green
date: 2026-09-17
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: none
labels: ["icons", "dependency", "constitution-amendment", "social-links"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - src/components/site-shell/social-links.tsx
 - package.json
 - package-lock.json
 - .specify/memory/constitution.md
tests:
 - vitest run src/components/site-shell/social-links.test.tsx src/components/site-shell/top-bar.test.tsx src/components/site-shell/footer.test.tsx (13 passed)
---

## Prompt

done now use icon from react-icons they have the same exact social icons use those the most similar to refrence

## Response snapshot

`social-links.tsx` previously used generic lucide-react glyphs (ThumbsUp, Play, Camera, Music2) as stand-ins for Facebook/YouTube/Instagram/TikTok, per a comment noting lucide ships no real brand marks and the constitution's Fixed Stack forbade adding a new icon library. The user explicitly asked to bring in react-icons for accurate brand icons.

Installed `react-icons` (^5.7.0) and swapped in `FaFacebookF`, `FaYoutube`, `FaInstagram`, `FaTiktok` from `react-icons/fa6` — this set has all four platforms with recognizable brand marks matching the reference site's white/dark circular badges. Verified with Playwright screenshots of the running dev server (top bar, light variant; footer bottom bar, dark variant) that the icons render correctly and match the reference's icon style.

Since `react-icons` wasn't in the constitution's Principle II (Fixed Stack) enumerated list, asked the user whether to formally amend the constitution to document the addition; they said yes. Amended `.specify/memory/constitution.md`: added `react-icons` to the Fixed Stack list, bumped version 1.0.0 → 1.1.0 (MINOR — existing guidance materially expanded, per the constitution's own versioning policy), updated Last Amended date, and added a new Sync Impact Report entry above the original ratification report (kept, not overwritten).

## Outcome

- ✅ Impact: Social icons (top bar + footer) now show real Facebook/YouTube/Instagram/TikTok brand marks instead of generic lucide glyphs; constitution's Fixed Stack list now accurately reflects the dependency.
- 🧪 Tests: social-links, top-bar, footer vitest suites pass (13 tests) — no test asserted against specific icon components, so no test changes needed.
- 📁 Files: src/components/site-shell/social-links.tsx, package.json/package-lock.json (react-icons dependency), .specify/memory/constitution.md (v1.1.0).
- 🔁 Next prompts: none pending.
- 🧠 Reflection: The user's direct, explicit instruction to add a specific library is enough to proceed without treating Principle II as a hard blocker — but the constitution still says any such change "requires amending this constitution first," so surfacing that and getting consent (rather than silently adding the dependency) kept governance and code in sync.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): vitest social-links/top-bar/footer — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): none.
