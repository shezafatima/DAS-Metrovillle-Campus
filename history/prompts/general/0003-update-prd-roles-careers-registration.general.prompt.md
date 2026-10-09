---
id: 0003
title: Update PRD roles careers registration
stage: general
date: 2026-09-28
surface: agent
model: claude-sonnet-5
feature: none
branch: 009-admin-notifications
user: s2636309@gmail.com
command: none
labels: ["prd", "docs", "roles", "careers", "student-registration"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - docs/prd.md
tests:
 - none
---

## Prompt

prd updated

[User then pasted the following full updated PRD text (Version 0.3):]

PRD — Dar-e-Arqam Metroville Campus Website

Status: items marked (TBD) need client confirmation. Version: 0.3

Change Log
Version    Date    Change    Approved by    Affects specs
0.1    —    Initial draft    —    —
0.2    —    Settings becomes a real feature (contact, socials, stats, video URL, hero slides with images or videos, gallery)    —    001, 005, 006, 009
0.3    —    Client approved: editable page content; second admin role (content manager); careers page with CV upload replacing the homepage signup form; student registration form    Client    new features; 006 home, 008 resources

1. Overview

A public website and admin dashboard for Dar-e-Arqam School, Metroville Campus. The public site reproduces the design of das.edu.pk, adapted for a single campus. The admin dashboard lets staff publish news, edit page content, and handle enquiries, applications and registrations.

2. Users
Visitor: parents, students, job seekers. No login.
Main admin (the client): full access, including user management, student registrations and career applications.
Content manager: limited access, granted per section by the main admin. Never sees student registrations.

3. Scope

In scope:
Public pages in §4, with most content editable by the admin.
Admin dashboard: news, page content, settings, messages, career applications, student registrations, user management.
Two roles with per-section permissions.
Careers page with CV upload.
Student registration form (no document uploads).

Out of scope this phase:
Franchise Offer.
Email/SMS notifications of any kind.
Online fee payment.
Student/parent portals.
Self-hosted video (hero videos via media service; Why Choose video is an external embed).
RAG chatbot (future phase, separate service).

4. Sitemap

Public:
Home — /
About — /about (TBD: subpages)
Campuses — /campuses
Academics — /academics (TBD: subpages)
Admission — /admission
Student registration — /admission/register
Resources — /resources (sections: Photo Gallery, Downloads, Our Books)
News — /news, /news/[slug]
Careers — /careers (link in the top bar and footer, not the main menu, which already matches the reference at eight items)
Contact — /contact

Admin:
/admin/login, /admin (overview), /admin/account
/admin/news
/admin/pages (editable page content)
/admin/settings
/admin/messages
/admin/careers (applications)
/admin/registrations (main admin only)
/admin/users (main admin only)

5. Public Page Requirements
5.1 Home

Sections in reference order: hero carousel (admin-managed slides, image or video), Find Us Nearby, four quick-access cards, inspiration section, Why Choose (text + embedded video), news highlights, books carousel, salient features, progress dashboard, icon quick-links, careers call-to-action, partners carousel.

The careers call-to-action replaces the old signup form: same headings and styling as the reference's signup section, but with a "Join Now" button linking to /careers instead of input fields.

5.2 About / 5.4 Academics / 5.5 Admission

Content pages, editable from the admin (§6.4). Admission includes a call to action to the student registration form.

5.3 Campuses

Metroville campus details (TBD: whether the wider branch network is listed).

5.6 Resources

Photo Gallery, Downloads, Our Books, and the same careers call-to-action used on Home.

5.7 News

Published posts only, newest first, paginated; detail pages; categories (Events, Activities, Achievements, Announcements); English and Urdu.

5.8 Contact

Campus details, map, and the contact form (built).

5.9 Careers
Introduction text (editable) and the application form: name, email, phone, qualification, CV (PDF only).
One application per person, matched on both email and phone. A repeat attempt is refused with a clear message, not merged. The main admin can delete an application to let someone reapply.
CV files are private: never publicly reachable, only downloadable by permitted admin users.

5.10 Student registration
Form reached from Admission: student name, date of birth, class applying for, guardian name, relationship, phone, email, address, previous school (TBD: final field list with the client).
No document uploads.
Confirmation message after submission; no email is sent.
A short privacy notice and consent checkbox, with wording approved by the client.

6. Admin Requirements
6.1 Roles and permissions
Main admin: everything, including users, registrations and permissions.
Content manager: only the sections the main admin has ticked when creating or editing their account (news, pages, settings, messages, careers).
Student registrations and user management are never available to a content manager.
Permissions are enforced on the server for every page and route; hiding menu items is presentation only.
Permission changes are recorded (who changed what, and when).

6.2 User management (main admin only)
Create a content-manager account with an email, a temporary password and ticked permissions.
Edit permissions, disable, re-enable and delete accounts.
New users must set their own password at first login.

6.3 News

As built: create, edit, publish/unpublish, soft delete, categories, images, English and Urdu.

6.4 Page content
Edit the text, images and links of the content pages (About, Academics, Admission, Campuses, Careers intro, and the fixed sections of Home and Resources).
Fixed layout: content is edited through defined fields per section; sections cannot be added, removed or reordered.
Changes appear on the live site shortly after saving.

6.5 Settings

Contact and social details, stats, Why Choose video URL, hero slides, photo gallery. (Feature 005.)

6.6 Messages

As built: inbox, statuses, search, soft delete.

6.7 Career applications
List: name, email, phone, qualification, applied date.
Search and filter; download the CV; soft delete.
CSV export of the list (without files).

6.8 Student registrations (main admin only)
List and detail view of submitted registrations.
Search by student or guardian name; soft delete; CSV export.
Registrations are deleted automatically after an agreed retention period (TBD with the client).

6.9 Overview and notifications

Counts and indicators for messages, career applications and, for the main admin, student registrations.

7. Data
Users (with role and permissions), sessions — auth system.
News, Messages — as built.
Career applications — one per person; CV stored privately, not on the public media service.
Student registrations — no files.
Page content — per page and section, defined fields.
Settings — one record per group.

8. Quality Requirements
Visual match with the reference on mobile, tablet and desktop.
Personal data (CVs, registrations) is reachable only by permitted admin users, never by public URL.
Accessible menus and forms; fast-loading images.

9. Build Order

Built: 001 site shell, 002 foundation, 003 news, 004 signup (to be reworked as careers), 008 contact & messages, 009 notifications.

Next:
010-admin-account — password change (spec ready)
005-settings
006-home — includes the careers call-to-action
011-roles-and-users — roles, permissions, user management
012-careers — careers page, CV upload, admin list
013-student-registration — form and main-admin-only section
014-page-content — editable page content
015-campuses, 016-resources, 017-about-academics-admission
018-admin-overview — final counts and polish

10. Future Phases

RAG chatbot; email notifications; online admission and fees.

11. Open Questions
About and Academics: single pages or subpages? Which sections?
Campuses: Metroville only, or the full branch network?
Downloads section: static or admin-managed?
Student registration: final field list, and how long records are kept before automatic deletion.
Careers: may a rejected applicant reapply later, or only if the admin deletes their application?
Privacy notice wording for the careers and registration forms.
Domain, hosting, and who supplies remaining copy and images.

## Response snapshot

Rewrote `docs/prd.md` from v0.2 to v0.3, transcribing the user's full pasted content into the doc's existing markdown conventions (heading levels, bullet style, change-log table) without adding or inferring content beyond what was pasted. Preserved the 0.1/0.2 change-log rows verbatim (history is not rewritten) and appended the 0.3 row from the paste.

Key content changes carried over: Users section now has three roles (visitor, main admin, content manager) replacing the old single shared admin role; Scope broadened (careers CV upload, student registration, per-section permissions) and narrowed (self-hosted video wording now references "media service" generically instead of naming Cloudinary, consistent with the constitution's amendment 3 split of public media vs. private document storage); Sitemap gains /admission/register, /careers, /admin/account, /admin/pages, /admin/careers, /admin/registrations, /admin/users, and drops the old /admin/signups route naming; full new §5.9 Careers and §5.10 Student registration page requirements; full new §6.1/6.2 Roles & permissions and User management admin sections; Build Order §9 replaced with the new next-up sequence (010 through 018).

Kept "Status: DRAFT" wording (the pasted text dropped the word "DRAFT," most likely a paste-rendering artifact rather than an intentional status change) and did not carry forward the prior version's "Goals" bullet list or the "shared header/footer" sitemap note, since the user's replacement text omitted both — flagged here rather than silently reinstated.

No ADR suggestion was made: this is a PRD (business requirements) update, not a technical/architectural decision by itself. The architectural implications already visible here (roles model, private document storage) are already reflected in the constitution's amendment 3 (v1.2.0, see history/prompts/constitution/0002-amend-constitution-roles-personal-data.constitution.prompt.md); further architectural decisions for roles/careers/registration will surface during /sp.plan for the 011/012/013 features per Build Order §9.

## Outcome

- ✅ Impact: `docs/prd.md` now reflects client-approved v0.3 scope (roles, careers CV upload replacing signup, student registration) that will drive specs 005, 006, 008, 010–018.
- 🧪 Tests: none (documentation-only change)
- 📁 Files: `docs/prd.md`
- 🔁 Next prompts: When specs 011-roles-and-users, 012-careers, 013-student-registration are planned, confirm whether the dropped "Goals" section and "shared header/footer" sitemap note should be reinstated, and resolve the §11 open questions (About/Academics subpages, Campuses scope, Downloads admin-managed or static, registration retention period, careers reapply policy, privacy notice wording, domain/hosting/copy ownership).
- 🧠 Reflection: Treated the pasted document as a full authoritative replacement rather than a diff, since the user said "prd updated" and supplied the complete document end-to-end with its own version number and change-log entry.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a (documentation change)
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
