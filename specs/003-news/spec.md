# Feature Specification: News

**Feature Branch**: `003-news`
**Created**: 2026-09-21
**Status**: Draft
**Input**: User description: "Feature Brief — 003 News: Admin news management plus the public news list and detail pages. References: docs/prd.md §5.7, §6.3; reference screenshots; research/design-tokens.md; admin UI patterns built in 002 (table, form, dialog, toasts). User stories: P1 admin writes and publishes a news post (title, cover image, rich-text body with headings/bold/italic/lists/links, publish date, draft/published status; slug generated from title, editable, unique; save as draft, publish, unpublish; editing keeps the address unless changed by hand; clear success and error messages). P1 admin manages the list of posts (table newest first with cover thumbnail, title, status, publish date; search by title; filter by status; paginated; delete asks for confirmation and is soft/recoverable; deleted posts disappear from admin list and public site). P1 visitor reads the news (/news lists published posts only, newest first, paginated, with cover image, title, date and short excerpt; /news/[slug] shows title, date, cover image, body; unpublished, future-dated or deleted posts return page not found; layout matches reference screenshots). P2 images (admin uploads a cover image from their computer; oversized images handled without breaking layout; public pages load appropriately sized versions; a post without a cover image still displays correctly; each image has descriptive alt text supplied by the admin). P2 Urdu support (titles and body in Urdu display in the correct direction and font in the admin editor, the list and the public pages; mixed English and Urdu displays correctly). P3 sharing and discovery (each post page has title, description and preview image for search engines and social sharing; news list links from the site menu built in 001). Categories: confirm before building — docs/prd.md leaves them open; if confirmed, one category per post from a fixed list shown as a label and usable as a filter; if not confirmed, leave out entirely. Edge cases: two posts with the same title still get different addresses; very long titles do not break the table or cards; a post with no body or only an image is rejected with a clear message; friendly empty state on the public list; leaving the editor with unsaved changes warns first; a failed upload does not lose the text already written. Out of scope: comments, likes, view counts; scheduled auto-publishing (a future publish date simply stays hidden until that date); multiple authors or per-author attribution; newsletter sending. Acceptance: E2E tests create a draft, publish it, see it on the public list and detail page, unpublish it, confirm it disappears, delete it, confirm the address returns not found; tests prove every admin news route rejects unauthorized requests; tests prove drafts and deleted posts are never returned publicly; pages match the reference screenshots at 375, 768, 1024 and 1440px."

## Clarifications

### Session 2026-09-21

- Q: Should posts have categories? → A: Yes — one required category
  per post from the fixed list Head Office, Events, Activities,
  Achievements, Announcements; shown as a label on cards and the
  detail page; filterable on `/news` (own address per category) and
  in the admin list.
- Cover image limit is 5 MB, matching the site-wide image limit.
- Each post has an explicit language field (English or Urdu, default
  English) that governs direction and font wherever the post is
  shown, instead of detecting direction per paragraph.

## Reference Material

