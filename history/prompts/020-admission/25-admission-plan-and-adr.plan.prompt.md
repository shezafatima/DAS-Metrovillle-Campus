---
id: 25
title: Admission plan and ADR
stage: plan
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 020-admission
branch: 020-admission
user: shezafatima
command: /sp.plan 020-admission + /sp.adr admission-window-evaluation
labels: ["admission", "plan", "adr", "admission-window", "coverflow", "settings-engine"]
links:
  spec: specs/020-admission/spec.md
  ticket: null
  adr: history/adr/0011-admission-window-evaluation.md
  pr: null
files:
 - specs/020-admission/spec.md
 - specs/020-admission/checklists/requirements.md
 - specs/020-admission/plan.md
 - specs/020-admission/research.md
 - specs/020-admission/data-model.md
 - specs/020-admission/quickstart.md
 - specs/020-admission/contracts/admission-window.md
 - specs/020-admission/contracts/settings-admission-group.md
 - specs/020-admission/contracts/flip-coverflow.md
 - specs/020-admission/contracts/routes-and-navigation.md
 - history/adr/0011-admission-window-evaluation.md
tests:
 - none (plan stage)
---

## Prompt

Q1: A. Sections 1–4 word for word; leave out the empty age table and
the promotional ending. Add "age criteria per class" to the client
review list, since parents will look for it.

Photos: confirmed, but open each image and check it matches: the kids
photos should show younger children and boys-uniform / girls-uniform
older students. Report if any looks wrong. Hifz cards use the icon
front.

Then continue to /sp.plan, and run /sp.adr admission-window-evaluation
during the plan.

## Response snapshot

Opened all four photos: they are flat-lay clothing photos with no children, so age could not be checked. Each was checked against the item lists instead. Kids–Boys and Senior–Boys photos show the same garments (their lists are also identical). The senior girls' photo shows a white qamiz with green-check trim, while the text says "Green Check Qamiz"; this went on the client review list. Recorded the procedure text verbatim from https://das.edu.pk/admission/ (sections 1–4). The reference contradicts itself on tuition ("every two months" in the fee table vs "every month" in Rules of Payment); this was flagged for the client. Spec status set to ready.

Plan: /admission renders per request via connection(), and open/closed is computed from cached saved dates and the Asia/Karachi calendar day. The Settings engine gains a date type and a dateOrder group rule. A pure admissionWindowState plus getAdmissionWindow/isAdmissionApplyOpen serve as the single hook for 013. A test-only e2e-now cookie (freshReadsForTests only) covers the midnight E2E. The home coverflow is extracted into ui/FlipCoverflow, keeping home markup and test ids. Content and fidelity tests follow the 018 pattern. Constitution Check passed. Created ADR-0011 (admission window evaluation); no conflict with ADR-0009.

## Outcome

- ✅ Impact: Spec finalised; plan, research, data model, 4 contracts, quickstart, ADR-0011 created
- 🧪 Tests: none (plan stage); test matrices defined in contracts
- 📁 Files: see list above
- 🔁 Next prompts: /sp.tasks
- 🧠 Reflection: the photo check asked about age, but the photos contain no people. Reported this rather than guessing.

## Evaluation notes (flywheel)

- Failure modes observed: no create-adr script in .specify/scripts, so the ADR was written by hand from the template
- Graders run and results (PASS/FAIL): ADR checklist: clustered decision PASS, alternatives with rationale PASS, pros/cons PASS, concise PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
