---
id: 30
title: Specify student registration
stage: spec
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 013-student-registration
branch: 013-student-registration
user: shezafatima
command: /sp.specify
labels: ["student-registration", "admission", "personal-data", "health-data", "main-admin-only", "spec"]
links:
  spec: specs/013-student-registration/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/013-student-registration/spec.md
 - specs/013-student-registration/checklists/requirements.md
 - history/prompts/013-student-registration/30-specify-student-registration.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

Feature Brief — 013-student-registration

Status: ready for /sp.specify Model: plan with Opus (personal data of children, including health information) Depends on: 020-admission (admission window, isAdmissionApplyOpen(), Settings → Admission), 012-careers (patterns: rate limits, spam trap, retention sweep, release gate, admin list/detail/CSV, notifications), 011 roles (main-admin-only access)

Goal

Parents submit a student registration form at /admission/register. Only the main admin can see submissions. The form is open only during the admission window set in Settings.

1. Public form — /admission/register
Fields (client-supplied list)
Field    Type    Rules
Date    —    Set by the server at submission (Pakistan time). Not shown as an input.
Student name    text    required, 2–100 chars, Urdu letters allowed
Father's name    text    required, 2–100 chars
Mother's name    text    required, 2–100 chars
Email address    email    required, valid, lower-cased
Date of birth    date    required; student aged 2–18 on the submission date
Mobile (father)    phone    Pakistani mobile, normalised to +923XXXXXXXXX (shared helper)
Mobile (mother)    phone    same rules
        At least one of the two mobiles is required.
Address    textarea    required, 10–300 chars
Emergency contact    name + phone    both required; phone uses the same helper
Admission for class    select    required; options from Settings → Admission → "Classes open for admission" (see §3)
Mother tongue    select    Urdu, English, Sindhi, Punjabi, Pashto, Balochi, Saraiki, Other (+ text if Other)
Vaccinated    Yes / No    required
Any medical history    textarea    optional, max 1000 chars; helper text: "Allergies, conditions or medication the school should know about"
Reference of student    group, optional    Name, Class, Relation (e.g. sibling at this school). If any of the three is filled, all three are required.
Remarks    textarea    optional, max 1000 chars

Validation:

One shared Zod schema for client and server (architecture.md rules).
Errors next to each field; typed values survive every failure.
All text trimmed, inner spaces collapsed; no HTML stored.
Privacy notice and consent
A short privacy notice above the submit button, plus a required consent checkbox. Draft the wording; mark it pending client approval (release gate, same as careers).
The notice must mention: what is collected (including health information and details of a referenced student), that only school administration can see it, how long it is kept (§5), and that no email or SMS is sent.
After submit
On-screen confirmation with a reference number (short, random, not sequential). No email or SMS.
The form clears; the confirmation tells the parent to keep the reference number.
Layout
Grouped fieldsets: Student, Parents, Contact & address, Health, Reference, Remarks. One column on phones, two from tablet width.
Same form styling as the contact and careers forms (shared components; fix the serif error-text issue if not already fixed).
axe scan passes.
2. Admission window enforcement
The page and the submission route both use the window from 020.
Window closed: /admission/register shows the Closed message from Settings (or a default line) and no form. The server refuses submissions with 403 and a clear message, even if someone posts directly.
Window open: form shown.
Switch on the "registration form exists" constant from 020 — or remove it — so isAdmissionApplyOpen() depends on the window alone. The Apply Now button on /admission#admission-procedure then shows whenever the window is open.
Window boundaries in Pakistan time, tested with TZ set to another zone (as in 020).
3. Settings → Admission: classes list
Add "Classes open for admission" to the Admission Settings group: an ordered list of class names (e.g. Playgroup, Nursery, Class 1, Class 2). Uses the Settings engine; add a list field type if it doesn't exist yet, with an ADR if it's a new field type.
The form's class dropdown shows exactly this list.
If the window is open but the list is empty, the Settings screen shows a warning and the public form shows the Closed message instead of a form with no classes.
The submission stores the class name as text, so later list edits don't change past submissions.
4. Abuse protection
Rate limits in the database throttle collection: 5 submissions per 10 minutes per IP.
Honeypot field, as on careers.
No duplicate blocking: siblings share parents' phone and email. Instead, flag a likely duplicate in the admin list when the same student name + date of birth + father's mobile already exists (not deleted).
5. Retention
Automatic deletion 12 months after submission (configurable, e.g. REGISTRATION_RETENTION_MONTHS), using the same opportunistic sweep pattern as careers.
Main admin can delete any registration manually (soft delete, then removed by the sweep).
Retention period appears in the privacy notice. Release gate fails a production build while the period is unset or the notice unapproved.
6. Admin — /admin/registrations (main admin only)
Content managers can never see this section, its routes, counts or notifications. Enforced on the server for every page and route; hiding the menu item is presentation only. Add rows to the access matrix tests.
List: reference number, student name, class, father's name, a mobile, submitted date, likely-duplicate flag. Newest first; search by student, father or mother name; filter by class.
Detail page: every field, health information in its own clearly marked block.
Status: New / Contacted / Admitted / Not admitted (simple label, logged on change).
Soft delete with confirmation.
CSV export of the current filtered list, all fields, main admin only. Every export is logged (who, when, how many rows).
Notifications (009): sidebar indicator, bell entries and an Overview count for new registrations — main admin only.
7. Data and security notes
New collection studentRegistrations. Never returned by any public route.
Health information and the referenced student's details are only shown in the admin detail view and CSV; never in notification previews, logs or error messages.
Logs contain the registration id only, never names, phones or health details.
Atlas encrypts data at rest; no field-level encryption this phase (record the decision in the ADR).
Out of scope
Document uploads (birth certificate, photos) — explicitly excluded.
Email/SMS to parents or admins.
Online fee payment, test scheduling.
Open questions for the client
Approve the privacy notice wording.
Confirm 12-month retention.
Confirm the mother-tongue options.
Confirm the status labels (New / Contacted / Admitted / Not admitted).
The list of classes to open for the first admission window.
Acceptance
Form at /admission/register accepts valid submissions only inside the window; refused outside it, on the page and on the server.
Apply Now on the Admission page appears exactly when the window is open.
Main admin sees list, detail, status, delete and CSV; a content manager gets 403/404 on every registration route and sees no count or notification.
Health data never appears in logs, notifications or public responses.
Retention sweep and manual delete work; release gate blocks production until notice and retention are set.
E2E: submit happy path, every validation rule, window closed/open/boundaries, rate limit, honeypot, access matrix, CSV, duplicate flag, layout at four widths, axe.

## Response snapshot

Created branch `013-student-registration` (-Number 13, following the brief's PRD numbering) from 020-admission with 020's uncommitted work carried in the working tree. Wrote spec.md with 8 prioritised user stories (parent registers; window enforcement on page + server; main admin list/detail/status/delete/CSV; content managers never see registrations; Settings class list; abuse protection + likely-duplicate flag; retention + release gate; accessible responsive form), 43 functional requirements, edge cases (age boundaries, mobiles, Other mother tongue, reference all-or-none, mid-fill window close/class removal, logging), key entities, a draft privacy notice marked pending approval, 12 success criteria, assumptions and client open questions. Defined "registration is open" = window open AND class list non-empty, driving page, server refusal and Apply Now. Found the Settings `list` field type already exists, so no field-type ADR. One [NEEDS CLARIFICATION] left: when a soft-deleted registration is permanently removed.

## Outcome

- ✅ Impact: Spec ready for clarification of one question, then /sp.plan.
- 🧪 Tests: none (spec stage).
- 📁 Files: spec.md, checklists/requirements.md, this PHR.
- 🔁 Next prompts: answer Q1 (soft-delete purge timing); /sp.plan; /sp.adr for write rule + no field-level encryption.
- 🧠 Reflection: Most of the brief was decision-complete; the main added value was the edge-case and data-protection boundary detail.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): spec quality checklist — all pass except the one open clarification.
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
