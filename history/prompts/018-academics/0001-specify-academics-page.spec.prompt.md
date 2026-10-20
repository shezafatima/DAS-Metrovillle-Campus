---
id: 0001
title: Specify Academics page
stage: spec
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 018-academics
branch: 018-academics
user: shezafatima
command: /sp.specify
labels: ["academics", "spec", "content", "video", "redirects"]
links:
  spec: specs/018-academics/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/018-academics/spec.md
 - specs/018-academics/checklists/requirements.md
 - history/prompts/018-academics/0001-specify-academics-page.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

/sp.specify # Feature Brief — 018-academics

Status: ready for /sp.specify
Depends on: navigation sections conversion, 017-about (patterns:
content files, placeholder-in-dev / hidden-in-prod, release gate)
Feeds into: 014-page-content (Academics tab in Settings)

## Goal

Build the public Academics page at `/academics` as one page with three
anchored sections. The reference site has text only, so this page adds
our own visuals within the existing theme.

## Source content

| Section | Source |
|---|---|
| Academic Overview | `academic-excellence.docx` in the `das-text` folder |
| Teachers' Training | the Teachers' Training page on the reference site (das.edu.pk) |
| Hifz-e-Quran | `hifz-e-quran.docx` in the `das-text` folder |

The `das-text` folder is in the project. Find it and confirm both files
are there before starting; if a file name differs, report it rather
than guessing which file is meant.

English only: use only the English text. If a source contains Urdu
text, leave it out and report what was left out.

Rules:
- Use the text exactly as written in the source. Do not rewrite,
  shorten or improve it.
- Teachers' Training: copy the text from the reference page verbatim.
  First check the saved reference material in the repo (screenshots,
  research notes); if the text isn't there, fetch the live page. Record
  the source URL in the content file. If the page can't be reached,
  stop and ask me for the text; do not write it yourself.
- List typos or grammar problems for client approval; don't fix them
  silently.
- Keep paragraph breaks, headings and lists.
- Report anything in a source that doesn't fit its section.

## Page structure

One `h1`. Each section has an `h2` and a stable id, in this order:

| # | Section | Anchor id |
|---|---|---|
| 1 | Academic Overview | `#academic-overview` |
| 2 | Teachers' Training | `#teachers-training` |
| 3 | Hifz-e-Quran | `#hifz-e-quran` |

- The Academics dropdown lists exactly these three anchors, in order.
- Syllabi and Examination are skipped for now. Remove them from the
  dropdown and the page. Their old URLs redirect to `/academics`.
  They will be added in a later feature.
- Update the existing redirects from old `/academics/...` URLs to the
  nearest new anchor. Report the mapping.
- If any link elsewhere points at a removed Academics section, report
  it and repoint it.

## Sections

### 1. Academic Overview
- Heading and text from `academic-excellence.docx`.
- Two-column layout: text on one side, an image on the other. Stacks on
  phones, text first.
- Image: a local placeholder for now, replaceable later. No random
  stock photos (the 017 release gate applies).

### 2. Teachers' Training
- Text from the reference site (see Source content).
- A video, from a URL I'll provide. Ask me for it when you reach this
  section. Assume YouTube unless I say otherwise.
  - Reuse the existing click-to-load video component from the home
    page's Why Choose section (poster first, the player loads only on
    click). No autoplay.
  - If no URL is set, hide the video block.
- 2-3 photos, which I'll add later to
  `public/images/academics/teachers-training/`.
  - Present them in a visual layout, not a plain row: for example an
    overlapping or staggered collage, using the frontend-design skill,
    within the existing theme.
  - Must work with 2 or 3 photos.
  - Development: clearly marked placeholder tiles. Production: if there
    are no photos, hide the photo block (same rule as the About
    management team).
  - Each photo needs alt text; ask me for it when the photos are added.

