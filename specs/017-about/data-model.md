# Data Model: 017-about

There is no database collection in this feature. The "data" is typed content files under `src/content/about/`, validated by Zod schemas in `src/lib/about/schema.ts`. 014-page-content will store the same values in the database (research R2).

## Shared value forms (match the 005 Settings engine)

| Form | TypeScript | Rule |
|---|---|---|
| Text | `string` | Trimmed; non-empty unless marked optional; max length per field below |
| Long text | `string` | Paragraphs separated by exactly one blank line (`\n\n`); no leading/trailing whitespace; displayed one `<p>` per paragraph |
| Image | `ImageRef \| null` | `ImageRef = { url, publicId, width, height }` from `src/lib/settings/types.ts`; `null` → placeholder |
| List item | `{ id: string; ... }` | `id` is unique within its list, lowercase-hyphenated; list order is display order |
| Urdu block | `{ lang: "ur" \| "ar"; ... }` | Stored verbatim, not displayed in 017 (FR-020) |

## Section values

### OurStory (`src/content/about/our-story.ts`)

| Field | Form | Current value (source: Page 4) |
|---|---|---|
| `heading` | Text ≤ 80 | "Our Story" |
| `subheading` | Text ≤ 160 | "Building a Legacy of Excellence Since 2021" |
| `body` | Long text ≤ 4000 | 3 paragraphs, verbatim |
| `image` | Image | `null` (emblem shown, R7) |
| `urdu` | `{ lang: "ur"; heading; subheading; body }` optional | Urdu heading, subheading, 3 paragraphs, verbatim |

### VisionMission (`vision-mission.ts`)

| Field | Form | Current value (source: page 2) |
|---|---|---|
| `heading` | Text ≤ 80 | "Our Vision & Mission" |
| `subheading` | Text ≤ 160 | "Guided by Faith, Driven by Excellence" |
| `vision` | `{ heading; tagline?; body }` | "Vision" / "Excellence in this World and the Hereafter" / 1 paragraph |
| `mission` | `{ heading; body }` | "Mission" / 1 paragraph |
| `urdu` | `{ vision: { heading, tagline: { lang: "ar", text }, body }, mission: { heading, body }, lang: "ur" }` optional | Urdu Vision with the Arabic Qur'anic line; Urdu Mission |

### CoreValues (`core-values.ts`)

| Field | Form | Current value (source: Page 3) |
|---|---|---|
| `heading` | Text ≤ 80 | "Our Core Values" |
| `subheading` | Text ≤ 160 | "The Principles That Guide Every Step" |
| `intro` | Long text ≤ 1000 | 1 paragraph |
| `values` | List (1–12) of `CoreValue` | 6 items |
| `urdu` | `{ lang: "ur"; heading; subheading; intro; values: { id, name, description }[] }` optional | Urdu, ids match the English values |

`CoreValue` = `{ id; name (Text ≤ 60); description (Text ≤ 240, optional); icon (IconKey) }`

| id | name | icon |
|---|---|---|
| leadership | Leadership | compass |
| responsibility | Responsibility | shield-check |
| commitment | Commitment | target |
| excellence | Excellence | award |
| respect | Respect | heart-handshake |
| citizenship | Citizenship | landmark |

`IconKey` ∈ `compass | shield-check | target | award | heart-handshake | landmark | users | book-open | star | sprout` (closed list, R3).

### ManagementTeam (`management-team.ts`)

| Field | Form | Current value |
|---|---|---|
| `heading` | Text ≤ 80 | "Our Management Team" (brief's label; no document) |
| `subheading` | Text ≤ 160, optional | absent |
| `members` | List (0–24) of `TeamMember` | `[]` (empty until the client supplies them) |

`TeamMember` = `{ id; name (Text ≤ 80); designation (Text ≤ 80); description (Text ≤ 300); photo (Image) }`

`teamPlaceholders` is a separate export, **not** part of the section value. It holds 3 entries, each with `name: "Name"`, `designation: "Designation"`, `description: "Short description"` and `photo: null`. It is used only by `aboutView` when `showPlaceholders` is true and `members` is empty.

### Messages (`messages.ts`)

| Field | Form | Current value (source: Page 1) |
|---|---|---|
| `heading` | Text ≤ 80 | "Messages" (no heading in the document; brief's label) |
| `subheading` | Text ≤ 160, optional | absent |
| `messages` | List (0–12) of `Message` | 3 items. Empty hides the section and its menu entry (FR-016a) |

`Message` = `{ id; name (Text ≤ 80); designation (Text ≤ 120); body (Long text ≤ 4000); photo (Image) }`

| id | name | designation |
|---|---|---|
| director-academic-training | Khairullah Aziz | Director – Academic & Training |
| director-administration-finance | Ijaz Afzal | Director Administration & Finance |
| principal | Faiza Zeeshan | Principal |

`body` keeps the document's straight double quotes as written (FR-018).

## Review metadata (not part of the editable value)

Each content file also exports `review: { status: "approved" | "pending-client-approval"; notes: string[] }`, plus a `// PENDING CLIENT APPROVAL:` comment (the convention used in `src/content/home.ts`). In 017, every section is `pending-client-approval`.

| Section | Notes |
|---|---|
| Story, V&M, Values | Wording is verbatim. Approval is pending on T4 and T5 (Urdu), T6 (headings) and Finding 5 |
| Team | Heading not from a document. Placeholders are dev-only |
| Messages | T1 and T2. Heading not from a document. Photos missing |

The page title "About Us" (in `src/content/about/page.ts`) is also pending.

## Derived view (`src/lib/about/view.ts`)

`aboutView({ members, messageCount, showPlaceholders }) → { sections: VisibleSection[]; teamCards: TeamCard[] }`

- `VisibleSection = { id: AboutSectionId; label: string; background: "surface" | "muted" | "navy" }`, in the fixed order of `pageSections.about`.
- `management-team` is included iff `members.length > 0 || showPlaceholders`.
- `messages` is included iff `messageCount > 0`, in every mode. There are no message placeholders.
- `teamCards` = `members` if non-empty; else `teamPlaceholders` (each flagged `placeholder: true`) if `showPlaceholders`; else `[]`.
- Background: `vision-mission` → `navy`. Other visible sections alternate `surface`, `muted` by their index among the non-V&M visible sections, starting with `surface`.
- `valuesColumns(count)` → `3` when `count % 3 === 0`, else `4` (FR-013). This is the desktop column count only; phones use 1 column and tablets 2.

## Fixed (not editable) definitions

`src/content/site-shell.ts`:
- `pageSections.about` = `our-story` "Our Story", `vision-mission` "Vision & Mission", `core-values` "Core Values", `management-team` "Our Management Team", `messages` "Messages".
- `legacyAboutRedirects` = the 4-entry map in research R5.

Anchor ids and menu labels are layout, not content (Constitution VIII), so 014 cannot change them.
