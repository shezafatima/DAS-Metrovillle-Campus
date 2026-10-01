# Data Model: Settings (005)

## Collection `settings` (one document per group)

| Field | Type | Notes |
|---|---|---|
| `_id` | string | The group key: `contact` \| `hero` \| `stats` \| `video` \| `gallery`. Makes "one record per group" a database guarantee (PRD §7, Constitution VI). |
| `data` | object | The validated group value; shape per group below. |
| `version` | integer ≥ 1 | Compare-and-set counter; +1 on every successful save. |
| `updatedAt` | Date | Set on every save. |
| `updatedBy` | string | Saving admin's email (from the session, never the request). |

A group with **no document** is "never saved": reads return `defaultsFor(definition)` with `version: 0`. Nothing is written until the first save (no seed step needed, and no migration when a field is added: missing fields take their definition default on read).

Model file: `src/models/settings.ts` (collection name `settings`, `strict: false` on `data`, validated by Zod before every write — Zod is authoritative, Mongoose does not validate `data`).

### State transitions

```
(no document, version 0) --save--> version 1 --save--> version 2 …
save(expected=n) succeeds only if stored version == n, else CONFLICT (nothing written)
list item:  live --(absent from a saved payload)--> deleted (deletedAt set) — terminal in the UI
```

## Field types

| Type | Value | Rules |
|---|---|---|
| `text` | string | trimmed, `maxLength`, optional `required` |
| `longText` | string | trimmed, `maxLength`, line breaks kept |
| `number` | integer | whole, `min`–`max`, required |
| `url` | string | `http(s)://` address, or (only where `allowPath`) a site path starting with `/`; `javascript:`/`data:` refused; empty allowed unless `required` |
| `image` | `ImageRef` | see below |
| `video` | string | YouTube video address (FR-019); empty allowed unless `required`; stored trimmed and as entered |
| `list` | array of items | `itemFields`, `maxItems`, optional rules (`atLeastOneVisible`, `allOrNone`) |

### `ImageRef`

`{ url: string, publicId: string, width: number, height: number }` — Cloudinary reference only, never a binary (architecture.md "Media and content"). `publicId` must start with the group's folder (`settings/hero/…`, `settings/gallery/…`). **Exception**: `publicId: ""` is valid only when `url` equals the bundled default placeholder path (`/images/hero/placeholder-desktop.svg` or `-mobile.svg`).

### List item envelope (added by the engine, not by the definition)

`{ id: string /* UUID */, deletedAt: Date | null, …item fields }`

## Group values

### `contact` (FR-008)

| Key | Type | Limits | Default (from `contactInfo`, `src/content/site-shell.ts`) |
|---|---|---|---|
| `phone` | text | required, ≤ 40 | `+92-42-0000000` |
| `email` | text (email) | required, valid email, ≤ 120 | `metroville@dararqam.edu.pk` |
| `address` | longText | required, ≤ 300 | `Dar-e-Arqam School, Metroville Campus — address TBD` |
| `officeHours` | text | ≤ 120 (UI label "Office timings") | `Monday to Saturday, 9am to 6pm PST` |
| `mapUrl` | url | http(s) only, ≤ 500 | `https://maps.google.com/?q=Dar-e-Arqam+School+Metroville` |
| `social.facebook` / `instagram` / `youtube` / `tiktok` | url | optional, http(s) only, ≤ 300 | the four current links |

Stored keys keep the existing `ContactInfo` names (`officeHours`, `social.*`) so `getContactDetails()` returns the group value unchanged.

### `hero` (FR-012–FR-016)

| Key | Type | Limits | Default |
|---|---|---|---|
| `displaySeconds` | number | integer 3–15 | 5 |
| `slides` | list (≤ 10 live) | rule `atLeastOneVisible` | one visible placeholder slide |

Slide item fields: `desktop` image (required); `mobile` image (optional); `alt` text (required, ≤ 150); `heading` text (optional, ≤ 80); `buttonLabel` text (optional, ≤ 30); `buttonLink` url (`allowPath`, optional, ≤ 500); `visible` boolean (default true). Rule `allOrNone(buttonLabel, buttonLink)`.

### `stats` (FR-018)

`students`, `books`, `teachers`, `campuses` — number, integer 0–100 000 000, required. Defaults 300000 / 50 / 14500 / 700.

### `video` (FR-019, FR-020)

`youtubeUrl` — video type, optional, default `""` (= no video).

Accepted forms (host `youtube.com`, `www.`/`m.` prefixed, or `youtu.be`; scheme optional): `/watch?v=<id>`, `youtu.be/<id>`, `/embed/<id>`, `/shorts/<id>`; `<id>` = 11 characters `[A-Za-z0-9_-]`. Channel, playlist-only and other-host addresses are refused.

### `gallery` (FR-021, FR-022)

`images` — list (≤ 200 live). Item fields: `image` (required); `caption` text (optional, ≤ 150).

## Derived / public shapes (FR-003)

`getPublicSettings(group)` returns only what the site shows:
- `contact`: the group value as `ContactInfo` (empty social entries omitted).
- `hero`: `{ displaySeconds, slides: [{ id, desktop, mobile?, alt, heading?, button?: {label, href} }] }` — live **and** visible slides only, in order.
- `stats`: the four numbers.
- `video`: `{ youtubeUrl } ` with `""` meaning none (the embed id is derived, never stored).
- `gallery`: `{ images: [{ id, image, caption? }] }` — live only, in order.

No `deletedAt`, `version`, `updatedBy` or hidden slide ever appears in a public shape.

## Relationships

None between groups. `hero`/`gallery` images reference Cloudinary assets by `publicId`. Nothing references the user collection except `updatedBy` (an email string, so a deleted user does not break it).

## Indexes

None beyond `_id`. Access is always by group key.
