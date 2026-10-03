---
id: 0001
title: Specify careers feature
stage: spec
date: 2026-10-02
surface: agent
model: claude-opus-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: /sp.specify
labels: ["careers","cv-upload","private-storage","signup-retirement","spec"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0003-career-application-one-per-person.md, history/adr/0004-private-document-storage.md
  pr: null
files:
 - specs/012-careers/spec.md
 - specs/012-careers/checklists/requirements.md
tests:
 - none
---

## Prompt

Feature Brief — 012 Careers

A public careers page with a job application form including a CV upload, and the admin section that receives applications. Replaces the signup feature (004).

References
docs/prd.md §5.9, §6.7
Constitution §3 (permissions), §5 (personal data), §11 (tests)
ADRs: career-application-one-per-person, private-document-storage
Features 004 (form, admin list, CSV export to reuse), 011 (permissions), 008 (form patterns)
User Stories
P1 — Visitor applies
/careers shows introduction text (static content this phase) and the application form.
Fields: name, email, phone, qualification, CV. All required.
CV must be a PDF, maximum 5 MB, one file.
A privacy notice and a consent tickbox, with wording supplied by the client, must be accepted before applying.
Success shows a clear confirmation; no email is sent.
Invalid entries show messages next to the field; nothing is saved until all are valid.
Layout follows the reference's form styling, with fields aligned in a single consistent grid.
P1 — One application per person
A person may apply once, matched on either email or phone.
A repeat attempt is refused with a clear message saying an application already exists; it is never merged or overwritten.
Only the main admin deleting the application lets them reapply.
The refusal is worded so it does not confirm to a stranger whose email or phone is already on file beyond what the applicant typed themselves.
P1 — CV files are private
CVs are stored in the private document store, never on the public media service, with unguessable keys and no public URL.
The uploaded filename is never used as the stored name.
A CV reaches an admin only through a route that checks their session and careers permission, delivered as a download.
CVs are never previewed or embedded inside the admin panel.
Files are accepted only after checking the actual file content is a PDF, not just its extension or reported type.
P1 — Admin handles applications
An Applications list: name, email, phone, qualification, applied date, newest first.
Search by name, email or phone; paginated.
Open an application to see its details and download the CV.
Soft delete, with confirmation; deleting also removes the stored CV file.
CSV export of the current filtered list, without files, opening correctly in Excel including Urdu names.
The section is gated by the careers permission from 011, with the three access tests.
P2 — Entry points
A Careers link in the site shell's top bar and in the footer.
The home page's Join Now button reaches this page (already built).
P2 — Abuse protection
Rate limiting per visitor and a hidden spam trap, as on the other public forms.
Upload attempts are rate limited separately so the store cannot be filled by repeated uploads.
A failed upload does not lose the typed details.
P3 — Retiring the old signup
The signup collection, its admin screen and its public form are removed once applications replace them.
Test data from signups is not migrated.
The skipped signup E2E tests are replaced by the careers tests.
Edge Cases
Urdu names and qualifications are accepted and displayed.
A PDF that is actually something else (renamed file) is rejected.
An oversized PDF is rejected with a message stating the limit.
Two applications submitted at the same moment with the same email still result in one, enforced by the database.
If the document store is unavailable, the application is not saved and the applicant is told to try again, with their details kept.
Applications are deleted automatically after the retention period agreed with the client, together with their CV files.
Out of Scope
Emailing applicants or admins.
Job listings, vacancies or per-position applications.
Application status tracking (shortlisted, rejected).
Previewing CVs in the browser.
Editing applications.
Acceptance
E2E tests: apply successfully; reapply with the same email and with the same phone and confirm both are refused; submit a non-PDF and an oversized file and confirm both are refused; see the application in the admin list; download the CV; delete it and confirm the file is gone and reapplying now works.
Tests prove a CV cannot be fetched without a session or without the careers permission.
Tests prove the stored file name and path cannot be guessed from the application data.
Every careers route has three tests: no session, missing permission, correct permission.
Page and admin screens work at 375, 768, 1024 and 1440px.

## Response snapshot

Created branch 012-careers and specs/012-careers/spec.md with 7 prioritised user stories (apply, one-per-person, private CVs, admin handling, entry points, abuse protection, signup retirement), 34 functional requirements, 10 success criteria, edge cases, assumptions and dependencies (incl. 009 notifications and admin overview moving from signups to applications). Three clarifications left open: Q1 matching rule (brief "either email or phone" vs PRD §5.9/ADR-0003 "both"), Q2 who may delete (main admin only vs any careers-permitted admin), Q3 retention period.

## Outcome

- ✅ Impact: Spec drafted; blocked on 3 clarifications before planning.
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md, checklists/requirements.md
- 🔁 Next prompts: answer Q1–Q3; then /sp.plan; if Q1 = "either", amend ADR-0003 via /sp.adr
- 🧠 Reflection: Brief contradicts an accepted ADR on the matching rule; surfaced rather than silently picked.

## Evaluation notes (flywheel)

- Failure modes observed: brief/PRD/ADR disagreement on identity matching
- Graders run and results (PASS/FAIL): spec quality checklist — all PASS except open clarifications
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
