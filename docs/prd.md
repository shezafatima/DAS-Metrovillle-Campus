# PRD — Dar-e-Arqam Metroville Campus Website

Status: DRAFT — items marked (TBD) need client confirmation.
Version: 0.2

## Change Log
| Version | Date | Change | Approved by | Affects specs |
|---|---|---|---|---|
| 0.1 | — | Initial draft | — | — |
| 0.2 | — | Settings becomes a real feature (contact, socials, stats, video URL, hero slides with images or videos, gallery); build order updated | — | 001 (contact details move to Settings), 005, 006, 009 |

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
  list, site settings (see §6.6).
- Lead capture (signup) and contact form.

Out of scope (this phase):
- Franchise Offer (card and page removed).
- Email notifications.
- Online admission forms or payments (TBD).
- Student/parent portals.
- Self-hosted video (hero videos are uploaded to Cloudinary; the Why
  Choose video stays an external embed).
- RAG chatbot (future phase, separate service).

## 4. Sitemap

Public:
- Home — /
- About — /about (TBD: single page or subpages: Overview, Salient
  Features, Management, Messages)
- Campuses — /campuses
- Academics — /academics (TBD: subpages such as Curriculum, Syllabus,
  Uniform)
- Admission — /admission
- Resources — /resources (one page with sections: Photo Gallery,
  Downloads, Our Books)
- News — /news and /news/[slug]
- Contact — /contact

Admin:
- /admin/login
- /admin (overview)
- /admin/news
- /admin/messages
- /admin/signups
- /admin/settings

Shared on every public page: header (top bar, logo, main menu with
dropdowns, mobile menu) and footer (links, contact details, social
links).

## 5. Public Page Requirements

### 5.1 Home
Sections, in reference order:
- Hero carousel — admin-managed slides, each an image or a short
  video (see §6.6).
- "Find Us Nearby" — links to Campuses (TBD: button or locator).
- Quick-access cards (4): Admission Procedure, Salient Features,
  Branch Network, Education Curriculum.
- Inspiration section — static text + logo.
- Why Choose Dar-e-Arqam — static text + embedded YouTube/Vimeo video
  (URL set in Settings).
- News highlights — latest published news + "View All News" link.
- Books carousel — static.
- Salient Features cards — static.
- Progress dashboard — students, books, teachers, campuses; numbers
  set in Settings.
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
- Photo Gallery (#photo-gallery) — images managed in Settings.
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
Admin-editable site content, organised in groups with fixed fields
(layout never changes, only content):
- Contact & social: phone, email, address, map link, social links.
  Used by the header, footer and Contact page.
- Stats: students, books, teachers, campuses (home progress
  dashboard).
- Why Choose video: external YouTube/Vimeo URL.
- Hero slides: ordered list; each slide is an image or a short video,
  with optional mobile version, alt text, optional heading and
  optional button (label + link); slides can be hidden.
- Photo gallery: ordered images with captions. Changes appear on the
  live site shortly after saving.

## 7. Data (conceptual)
- News — see §6.3.
- Message — contact form submission with status.
- Signup — one record per email; a repeat submission updates it;
  records the page it came from.
- Admin — managed by the auth system.
- Campus — TBD (depends on §5.3).
- Settings — one record per group in §6.6.

## 8. Quality Requirements
- Visual match with das.edu.pk reference on mobile, tablet and
  desktop.
- Content editable by staff where marked admin-managed; all other
  copy supplied by the client.
- Accessible menus and forms; fast-loading images.

## 9. Build Order (one spec each)
1. 001-site-shell — header, footer, layout (done)
2. 002-foundation — database, admin login, admin layout (done)
3. 003-news — admin news management + public news pages
4. 004-signup — signup form, storage, admin signup list
5. 005-settings — site settings (§6.6); header/footer contact details
   switch to Settings
6. 006-home — reads from Settings and News
7. 007-campuses
8. 008-contact — contact form + admin messages inbox
9. 009-resources — gallery reads from Settings
10. 010-about-academics-admission — static content pages
11. 011-admin-overview — real counts on the overview cards

## 10. Future Phases
- RAG chatbot answering questions about the school.
- Possibly: real-time stats, email notifications, online admission.

## 11. Open Questions
1. About and Academics: single pages or subpages? Which sections?
2. Campuses: Metroville only, or the full branch network?
   "Find Us Nearby": button or locator?
3. Downloads: static or admin-managed? (gallery now in Settings)
4. News categories: keep, change, or drop?
5. Admission: information only, or an online form?
6. Signups: is CSV export needed?
7. Admin password reset: needed this phase?
8. Domain, hosting, and who supplies copy and images, by when?
