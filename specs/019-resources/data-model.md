# Data Model: Resources Page (019)

There is no database change. The Mobile Apps content is a typed, Zod-validated content file in the shape 014-page-content will store (Constitution VIII). The Photo Gallery keeps its 007 data model unchanged.

## MobileApps (the 014 value)

| Field | Type | Rules | Source today |
|---|---|---|---|
| `heading` | text | 1–120 chars, trimmed | Reference, verbatim: "Scarlet Series Mobile Applications" |
| `body` | longText | ≤ 2000 chars; paragraphs separated by one blank line | Reference paragraph, verbatim |
| `image` | imageRef \| null | `url` local (`/…`) or `https://res.cloudinary.com/…`; width and height are positive integers | `/images/resources/scarlet-series-playgroup.jpeg`, 744 × 1280 |
| `imageAlt` | string | ≤ 600 chars; required when `image` is set | A transcription of the flyer text (R7), pending client approval |
| `apps` | App[] | 1–8 items; unique `id`s; order is display order | 4 apps (below) |

## App

| Field | Type | Rules |
|---|---|---|
| `id` | itemId | kebab-case, unique within `apps` |
| `name` | text | 1–60 chars |
| `label` | text, optional | 1–120 chars. Shown only when present. None today, because the reference has none. |
| `icon` | enum `APP_ICON_KEYS` | `book-a`, `calculator`, `feather`, `monitor-smartphone`, `graduation-cap`, `smartphone` |
| `url` | string | `""` means no working link. Otherwise `https:` only, and it must match `linkType` (R2). |
| `linkType` | enum | `play-store`, `app-store`, `direct-download` |

**Derived state** (not stored):

| `url` | Card shows |
|---|---|
| `""` | Unavailable: the note "Not available at the moment", and no link |
| non-empty | Available: the button label for `linkType`, plus the outside-the-Play-Store note when `linkType` is `direct-download` |

There are no other transitions. The state changes only by editing `url`, in this file now or in 014 later.

### Values today (in order)

| id | name | icon | linkType | url |
|---|---|---|---|---|
| `scarlet-english` | Scarlet English | `book-a` | `direct-download` | `https://drive.google.com/file/d/15V_ogaFhGTmkaMHTggAcIFiLDDHevpxy/view?usp=sharing` |
| `scarlet-math` | Scarlet Math | `calculator` | `direct-download` | `""` (Drive 404) |
| `scarlet-urdu` | Scarlet Urdu | `feather` | `direct-download` | `""` (Drive 404) |
| `lms-app` | LMS App | `monitor-smartphone` | `play-store` | `""` (Play 404) |

## MobileAppsCopy (interface strings; not part of the 014 value)

| Key | Value | Status |
|---|---|---|
| `buttons["play-store"]` | "Get it on Google Play" | Brief wording |
| `buttons["app-store"]` | "Download on the App Store" | Pending client approval (not used today) |
| `buttons["direct-download"]` | "Download for Android" | Brief wording |
| `directDownloadNote` | "Installs from outside the Play Store" | Pending client approval (R6) |
| `unavailable` | "Not available at the moment" | Pending client approval (R6, Clarification Q1) |
| `newTab` | "opens in a new tab" | Screen-reader text only |

## MobileAppsSource (record only; never rendered)

| Field | Value |
|---|---|
| `url` | `https://das.edu.pk/resources/scarlet-mobile-apps/` |
| `copiedOn` | `2026-10-12` |
| `linksCheckedOn` | `2026-10-12` |
| `referenceLinks` | The reference URL for each app id, including the three dead ones (the LMS URL is `https://play.google.com/store/apps/details?id=com.darearqam.daslms`) |

## Review (not part of the 014 value)

`{ status: "pending-client-approval", notes: string[] }` (018's `ReviewMeta`). The notes cover findings R1–R7 and the three dead links.

## Page sections (unchanged definition)

`pageSections.resources` in `src/content/site-shell.ts` is already `[{ id: "photo-gallery", label: "Photo Gallery" }, { id: "mobile-apps", label: "Mobile Apps" }]`. Only the comment above it changes.