- `docs/prd.md` §5.7 (public news) and §6.3 (admin news).
- Reference screenshots (resolving the brief's TODO):
  - Public list, desktop: `screenshots/das.edu.pk_news_.png`
  - Public list, tablet: `screenshots/das.edu.pk_news_(iPad Pro).png`
  - Public list, phone: `screenshots/das.edu.pk_news_(Moto G Power).png`
  - Public list filtered by category: `screenshots/das.edu.pk_news_head-office_.png`,
    `…_news_events_.png`, `…_news_activities_.png`,
    `…_news_achievements_.png`, `…_news_announcements_.png`
  - Post detail (Urdu title and body): `screenshots/das.edu.pk_news_head-office_%d9%81…_.png`
- `research/design-tokens.md` for colours, fonts and spacing.
- Admin building blocks delivered in 002: admin layout, protected
  routes, data table, form, confirmation dialog, toasts, soft delete.

What the reference shows: the list page has a banner titled "News"
with a "Home » News" breadcrumb, then a three-column grid of cards
(one column on phones). Each card shows the cover image, the title,
the date, a category label, a short excerpt ending in "[...]" and a
"Read More" link. The detail page has a banner with the post title
and breadcrumb, the cover image at full content width, then the body.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin writes and publishes a news post (Priority: P1)

The admin opens the News section of the admin area, starts a new
post, and fills in a title, an optional cover image with alternative
text, a body written in a simple rich-text editor (headings, bold,
italic, bulleted and numbered lists, links), a publish date and a
status. The web address for the post is suggested from the title as
they type and can be changed by hand; it must be unique. The admin
can save the post as a draft (not visible to visitors), publish it
when ready, and unpublish it later. Editing an existing post keeps
its address unless the admin changes it deliberately. Every save,
publish, unpublish and failure produces a clear message.

**Why this priority**: Without a way to author and publish posts, the
public news pages have nothing to show. This is the core of the
feature and the first thing the school will use.

**Independent Test**: Log in as admin, create a post with a title and
body, save it as a draft, then publish it. The post exists with the
expected address, status and dates, and the success messages appear.
No public page is needed to verify this story.

**Acceptance Scenarios**:

1. **Given** the admin is on the new-post screen, **When** they type
   the title "Annual Sports Day 2026", **Then** the address field
   fills with `annual-sports-day-2026` and remains editable.
2. **Given** a valid title and body, **When** the admin chooses
   "Save as draft", **Then** the post is stored with status Draft,
   a confirmation message appears, and the post is not visible on
   the public site.
3. **Given** a draft post, **When** the admin chooses "Publish",
   **Then** the status becomes Published, a confirmation appears,
   and the post is visible on the public site if its publish date
   is today or earlier.
4. **Given** a published post, **When** the admin chooses
   "Unpublish", **Then** the status returns to Draft and the post
   disappears from the public site immediately.
5. **Given** an existing post whose address is `sports-day`, **When**
   the admin edits the title to "Sports Day (updated)" and saves,
   **Then** the address is still `sports-day`.
6. **Given** an existing post, **When** the admin changes the
   address field to `sports-day-2026` and saves, **Then** the post
   is reachable at the new address and the old address returns
   "page not found".
7. **Given** a post is being saved with an address that another
   post already uses, **When** the admin saves, **Then** the save is
   rejected with a message naming the address conflict, and the
   admin's other input is preserved.
8. **Given** the admin submits a post with an empty title or an empty
   body, **When** they save, **Then** the save is rejected and the
   message names the missing field.
9. **Given** the admin uses the editor toolbar, **When** they apply a
   heading, bold, italic, a list or a link, **Then** the formatting
   is stored and shown identically on the public detail page.
10. **Given** the admin creates a new post, **When** the form opens,
    **Then** the publish date defaults to today and the status
    defaults to Draft.

---

### User Story 2 - Admin manages the list of posts (Priority: P1)

The admin sees all posts in a table ordered newest first (by publish
date), with the cover thumbnail, title, status and publish date. They
can search by title, filter by status, and page through the list when
it grows. From the table they can open a post to edit it or delete
it. Deleting asks for confirmation; deleted posts vanish from the
admin list and the public site but are not destroyed, so they can be
restored later by a developer if needed.

**Why this priority**: The school will accumulate many posts; finding,
editing and removing them is daily admin work and is required for the
publish/unpublish/delete flow that the acceptance tests cover.

**Independent Test**: With several posts of mixed status seeded, the
admin can find a specific post by title, narrow to drafts only, move
between pages, delete a post after confirming, and see it disappear.

**Acceptance Scenarios**:

1. **Given** posts exist with different publish dates, **When** the
   admin opens the News list, **Then** posts appear newest first with
   thumbnail, title, status and publish date in each row.
2. **Given** a post has no cover image, **When** it appears in the
   table, **Then** a neutral placeholder is shown in the thumbnail
   column and the row layout is unchanged.
3. **Given** the admin types part of a title into the search box,
   **When** the results update, **Then** only posts whose titles
   contain that text (case-insensitive) are listed, and the search
   also works for Urdu text.
4. **Given** the admin selects the "Draft" filter, **When** results
   update, **Then** only drafts are listed; selecting "Published"
   lists only published posts; "All" lists both.
5. **Given** more posts than one page holds, **When** the admin moves
   to the next page, **Then** the next set of posts appears and the
   current search and filter are kept.
6. **Given** the admin clicks Delete on a row, **When** the
   confirmation dialog appears and they confirm, **Then** the post
   disappears from the table, a confirmation message appears, and
   the post's public address returns "page not found".
7. **Given** the admin clicks Delete and then cancels, **When** the
   dialog closes, **Then** nothing changes.
8. **Given** a post with a very long title (200 characters), **When**
   it appears in the table, **Then** the title is truncated with an
   ellipsis and the full title is available on hover, without
   breaking the row or table width.

---

### User Story 3 - Visitor reads the news (Priority: P1)

A visitor opens `/news` from the site menu and sees published posts,
newest first, as cards with cover image, title, date and a short
excerpt, with pagination when there are more posts than one page
shows. Clicking a card opens `/news/<address>` with the full post:
title, date, cover image and body. Posts that are drafts, dated in
the future or deleted are not listed and their addresses return
"page not found". The pages follow the reference screenshots in
layout and styling at phone, tablet and desktop widths.

**Why this priority**: This is the visitor-facing value of the whole
feature; the school publishes news so parents and the community can
read it.

**Independent Test**: With a mix of published, draft, future-dated and
deleted posts seeded, `/news` shows only the currently published ones
in the right order; each listed post opens correctly; every excluded
post's address returns "page not found".

**Acceptance Scenarios**:

1. **Given** published posts exist, **When** a visitor opens `/news`,
   **Then** they see a banner titled "News", a breadcrumb, and a grid
   of cards ordered newest first, each with cover image (or a
   placeholder), title, date, category label and excerpt.
2. **Given** there are more published posts than fit one page,
   **When** the visitor reaches the end of the list, **Then** they
   can move to the next page, and each page has its own address so
   it can be shared or bookmarked.
3. **Given** a visitor clicks a card, **When** the detail page opens,
   **Then** it shows the title, formatted date, cover image and full
   body with the formatting the admin applied.
4. **Given** a post is a draft, or is dated in the future, or is
   deleted, **When** anyone visits its address, **Then** the site
   returns a "page not found" response, indistinguishable from an
   address that never existed.
5. **Given** no posts are published, **When** a visitor opens
   `/news`, **Then** a friendly empty state explains that there is
   no news yet, within the normal page layout.
6. **Given** the visitor is on a phone (375px), **When** they view
   the list, **Then** cards stack in one column, images scale to
   width, and nothing scrolls sideways.
7. **Given** a post whose body contains links, **When** the visitor
   clicks one, **Then** it opens as expected, and links to other
   websites open in a new tab.

---

### User Story 4 - Cover images (Priority: P2)

The admin picks a cover image from their computer while editing a
post and supplies descriptive alternative text. Large images are
accepted and stored without breaking any layout; the public list and
detail pages load versions sized to the screen so pages stay fast.
A post without a cover image still displays correctly everywhere.

**Why this priority**: Images make the news list attractive and match
the reference, but a text-only post is still a useful post; this can
follow the core authoring flow.

**Independent Test**: Upload a 4000×3000 photo as a cover image, save
the post, and confirm the admin thumbnail, list card and detail page
all show it correctly proportioned; confirm a post with no image
renders cleanly in all three places.

**Acceptance Scenarios**:

1. **Given** the admin is editing a post, **When** they choose an
   image file from their computer, **Then** a preview appears in the
   form before saving, and an alternative-text field is required
   whenever an image is present.
2. **Given** a chosen file is not an image, or is larger than the
   allowed size, **When** the admin tries to upload it, **Then** a
   clear message explains the accepted types and size limit, and the
   rest of the form is untouched.
3. **Given** the upload fails for any reason (connection loss,
   server error), **When** the failure is reported, **Then** the
   title, body and other fields the admin has already entered are
   still in place and can be saved without the image.
4. **Given** a post has a cover image, **When** the admin removes it
   and saves, **Then** the post is shown without an image everywhere.
5. **Given** a very tall or very wide cover image, **When** it is
   shown on a card or detail page, **Then** it fits its container at a
   consistent aspect ratio without stretching the layout.
6. **Given** a visitor loads the list page on a phone, **When** the
   images load, **Then** they are not full-resolution originals but
   versions sized for the screen.

---

### User Story 5 - Urdu support (Priority: P2)

Each post has a language: English or Urdu (default English), chosen
by the admin when writing the post. An Urdu post is shown
right-to-left in the site's Urdu font — title, excerpt and body — in
the admin editor, the admin list, the public list card and the
detail page. English words that appear inside Urdu text (names,
acronyms, places) still read correctly. Searching the admin list by
title works for Urdu titles.

**Why this priority**: The reference site publishes Urdu posts today;
a news feature that shows Urdu wrongly is unusable for the school,
but the flow can be validated first with English content.

**Independent Test**: Create one post in Urdu (with a few English
words inside the body) and one in English; view both in the admin
table, the editor, the public list and the detail page, and confirm
direction, alignment and font are correct in each; search the admin
list by part of the Urdu title and find the post.

**Acceptance Scenarios**:

1. **Given** the admin creates a new post, **When** the form opens,
   **Then** the language is English by default and can be switched
   to Urdu.
2. **Given** the admin sets the language to Urdu, **When** they type
   the title and body, **Then** the title field and the editor switch
   to right-to-left with the Urdu font while they type.
3. **Given** an Urdu post, **When** it appears in the admin table, the
   public card and the detail page, **Then** the title, excerpt and
   body are right-aligned, read right-to-left, and use the Urdu font,
   with list markers on the right.
4. **Given** an Urdu post whose body contains English words, **When**
   the post is viewed anywhere, **Then** the English words read
   left-to-right within the right-to-left line and the line order is
   not disturbed.
5. **Given** an English post, **When** it is viewed anywhere,
   **Then** it reads left-to-right in the site's standard font.
6. **Given** the admin types part of an Urdu title into the admin
   search box, **When** results update, **Then** the matching Urdu
   post is listed.
7. **Given** an Urdu title, **When** the address is generated,
   **Then** the address is still valid and reachable (see
   Assumptions for how Urdu addresses are formed).

---

### User Story 6 - Sharing and discovery (Priority: P3)

Each public post page carries a title, a description and a preview
image so that search engines index it properly and links pasted into
social media or messaging apps show a rich preview. The News entry in
the site menu (built in 001) leads to the list page.

**Why this priority**: Improves reach once posts exist; not needed to
publish or read news.

**Independent Test**: Publish a post with a cover image and paste its
address into a link-preview checker; the preview shows the post
title, an excerpt and the cover image. Confirm the site menu's News
item opens `/news`.

**Acceptance Scenarios**:

1. **Given** a published post with a cover image, **When** its address
   is shared, **Then** the preview shows the post title, a description
   derived from the body, and the cover image.
2. **Given** a published post without a cover image, **When** its
   address is shared, **Then** the preview shows the title and
   description with the site's default preview image.
3. **Given** the public site header, **When** the visitor clicks
   "News", **Then** `/news` opens and the menu marks it as current.
4. **Given** the news list has multiple pages, **When** a search engine
   reads them, **Then** each page has its own title indicating the
   page number.

---

### User Story 7 - Categories (Priority: P2)

Every post belongs to exactly one category from a fixed list: Head
Office, Events, Activities, Achievements, Announcements. The admin
picks the category when writing a post. The category appears as a
label next to the date on each public card and on the detail page
(as on the reference). Visitors can narrow the news list to one
category, and each filtered list has its own address so it can be
linked and indexed. The admin list can also be filtered by category.

**Why this priority**: The reference site shows a category on every
post and offers per-category pages; the school uses them to separate
head-office notices from campus activities. Posts can be authored and
read without the filter, so this follows the core stories.

**Independent Test**: Seed posts across at least three categories;
confirm each card and detail page shows the right label, that
choosing a category on `/news` lists only that category's published
posts at a category-specific address, and that the admin list filter
narrows in the same way.

**Acceptance Scenarios**:

1. **Given** the admin creates a post, **When** the form opens,
   **Then** a category must be chosen from the fixed list before the
   post can be saved, and saving without one is rejected with a
   message naming the category field.
2. **Given** a published post in "Events", **When** a visitor views
   its card or detail page, **Then** the label "Events" is shown next
   to the date.
3. **Given** published posts in several categories, **When** a visitor
   chooses "Head Office" on `/news`, **Then** only Head Office posts
   are listed, newest first, paginated, at an address specific to that
   category, with the page title reflecting the category.
4. **Given** a visitor is viewing a category list, **When** they
   choose "All", **Then** the full list returns.
5. **Given** a category has no published posts, **When** a visitor
   opens its list, **Then** the friendly empty state is shown within
   the normal layout.
6. **Given** the admin list, **When** the admin filters by category,
   **Then** only posts in that category are shown, combined with any
   search text and status filter, and kept across pages.
7. **Given** a visitor requests a category address that is not in the
   fixed list, **When** the page is requested, **Then** the site
   returns "page not found".

---

### Edge Cases

- Two posts given the same title: the second gets a different address
  (a numeric suffix), and the admin sees the suggested address before
  saving.
- Title changed after publishing: the address stays the same unless
  the admin edits the address field.
- Very long titles (up to 200 characters) are truncated with an
  ellipsis in the admin table and wrap on public cards without
  overflowing.
- A post with no body, or with only an image and no text, is rejected
  with a message that the body is required.
- A post with formatting only (empty headings, empty list items) and
  no readable text counts as an empty body.
- Public list with nothing published shows a friendly empty state.
- Leaving the editor (navigating away, closing the tab) with unsaved
  changes prompts a warning first; saving clears the warning.
- A failed image upload leaves all other entered fields intact.
- A published post whose date is later moved into the future
  disappears from the public site until that date.
- A post is deleted while a visitor has its detail page open: the
  page they already loaded stays, but refreshing returns "page not
  found".
- Address containing characters that are not allowed (spaces,
  punctuation, upper case) is normalised before saving, and the admin
  sees the normalised result.
- Links in the body pointing to unsafe schemes (for example script
  links) are rejected or stripped.
- Pasting formatted content from a word processor into the editor
  keeps only the supported formatting (headings, bold, italic, lists,
  links) and drops everything else.

## Requirements *(mandatory)*

### Functional Requirements

**Authoring**

- **FR-001**: The admin MUST be able to create a post with a title
  (required, 1–200 characters), an address (required, unique), a body
  (required, rich text), a language (English or Urdu, defaults to
  English), a category (required, see FR-036), a publish date (required, defaults to today), a status
  (Draft or Published, defaults to Draft), and an optional cover image
  with required alternative text when an image is present.
- **FR-002**: The body editor MUST support headings, bold, italic,
  bulleted lists, numbered lists and links, and MUST NOT allow other
  formatting or embedded content to be saved.
- **FR-003**: The address MUST be suggested automatically from the
  title while creating a post, MUST be editable by the admin, and MUST
  stop being auto-suggested once the admin edits it by hand or the
  post has been saved once.
- **FR-004**: Addresses MUST be unique across all posts, including
  soft-deleted ones. A conflicting address MUST be rejected with a
  message that names the conflict and preserves the admin's other
  input. When the system generates an address that already exists, it
  MUST append a numeric suffix to make it unique.
- **FR-005**: Addresses MUST be normalised to lower case with words
  separated by hyphens and no leading or trailing hyphens. Letters
  from the Urdu script MUST be preserved so Urdu titles produce
  readable addresses; when normalisation yields nothing usable the
  system MUST fall back to a date-based address.
- **FR-006**: The admin MUST be able to save a post as Draft, publish
  it, and unpublish it (return it to Draft). Each of these actions
  MUST be a single explicit control on the edit screen.
- **FR-007**: Every save, publish, unpublish, delete and upload MUST
  show a success message on completion or a specific error message on
  failure, using the toast pattern from 002.
- **FR-008**: A post with an empty title, an empty body, or a body
  containing no readable text MUST be rejected with a message naming
  the missing field.
- **FR-009**: The editor MUST warn before the admin leaves the page
  with unsaved changes.

**Admin list**

- **FR-010**: The admin news list MUST show every non-deleted post,
  ordered by publish date newest first (ties broken by most recently
  updated), with cover thumbnail (or placeholder), title, status and
  publish date.
- **FR-011**: The admin list MUST support case-insensitive search on
  title (including Urdu text) and a status filter (All, Draft,
  Published), combinable, with the current search and filter kept
  when moving between pages.
- **FR-012**: The admin list MUST be paginated with 20 posts per page.
- **FR-013**: Delete MUST ask for confirmation in a dialog before
  acting, MUST soft-delete (using the 002 soft-delete building block),
  and MUST remove the post from the admin list and the public site
  immediately. Soft-deleted posts are not shown or restorable through
  the admin screens in this feature.
- **FR-014**: Published posts whose publish date is in the future MUST
  be visibly marked in the admin list so the admin understands why
  they are not on the public site yet.

**Public pages**

- **FR-015**: `/news` MUST list only posts that are Published, not
  deleted, and whose publish date is today or earlier, ordered by
  publish date newest first.
- **FR-016**: The public list MUST show 9 posts per page and MUST
  expose each further page at its own address so pages can be shared,
  bookmarked and indexed.
- **FR-017**: Each public card MUST show the cover image (or a
  placeholder when absent), title, formatted date, category label and
  an excerpt of
  roughly the first 160 characters of the body's plain text, ending
  with an ellipsis when cut.
- **FR-018**: `/news/<address>` MUST show the title, formatted date,
  category label, cover image (when present) and the full formatted
  body.
- **FR-019**: Any request for a post that is Draft, deleted, or dated
  in the future MUST return a "page not found" response identical to
  the response for an address that never existed.
- **FR-020**: The public list MUST show a friendly empty state when no
  post qualifies for display.
- **FR-021**: Public pages MUST follow the reference screenshots for
  layout, spacing, colours and type at 375, 768, 1024 and 1440px,
  using the tokens in `research/design-tokens.md`, with no horizontal
  scrolling at any of these widths.
- **FR-022**: Links in the body that point to other websites MUST open
  in a new tab; links with unsafe schemes MUST never be rendered as
  clickable.

**Images**

- **FR-023**: The admin MUST be able to upload a cover image from their
  computer in JPEG, PNG or WebP format up to 5 MB (the site-wide
  image limit); other types or
  larger files MUST be rejected with a message stating the accepted
  types and limit.
- **FR-024**: A failed upload MUST NOT discard or reset any other
  field the admin has entered.
- **FR-025**: The admin MUST be able to remove the cover image from a
  post; the post MUST then display correctly without an image in the
  admin table, list cards and detail page.
- **FR-026**: Public pages MUST serve cover images in sizes
  appropriate to the viewer's screen rather than the original upload,
  and images MUST be shown at a consistent aspect ratio on cards
  without distortion.
- **FR-027**: Every rendered cover image MUST carry the alternative
  text supplied by the admin.

**Urdu**

- **FR-028**: Each post MUST have a language of English or Urdu,
  defaulting to English, chosen by the admin on the post form.
- **FR-029**: A post's language MUST determine its text direction and
  font everywhere the post's title, excerpt or body is shown: the
  admin title field, the admin editor (while typing), the admin
  table, the public list card, the detail page and the page title.
  Urdu posts MUST read right-to-left in the site's Urdu font; English
  posts MUST read left-to-right in the site's standard font.
- **FR-030**: English words inside Urdu text MUST display correctly
  (left-to-right within the right-to-left line, without breaking line
  order), and admin title search MUST match Urdu titles.

**Sharing and discovery**

- **FR-031**: Each post page MUST provide a page title, a description
  derived from the excerpt, and a preview image (the cover image, or
  the site default when absent) for search engines and social
  sharing.
- **FR-032**: Each page of the news list MUST have a distinct page
  title that includes the page number beyond page one.
- **FR-033**: The News item in the site menu MUST link to `/news` and
  MUST be marked current on the list and detail pages.

**Security**

- **FR-034**: Every admin news action (create, read for editing,
  update, publish, unpublish, delete, upload) MUST reject requests
  without a valid admin session, using the 002 protection.
- **FR-035**: Body content MUST be cleaned on save so that only the
  supported formatting survives, and public pages MUST never execute
  anything embedded in a post.

**Categories**

- **FR-036**: Each post MUST have exactly one category from the fixed
  list: Head Office, Events, Activities, Achievements, Announcements.
  Saving a post without a category MUST be rejected with a message
  naming the field. The list is fixed in this feature; admins cannot
  add or rename categories.
- **FR-037**: The category MUST be shown as a label next to the date
  on each public card and on the detail page.
- **FR-038**: `/news` MUST offer a category filter; each category's
  list MUST have its own address, MUST apply the same visibility
  rules and ordering as the full list, MUST be paginated, and MUST
  carry a page title that names the category. An address for a
  category not in the fixed list MUST return "page not found".
- **FR-039**: The admin list MUST offer a category filter that
  combines with title search and the status filter and is kept when
  moving between pages.

### Key Entities

- **News Post**: A single article. Attributes: title, address (slug),
  body (formatted text), excerpt (derived from body), language
  (English or Urdu), publish date,
  status (Draft or Published), cover image reference, cover image
  alternative text, category, created and updated times, deleted
  marker (soft delete).
- **Cover Image**: An uploaded image file belonging to at most one
  post at a time, with its original dimensions, and available in
  smaller sizes for public display.
- **Category**: One of a fixed set of five names (Head Office,
  Events, Activities, Achievements, Announcements); a post belongs to
  exactly one.

## Deviations from the Reference

- The reference uses a "Load more posts" button; this feature uses
  page-by-page navigation with addressable pages so each page can be
  shared and indexed.
- The reference detail page shows only a hero banner and body; this
  feature adds a visible formatted date under the title, per PRD §5.7.

## Assumptions

- Excerpts are derived automatically from the body (about the first
  160 characters of plain text); there is no separate excerpt field.
- The public list shows 9 posts per page (matching the reference's
  three-by-three grid); the admin list shows 20 per page.
- Dates are shown in the format used by the reference ("February 6th,
  2023"); the publish date is a calendar date without a time, and
  "today or earlier" is judged in Pakistan Standard Time.
- Addresses preserve Urdu letters so Urdu posts get readable
  addresses, matching the reference site; admins may replace them with
  a Latin address by hand.
- Soft-deleted posts keep their address reserved (uniqueness includes
  deleted posts) so a deleted address is never silently reused by a
  different post.
- Restoring a soft-deleted post is a developer operation in this
  feature; an admin restore screen is not built.
- Cover image limits: JPEG, PNG or WebP up to 5 MB, matching the
  site-wide image limit.
- Images are only used as covers; inline images inside the body are
  not part of this feature.
- The public site continues to show admin-side changes within the
  short delay already established for other admin-managed content.
- A single admin exists (from 002); there is no per-author
  attribution, so posts do not record an author.

## Out of Scope

- Comments, likes, view counts.
- Scheduled auto-publishing; a future-dated published post simply
  stays hidden until its date.
- Multiple authors or per-author attribution.
- Newsletter sending.
- Inline images, embedded video or tables inside the body.
- Admin-side restore of deleted posts, and a trash view.
- Tags or multiple categories per post; admin-managed category lists.
- Full-text search of body content on the public site.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can create, draft-save and publish a post with
  a title, body and cover image in under 3 minutes on the first
  attempt, guided only by the on-screen labels and messages.
- **SC-002**: 100% of requests for draft, future-dated or deleted
  posts, and for the edit screens or actions without an admin
  session, are refused — proven by automated tests covering every
  admin news action and every exclusion rule.
- **SC-003**: The end-to-end journey (create draft → publish → appears
  on `/news` and its detail page → unpublish → disappears → delete →
  address returns not found) passes as an automated test.
- **SC-004**: The public list and detail pages render without visual
  defects at 375, 768, 1024 and 1440px, matching the reference
  screenshots in layout, with no horizontal scrolling.
- **SC-005**: The news list page becomes readable within 2 seconds on
  a typical mobile connection, and a list page of 9 posts with cover
  images transfers no more than 1.5 MB of images at desktop width.
- **SC-006**: Urdu posts (including English words inside Urdu text)
  and English posts display with correct
  direction and font in all six places listed in FR-029, verified by
  visual review of two seeded posts.
- **SC-007**: Sharing a published post's address in a link-preview
  tool shows the post's title, description and cover image.
- **SC-008**: In the admin list, finding a post among 100 by title
  search takes one action and returns results in under 1 second.
- **SC-009**: Every published post shows its category label on the
  card and detail page, and each of the five category lists shows
  only that category's posts — verified by automated tests over
  seeded posts.
