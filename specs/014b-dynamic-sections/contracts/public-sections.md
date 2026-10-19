# Contract: Public sections, menu and footer (014b)

## Readers

`getPublicSettings(group)` (`src/lib/settings/public.ts`) gains four groups. All of them are cached for 60 s, tagged `settings` + `settings:<group>`, never throw, and fall back to the last good value, else the defaults (empty).

| Group | Public shape | `hasContent` |
|---|---|---|
| `syllabi` | `{ levels: { id, name, slug, subjects: { id, name, groups: { id, heading, paragraphs[], topics[] }[] }[] }[] }`, levels without subjects removed | `levels.length > 0` |
| `examination` | `{ blocks: { id, heading, paragraphs[] }[] }` | `blocks.length > 0` |
| `classLevels` | `{ ageReferenceDate, ageHeader, levels: { id, name, ageRule }[] }` | `levels.length > 0` |
| `portalLinks` | `{ links: { id, label, url, insecure }[] }` | `links.length > 0` |

`resolveDynamicSections()` (server only) → `{ syllabi: boolean; examination: boolean; "class-levels": boolean }`.

## Page sections

`pageSections.academics`: `academic-overview`, **`syllabi`**, **`examination`**, `teachers-training`, `hifz-e-quran`.
`pageSections.admission`: `admission-procedure`, **`class-levels`**, `uniform`.

`visibleSections(page, presence)` removes `syllabi`, `examination` and `class-levels` when their flag is false. The Academics page, the Admission page, the header's dropdown children and the search index all use it.

## Section markup

| Section | Root | Content |
|---|---|---|
| Syllabi | `<section id="syllabi" class="anchor-section">` with `h2` "Syllabi" | **md+**: `role="tablist"` (`aria-label="Class"`) of `role="tab"` buttons (`id="syllabi-<slug>-tab"`, `aria-controls="syllabi-<slug>-panel"`, `aria-selected`, roving `tabindex`). **Below md**: `<label for>` "Choose a class" + `<select>`. Panels: `role="tabpanel"` `id="syllabi-<slug>-panel"` `aria-labelledby` the tab, `hidden` unless selected; inside, `h3` subject, `h4` group heading, `p` intro paragraphs, `ul > li` topics |
| Examination | `<section id="examination" class="anchor-section">` with `h2` "Examination" | `ul` grid (1 col; `md:grid-cols-2`) of `li > article`, `h3` heading, `p` paragraphs |
| Class Levels | `<section id="class-levels" class="anchor-section">` with `h2` "Class Levels" | **md+**: `<table>` with `<caption class="sr-only">Class levels and ages</caption>`, `<th scope="col">Class level</th>`, `<th scope="col">Age on {ageHeader}</th>`. **Below md**: per level `<dl>` with `dt` "Class level" / `dd` name and `dt` "Age on {ageHeader}" / `dd` rule |

**Keyboard (Syllabi tabs)**: Left/Right move to the previous/next tab (wrapping) and select it. Home/End go to the first/last. Tab moves focus into the selected panel.

**Hash**:

| On load or `hashchange` | Result |
|---|---|
| `#syllabi` | first level selected, section scrolled into view |
| `#syllabi-<slug>` (known) | that level selected, section scrolled into view |
| `#syllabi-<unknown>` | first level selected |
| user selects a level (tab or select) | `history.replaceState` to `#syllabi-<slug>`; `history.length` unchanged |

## Footer

| Links | Markup |
|---|---|
| ≥ 1 | `nav[aria-labelledby=footer-portal-links]` column; each `a[href=url][target=_blank][rel="noopener noreferrer"]` with text `label` + `span.sr-only " (opens external site in a new tab)"` + `ExternalLink` icon `aria-hidden`; grid `md:grid-cols-2 lg:grid-cols-4` |
| 0 | no Portal Links `nav` or heading; grid `md:grid-cols-2 lg:grid-cols-3` |

The `<footer>` has `id="site-footer"`, the Portal Links panel's "View on site" target (`/#site-footer`).

No element on the public site has an `href` beginning `/portal`.

## Registration (013) — changed input, same contract

`getRegistrationAvailability()` returns `classes = offeredClasses(admission, classLevels)` (see data-model.md). `RegistrationAvailability`, the form's `classes` prop and `buildRegistrationSchema({ classes })` keep their types.

## Responsive checks (Constitution XI)

| Width | Syllabi | Examination | Class Levels | Footer (with links) |
|---|---|---|---|---|
| 375 | select, no tab row | 1 column | stacked `dl` | 1 column |
| 640 (reference mobile-menu breakpoint) | select, no tab row | 1 column | stacked `dl` | 1 column |
| 768 | tab row (scrolls inside if needed) | 2 columns | table | 2 columns |
| 1024 | tab row | 2 columns | table | 4 columns (3 without links) |
| 1440 | tab row | 2 columns | table | 4 columns (3 without links) |

At every width: `document.documentElement.scrollWidth ≤ innerWidth` (no horizontal page scroll), and no two visible text blocks or controls in a section have intersecting bounding boxes.
