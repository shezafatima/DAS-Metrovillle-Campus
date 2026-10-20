---
id: 0007
title: Propose analyze remediation edits
stage: misc
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 018-academics
branch: 018-academics
user: shezafatima
command: (follow-up to /sp.analyze)
labels: ["analyze", "remediation", "csp", "instagram", "academics"]
links:
  spec: specs/018-academics/spec.md
  ticket: null
  adr: history/adr/0010-shared-click-to-load-video-block.md
  pr: null
files:
 - none (edits proposed, not applied)
tests:
 - none
---

## Prompt

Yes, suggest concrete edits for all findings, including C4. For C4,
the docs/architecture.md note should say the Instagram embed loads
only on click, list the domains it loads from, and note those
domains must be allowed if a Content Security Policy is added later.
Show the edits before applying.

## Response snapshot

Proposed before/after edits for all 12 findings, across spec.md (F1, F2, I1, I3), tasks.md (C1, C2, C3, B1, B2, I2, I4, U1, C4 wiring) and docs/architecture.md (C4). Nothing is applied yet.

C4 domains:
- Verified by fetching an Instagram /embed/ page: www.instagram.com and static.cdninstagram.com.
- Media hosts (*.cdninstagram.com, possibly *.fbcdn.net) are marked "to confirm with a real post in T060".
- The CSP note says that frame-src must allow www.youtube-nocookie.com and www.instagram.com, and img-src must allow i.ytimg.com. Hosts loaded inside the cross-origin iframes follow the provider's policy, not ours.
- There is no CSP today.

## Outcome

- ✅ Impact: The remediation is ready for approval.
- 🧪 Tests: none
- 📁 Files: none modified
- 🔁 Next prompts: approve, then apply the edits; then /sp.implement
- 🧠 Reflection: Folding C4 into T042 and C2/C3 into T043/T049 avoids renumbering the 60 tasks.

## Evaluation notes (flywheel)

- Failure modes observed: The probe fetch used a made-up post code, so only the static host could be verified.
- Graders run and results (PASS/FAIL): no files changed before approval PASS
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
