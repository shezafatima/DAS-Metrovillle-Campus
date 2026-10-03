# PRD — Dar-e-Arqam Metroville Campus Website

Status: DRAFT — items marked (TBD) need client confirmation.
Version: 0.4

## Change Log
| Version | Date | Change | Approved by | Affects specs |
|---|---|---|---|---|
| 0.1 | — | Initial draft | — | — |
| 0.2 | — | Settings becomes a real feature (contact, socials, stats, video URL, hero slides with images or videos, gallery); build order updated | — | 001 (contact details move to Settings), 005, 006, 009 |
| 0.3 | — | Client approved: editable page content; second admin role (content manager); careers page with CV upload replacing the homepage signup form; student registration form | Client | new features; 006 home, 008 resources |
| 0.4 | 2026-10-02 | Careers: a repeat applicant is matched on email OR phone (was "both"); a person may apply again 30 days after their last application, or sooner if the main admin deletes it (answers Open Question 5); CV limit 4 MB, down from the brief's 5 MB, because of the host's 4.5 MB request limit (ADR-0007) | Owner (client confirmation pending: earlier applications are kept as separate records) | 012 careers (ADR-0008) |

## 1. Overview
A public website and admin dashboard for Dar-e-Arqam School,
Metroville Campus. The public site reproduces the design of
das.edu.pk, adapted for a single campus. The admin dashboard lets
staff publish news, edit page content, and handle enquiries,
applications and registrations.

Goals:
- Give parents a clear, trustworthy view of the campus.
- Capture admission leads and enquiries.
- Let staff publish news and edit page content without developer
  help.

## 2. Users
- Visitor: parents, students, job seekers. No login.
- Main admin (the client): full access, including user management,
  student registrations and career applications.
- Content manager: limited access, granted per section by the main
  admin. Never sees student registrations.

## 3. Scope

In scope:
- Public pages in §4, with most content editable by the admin.
- Admin dashboard: news, page content, settings, messages, career
  applications, student registrations, user management.
- Two roles with per-section permissions.
- Careers page with CV upload.
- Student registration form (no document uploads).

Out of scope this phase:
- Franchise Offer.
- Email/SMS notifications of any kind.
- Online fee payment.
- Student/parent portals.
- Self-hosted video (hero videos via media service; Why Choose video
  is an external embed).
- RAG chatbot (future phase, separate service).

## 4. Sitemap

Public:
- Home — /
- About — /about (TBD: subpages)
- Campuses — /campuses
- Academics — /academics (TBD: subpages)
- Admission — /admission
- Student registration — /admission/register
- Resources — /resources (sections: Photo Gallery, Downloads, Our
  Books)
- News — /news, /news/[slug]
- Careers — /careers (link in the top bar and footer, not the main
  menu, which already matches the reference at eight items)
- Contact — /contact

Admin:
- /admin/login, /admin (overview), /admin/account
- /admin/news
- /admin/pages (editable page content)
- /admin/settings
- /admin/messages
- /admin/careers (applications)
- /admin/registrations (main admin only)
- /admin/users (main admin only)

Shared on every public page: header (top bar, logo, main menu with
dropdowns, mobile menu) and footer (links, contact details, social
links).

## 5. Public Page Requirements

### 5.1 Home
Sections in reference order: hero carousel (admin-managed slides,
image or video), Find Us Nearby, four quick-access cards, inspiration
section, Why Choose (text + embedded video), news highlights, books
carousel, salient features, progress dashboard, icon quick-links,
careers call-to-action, partners carousel.

The careers call-to-action replaces the old signup form: same
headings and styling as the reference's signup section, but with a
"Join Now" button linking to /careers instead of input fields.

### 5.2 About / 5.4 Academics / 5.5 Admission
Content pages, editable from the admin (§6.4). Admission includes a
call to action to the student registration form.

### 5.3 Campuses
Metroville campus details (TBD: whether the wider branch network is
listed).

### 5.6 Resources
Photo Gallery, Downloads, Our Books, and the same careers
call-to-action used on Home.

### 5.7 News
Published posts only, newest first, paginated; detail pages;
categories (Events, Activities, Achievements, Announcements); English
and Urdu.

### 5.8 Contact
Campus details, map, and the contact form (built).

