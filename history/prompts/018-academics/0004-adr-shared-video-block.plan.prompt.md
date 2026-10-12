---
id: 0004
title: ADR shared video block
stage: plan
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 018-academics
branch: 018-academics
user: shezafatima
command: /sp.adr shared-click-to-load-video-block
labels: ["adr", "video-embed", "privacy", "academics"]
links:
  spec: specs/018-academics/spec.md
  ticket: null
  adr: history/adr/0010-shared-click-to-load-video-block.md
  pr: null
files:
 - history/adr/0010-shared-click-to-load-video-block.md
 - specs/018-academics/plan.md
tests:
 - none
---

## Prompt

/sp.adr shared-click-to-load-video-block

## Response snapshot

Created ADR-0010 (Proposed). The decision cluster:
- One VideoEmbed component replaces the home YouTubeEmbed.
- resolveVideo is used for both validation and rendering (YouTube nocookie, Instagram /embed/ without embed.js).
- One VideoEntry shape {provider, url, poster, title}.
- Local-only posters on content pages; the home page opts into its remote thumbnail.

5 alternatives are listed with reasons. Checked against ADR-0009: related, no conflict. No create-adr script exists, so the ADR was written from .specify/templates/adr-template.md. The plan's ADR section now links the ADR.

## Outcome

- ✅ Impact: The video-block decision is recorded before tasks.
- 🧪 Tests: none
- 📁 Files: ADR-0010, plan.md ADR link
- 🔁 Next prompts: /sp.tasks
- 🧠 Reflection: The other 018 choices didn't get ADRs. The content shapes follow 017's pattern, the explicit redirect map refines ADR-0009 (as 017 already did), and the test seam is local.

## Evaluation notes (flywheel)

- Failure modes observed: The create-adr script is missing (no .specify/scripts/bash), so the agent-native fallback was used.
- Graders run and results (PASS/FAIL): clustered PASS; alternatives listed PASS; pros/cons PASS; concise PASS
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
