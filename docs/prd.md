# PRD — Dar-e-Arqam Metroville Campus Website

Status: DRAFT — items marked (TBD) need client confirmation.
Version: 0.1

## Change Log
| Version | Date | Change | Approved by | Affects specs |
|---|---|---|---|---|
| 0.1 | — | Initial draft | — | — |

## 1. Overview
A public website and admin dashboard for Dar-e-Arqam School,
Metroville Campus. The public site reproduces the design of
das.edu.pk, adapted for a single campus. The admin dashboard lets
campus staff publish news and handle enquiries.

Goals:
- Give parents a clear, trustworthy view of the campus.
- Capture admission leads and enquiries.
- Let staff publish news without developer help.

## 2. Users
- Visitor: parents, students, and the public. No login.
- Admin: campus staff. One shared role with full access.

## 3. Scope

In scope (this phase):
- Public pages listed in §4.
- Admin dashboard: login, news management, enquiry inbox, signup
  list, settings stub.
- Lead capture (signup) and contact form.

Out of scope (this phase):
- Franchise Offer (card and page removed).
- Email notifications.
- Online admission forms or payments (TBD).
- Student/parent portals.
- Self-hosted video.
- RAG chatbot (future phase, separate service).

## 4. Sitemap

Public (menu structure, including each item's tagline and dropdown
sub-pages, confirmed directly against the live das.edu.pk site and
screenshots/das.edu.pk_*.png — see specs/001-site-shell/spec.md
Assumptions for how this superseded the original TBD guesses):
- Home — / ("Front Page")
- About — /about ("Who We Are?"; subpages: Overview, Salient
  Features, Management, Messages)
- Campuses — /campuses ("Branch Network")
- Academics — /academics ("Our Courses"; subpages: Academics
  Overview, Syllabi, Examinations, Teachers' Training, Hifz-e-Quran
  [this last one lives at the top-level /hifz-e-quran, not nested])
- Admission — /admission ("Apply Now"; subpages: Admission
  Procedure, Class Levels, Uniform)
- Resources — /resources ("Gallery & Download"; subpages: Photo
  Gallery, Prospectus, Our Books, Monthly Arqam, Newsletters, Useful
  Links, Scarlet Mobile Apps) — supersedes the original "one page
  with sections" assumption; the real site uses real subpages
- News — /news and /news/[slug] ("Latest News"; subpages: Head
  Office, Events, Activities, Achievements, Announcements)
- Contact — /contact ("Call or Mail")

The reference header also has a search icon/searchbar. The site shell
implements a real search over navigation item titles (top-level pages
and their dropdown sub-pages) — see specs/001-site-shell/spec.md
FR-026. Full-text search over page content remains out of scope until
real page content exists beyond the shell's placeholders.

Admin:
- /admin/login
- /admin (overview)
- /admin/news
- /admin/messages
- /admin/signups
- /admin/settings (stub)

Shared on every public page: header (top bar, logo, main menu with
dropdowns, mobile menu) and footer (links, contact details, social
links).

## 5. Public Page Requirements

### 5.1 Home
Sections, in reference order:
- Hero carousel — static images.
- "Find Us Nearby" — links to Campuses (TBD: button or locator).
- Quick-access cards (4): Admission Procedure, Salient Features,
  Branch Network, Education Curriculum.
- Inspiration section — static text + logo.
- Why Choose Dar-e-Arqam — static text + embedded YouTube/Vimeo video
  (URL configurable).
- News highlights — latest published news + "View All News" link.
- Books carousel — static.
- Salient Features cards — static.
- Progress dashboard — students, books, teachers, campuses; fixed
  numbers this phase.
- Icon quick-links — Photo/Videos, Downloads, Our Books (to Resources
  sections), Call/Mail/Chat (to Contact).
- Signup section — name, email, phone.
- Partners carousel — static logos.

### 5.2 About
Static content: overview, mission/vision, management, messages
(TBD: exact sections and whether split into subpages).

### 5.3 Campuses
Metroville campus details: address, map, phone, timings (TBD).
TBD: whether the wider Dar-e-Arqam branch network is also listed,
and if so, whether it is static or admin-managed.

### 5.4 Academics
Static content: curriculum, class levels, syllabus/uniform
information (TBD: exact sections).

### 5.5 Admission
Static content: admission procedure, requirements, fee structure
(TBD), prospectus download link, call to action to Contact or the
signup form.

### 5.6 Resources
One page with anchored sections:
- Photo Gallery (#photo-gallery) — static images (TBD: admin-managed).
- Downloads (#downloads) — prospectus and documents (TBD: static or
  admin-managed).
- Our Books (#our-books) — static.
- Newsletter/updates signup — same signup as Home.

### 5.7 News
- List page: published news only, newest first, paginated.
- Detail page: title, date, cover image, body.
- TBD: categories (the reference uses Head Office, Events,
  Activities, Achievements, Announcements).
- Supports Urdu titles and text.

### 5.8 Contact
- Campus address, phone, email, map.
- Contact form: name, email, phone, subject, message.
- Success message after submission.

## 6. Admin Requirements

### 6.1 Login
- Email + password; a single admin account created at setup.
- No public registration or password-reset email this phase (TBD).

### 6.2 Overview
- Counts: new messages, total signups, published news.

### 6.3 News
- Create, edit, publish/unpublish, delete (soft).
- Fields: title, slug, cover image, body, publish date, status
  (draft/published), category (TBD).
- List with search and status filter.

### 6.4 Messages
- Inbox of contact form submissions, newest first.
- Status: new, read, responded; admin can change it.
- Filter by status; delete (soft).

### 6.5 Signups
- List of leads: name, email, phone, source page, first and last
  submitted dates.
- Search by name/email; delete (soft).
- TBD: CSV export.

### 6.6 Settings
- Placeholder page only this phase.

## 7. Data (conceptual)
- News — see §6.3.
- Message — contact form submission with status.
- Signup — one record per email; a repeat submission updates it;
  records the page it came from.
- Admin — managed by the auth system.
- Campus — TBD (depends on §5.3).

## 8. Quality Requirements
- Visual match with das.edu.pk reference on mobile, tablet and
  desktop.
- Content editable by staff where marked admin-managed; all other
  copy supplied by the client.
- Accessible menus and forms; fast-loading images.

## 9. Build Order (one spec each)
1. 001-site-shell — header, footer, layout
2. 002-foundation — database, admin login, admin layout
3. 003-news — admin news management + public news pages
4. 004-signup — signup form, storage, admin signup list
5. 005-home
6. 006-campuses
7. 007-contact — contact form + admin messages inbox
8. 008-resources
9. 009-about-academics-admission — static content pages
10. 010-admin-overview-settings

## 10. Future Phases
- RAG chatbot answering questions about the school.
- Possibly: real-time stats, email notifications, online admission.

## 11. Open Questions
1. About and Academics: single pages or subpages? Which sections?
2. Campuses: Metroville only, or the full branch network?
   "Find Us Nearby": button or locator?
3. Photo gallery and downloads: static or admin-managed?
4. News categories: keep, change, or drop?
5. Admission: information only, or an online form?
6. Signups: is CSV export needed?
7. Admin password reset: needed this phase?
8. Domain, hosting, and who supplies copy and images, by when?