### 5.9 Careers
- Introduction text (editable once 014 page content ships; static
  text until then) and the application form: name, email, phone,
  qualification, CV (PDF only, at most 4 MB).
- A person is matched on email OR phone: either one matching counts
  as the same person.
- A person may not apply again within 30 days of their last
  application. A repeat attempt inside that window is refused with a
  clear message giving the date they may apply again; it is never
  merged into or overwrites the earlier application.
- After 30 days they may apply again without any admin action; the
  earlier application is kept as a separate record (TBD: client to
  confirm). The main admin can delete an application to let someone
  reapply sooner.
- CV files are private: never publicly reachable, only downloadable
  by permitted admin users.

### 5.10 Student registration
- Form reached from Admission: student name, date of birth, class
  applying for, guardian name, relationship, phone, email, address,
  previous school (TBD: final field list with the client).
- No document uploads.
- Confirmation message after submission; no email is sent.
- A short privacy notice and consent checkbox, with wording approved
  by the client.

## 6. Admin Requirements

### 6.1 Roles and permissions
- Main admin: everything, including users, registrations and
  permissions.
- Content manager: only the sections the main admin has ticked when
  creating or editing their account (news, pages, settings, messages,
  careers).
- Student registrations and user management are never available to a
  content manager.
- Permissions are enforced on the server for every page and route;
  hiding menu items is presentation only.
- Permission changes are recorded (who changed what, and when).

### 6.2 User management (main admin only)
- Create a content-manager account with an email, a temporary
  password and ticked permissions.
- Edit permissions, disable, re-enable and delete accounts.
- New users must set their own password at first login.

### 6.3 News
As built: create, edit, publish/unpublish, soft delete, categories,
images, English and Urdu.

### 6.4 Page content
- Edit the text, images and links of the content pages (About,
  Academics, Admission, Campuses, Careers intro, and the fixed
  sections of Home and Resources).
- Fixed layout: content is edited through defined fields per section;
  sections cannot be added, removed or reordered.
- Changes appear on the live site shortly after saving.

### 6.5 Settings
Contact and social details, stats, Why Choose video URL, hero slides,
photo gallery. (Feature 005.)

### 6.6 Messages
As built: inbox, statuses, search, soft delete.

### 6.7 Career applications
- List: name, email, phone, qualification, applied date.
- Search and filter; download the CV; soft delete.
- CSV export of the list (without files).

### 6.8 Student registrations (main admin only)
- List and detail view of submitted registrations.
- Search by student or guardian name; soft delete; CSV export.
- Registrations are deleted automatically after an agreed retention
  period (TBD with the client).

### 6.9 Overview and notifications
Counts and indicators for messages, career applications and, for the
main admin, student registrations.

## 7. Data
- Users (with role and permissions), sessions — auth system.
- News, Messages — as built.
- Career applications — at most one per person in any 30 days; CV stored privately, not on
  the public media service.
- Student registrations — no files.
- Page content — per page and section, defined fields.
- Settings — one record per group.

## 8. Quality Requirements
- Visual match with the reference on mobile, tablet and desktop.
- Personal data (CVs, registrations) is reachable only by permitted
  admin users, never by public URL.
- Accessible menus and forms; fast-loading images.

## 9. Build Order

Built: 001 site shell, 002 foundation, 003 news, 004 signup (to be
reworked as careers), 008 contact & messages, 009 notifications,
010 admin account, 011 roles and users.

Next:
1. 005-settings
2. 006-home — includes the careers call-to-action
4. 012-careers — careers page, CV upload, admin list
5. 013-student-registration — form and main-admin-only section
6. 014-page-content — editable page content
7. 015-campuses, 016-resources, 017-about-academics-admission
8. 018-admin-overview — final counts and polish

## 10. Future Phases
RAG chatbot; email notifications; online admission and fees.

## 11. Open Questions
1. About and Academics: single pages or subpages? Which sections?
2. Campuses: Metroville only, or the full branch network?
3. Downloads section: static or admin-managed?
4. Student registration: final field list, and how long records are
   kept before automatic deletion.
5. ~~Careers: may a rejected applicant reapply later, or only if the
   admin deletes their application?~~ Resolved in v0.4: after 30 days,
   or sooner if the main admin deletes the application (§5.9).
6. Privacy notice wording for the careers and registration forms.
7. Domain, hosting, and who supplies remaining copy and images.