### 3. Hifz-e-Quran
- Heading and text from `hifz-e-quran.docx`.
- Below the text: one video, 16:9, from an Instagram URL I'll provide.
  Ask me for it when you reach this section.
  - Use the same click-to-load video component as Teachers' Training,
    extended to support an Instagram source as well as YouTube. Do not
    build a second video component.
  - Nothing third-party loads until the visitor clicks: show a poster
    with a play button first. Instagram's embed script must not load
    on page load.
  - Instagram's embed shows its own frame (header, caption) and does
    not fit a clean 16:9 box. Tell me how it looks once you have the
    URL. If it looks poor, the alternative is the same video uploaded
    to the school's YouTube channel, which plays cleanly at 16:9 in the
    existing component; I'll decide from your screenshots.
  - Poster image: a local placeholder until I supply one.
  - If no URL is set, hide the video block.
  - No autoplay.

## Content source and future editing

- Typed content files under `src/content/academics/`, shaped as the
  Academics tab in Settings will edit them in 014.
- Video entries share one shape: `{ provider: "youtube" | "instagram",
  url, posterUrl?, title }`.
- Mark placeholder or edited text as pending client approval.

## Design rules

- Theme colours and fonts unchanged. No new colours or fonts. Add new
  size and spacing values as tokens rather than hard-coding them.
- Section headings use SectionHeading with existing variants. Alternate
  section backgrounds using existing tokens.
- scroll-margin-top token on every section.
- Check at 375, 768, 1024 and 1440 px: no sideways scroll, clean
  stacking, readable line lengths, videos keep 16:9.

## Out of scope

- Syllabi and Examination sections (later).
- Tilawat reels strip (dropped).
- Admin editing of Academics content (014-page-content).

## Open questions for the client

1. Teachers' Training video URL.
2. 2-3 training photos, with a short description of each for alt text.
3. Hifz-e-Quran video URL, and a poster image for it.
4. Academic Overview photo.
5. Approval of any typo fixes found in the sources.

## Acceptance

- `/academics` shows three sections in order with working anchors from
  the dropdown and mobile menu; Syllabi and Examination are gone from
  the menu and redirect to `/academics`.
- Text matches the English sources exactly, apart from approved fixes.
  No Urdu text on the page.
- Both videos load only on click, keep 16:9, and are hidden when no URL
  is set. No third-party script loads before a click.
- No placeholder photos in production.
- axe accessibility scan on `/academics` passes.
- E2E: anchors, redirects, click-to-load for both providers,
  hidden-when-empty blocks, no third-party requests before click,
  layout at four widths.

Follow-up answers during the session:
- Source files: "Yes, use both" (`Academic Excellence .docx`, `HIFZ-UL-QURAN.docx`).
- Missing Hifz sentence: "translate it in  English".
- Academic Overview image in production: "Branded graphic (Recommended)".

## Response snapshot

- Reported that both file names differ from the brief. The owner confirmed `Academic Excellence .docx` and `HIFZ-UL-QURAN.docx`.
- Extracted the English text from both files and listed the Urdu text left out. Verified the Teachers' Training text (1 paragraph and 19 bullets) against the saved screenshot and the live HTML.
- Created branch `018-academics` and wrote spec.md: 5 user stories, FR-001–FR-027, SC-001–SC-008, the redirect mapping table and findings T1–T7.
- Found that the existing YouTube block fetches its poster from i.ytimg.com before a click. The spec requires local posters on /academics.
- Resolved one clarification: the overview image uses a branded placeholder graphic in every mode.

## Outcome

- ✅ Impact: The spec is ready for /sp.plan. Every checklist item passes.
- 🧪 Tests: None. This is the specification stage.
- 📁 Files: spec.md, checklists/requirements.md, this PHR.
- 🔁 Next prompts: /sp.clarify (optional) or /sp.plan.
- 🧠 Reflection: Stopping on the file-name mismatch before creating the branch followed the brief's instruction. The live HTML confirmed the screenshot text character for character.

## Evaluation notes (flywheel)

- Failure modes observed: WebFetch refused to give verbatim text (quotation limits). curl of the raw HTML was used instead.
- Graders run and results (PASS/FAIL): Spec quality checklist PASS (iteration 2).
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Use curl first for verbatim reference text.
