# Contract: Mobile Apps content (Zod shape and the 014 mapping)

The schema lives in `src/lib/resources/schema.ts`. The value is the typed file `src/content/resources/mobile-apps.ts`, parsed at module load in `src/content/resources/index.ts`, so a bad edit fails the build and the tests. Field helpers come from `src/lib/content/fields.ts`.

```ts
// src/lib/resources/schema.ts (shape only)
export const LINK_TYPES = ["play-store", "app-store", "direct-download"] as const;
export const APP_ICON_KEYS = ["book-a", "calculator", "feather", "monitor-smartphone", "graduation-cap", "smartphone"] as const;

/** True when `url` is an https link of the kind `linkType` names (R2). Reused by 014 as the validator. */
export function linkMatchesType(url: string, linkType: LinkType): boolean;

const appSchema = z
  .object({
    id: itemId,
    name: text(60),
    label: text(120).optional(),
    icon: z.enum(APP_ICON_KEYS),
    url: z.string().trim().max(500),          // "" = no working link: the card shows the unavailable note
    linkType: z.enum(LINK_TYPES),
  })
  .refine((a) => a.url === "" || linkMatchesType(a.url, a.linkType), "URL does not match its link type, or is not https");

export const mobileAppsSchema = z
  .object({
    heading: text(120),
    body: longText(2000),
    image: imageRef.nullable(),
    imageAlt: z.string().trim().max(600),
    apps: z.array(appSchema).min(1).max(8).refine(uniqueIds),
  })
  .refine((v) => v.image === null || v.imageAlt.length > 0, "imageAlt is required with an image");
```

## `linkMatchesType` rules

| linkType | Accepted | Refused examples |
|---|---|---|
| `play-store` | `https://play.google.com/store/apps/details?id=<package>` (other query params allowed) | `http://…`, `https://play.google.com/store/search?…`, a look-alike host such as `play.google.com.evil.example` |
| `app-store` | `https://apps.apple.com/…` | `http://…`, `itunes.apple.com.evil.example` |
| `direct-download` | any `https:` URL | `http://…`, `javascript:…`, a relative path |

## Rendering contract (`MobileAppsSection`)

- The section is `<section id="mobile-apps" aria-labelledby="mobile-apps-heading" data-background="muted" class="anchor-section …">`, through `AboutSection` with `beside` and `below`.
- There is exactly one `h2`, `#mobile-apps-heading`, holding `heading`.
- The intro holds the `body` paragraphs (`Paragraphs`, inside `max-w-prose`). The flyer is a `figure > img` with `alt = imageAlt`, shown uncropped and capped at `--size-resources-flyer-max-h`. With `image === null`, the `beside` slot isn't rendered.
- The apps grid is a `ul` with one `li` card per app, in order, each carrying `data-testid="app-card"` and `data-app-id`. Each card holds:
  - the icon (`aria-hidden="true"`);
  - the name in an `h3`;
  - the `label` when present;
  - then **either** the available footer **or** the unavailable footer (below).
- **Available footer**:
  - `<a href={url} target="_blank" rel="noopener noreferrer">`. Its visible text is `buttons[linkType]`, and its accessible name is `"{button}: {name} ({newTab})"`, where the parenthesised part is visually hidden.
  - For `direct-download`, a visible `<p id="{id}-note">` holding `directDownloadNote`, with the link's `aria-describedby="{id}-note"`.
- **Unavailable footer**: a muted `<p>` holding `unavailable`. There is no `a` element.

## Mapping for 014 (Settings field types)

| Value path | 014 field type | Note |
|---|---|---|
| `heading`, `apps[].name`, `apps[].label`, `imageAlt` | `text` | |
| `body` | `longText` | blank line = new paragraph |
| `image` | `image` | A Cloudinary upload replaces the local path |
| `apps` | `list` | The order is the display order |
| `apps[].icon`, `apps[].linkType` | **select** | Not in the engine yet, as 017's and 018's icon keys aren't |
| `apps[].url` | `text` + validator | `linkMatchesType` is the validator. An empty value is allowed and means "unavailable". |

## Invariants (unit-tested)

- The heading and body equal lines 1 and 2 of `docs/content-source/resources/mobile-apps.txt` exactly.
- The image URL is local or Cloudinary. No value that renders contains `das.edu.pk`.
- There are 4 apps in the order `scarlet-english`, `scarlet-math`, `scarlet-urdu`, `lms-app`. Only `scarlet-english` has a non-empty `url` today, and it equals the reference link.
- `mobileAppsSource.referenceLinks` has an entry for every app id. The LMS entry is `https://play.google.com/store/apps/details?id=com.darearqam.daslms`.
