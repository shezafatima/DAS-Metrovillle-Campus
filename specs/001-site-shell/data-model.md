# Phase 1 Data Model: Site Shell

All entities below are plain, static TypeScript types and values exported
from `src/content/site-shell.ts` — there is no database and no runtime
mutation (Constitution IV is N/A for this feature; see plan.md's
Constitution Check). "Validation rules" here are compile-time (TypeScript)
and content-authoring rules, not server-side Zod validation.

## NavigationItem

One entry in the main menu (spec.md Key Entities; FR-001–FR-004).

| Field | Type | Notes |
|---|---|---|
| `label` | `string` | Display text; must render intact when long or Urdu (FR-022) |
| `href` | `string` | Target route; MUST match a route this feature or a later one serves |
| `tagline` | `string` (optional) | Small caption under the label (e.g. "Front Page" under Home) — confirmed on the live reference site |
| `children` | `NavigationItem[]` (optional, omit or `[]` when none) | Presence of a non-empty array is what makes an item show a dropdown (FR-004) — never a hardcoded per-item flag |

**Validation / authoring rules**:
- Order in the `navigationItems` array is the render order and MUST be
  exactly: Home, About, Campuses, Academics, Admission, Resources, News,
  Contact (FR-001).
- No item may be labeled "Franchise Offer" or link outside the PRD sitemap
  (FR-020).
- `children` for every item with sub-pages are populated from the real
  das.edu.pk site structure (fetched live and cross-checked against
  `screenshots/`; see spec.md's updated Assumptions), not docs/prd.md's
  rougher "TBD" guess — editing this array to add, remove, or correct a
  sub-page or tagline is a content edit, never a code
  change (FR-004).

## ContactInfo

The single editable record of Metroville's contact details and social
links (spec.md Key Entities; FR-010–FR-013, FR-021).

| Field | Type | Notes |
|---|---|---|
| `phone` | `string` | Dialable value used verbatim in a `tel:` href (FR-011); placeholder until the client supplies the real Metroville number (spec.md Assumptions) |
| `email` | `string` | Used verbatim in a `mailto:` href (FR-011); placeholder until supplied |
| `address` | `string` | Metroville's physical address only — never das.edu.pk head-office (FR-021) |
| `social` | `Partial<Record<SocialPlatform, string>>` | Each key optional; a missing/empty value means that platform's icon/link is omitted entirely (FR-012), never rendered as a dead link |

`SocialPlatform` is a small fixed union (`"facebook" | "instagram" |
"youtube" | "tiktok"`) — extend the union only if the client provides a
new channel; adding a value to `social` never requires touching
`SocialLinks`, `TopBar`, or `Footer`.

**Validation / authoring rules**:
- `phone`/`email`/`address` are read by `Footer` only — the top bar shows
  `PortalLink`s and `social` instead (corrected during implementation; see
  spec.md's updated Assumptions). `social` is read by the shared
  `SocialLinks` component, used by both `TopBar` (light badge variant) and
  `Footer` (dark badge variant) — the omit-when-empty filtering and label
  mapping live in that one component, not duplicated per consumer.
- `phone`/`email` must always be non-empty (they're required display
  fields per FR-010); `social` entries are the only optional/omittable
  ones (FR-012).

## PortalLink

One top-bar quick-link to an external student/parent/staff system this
project doesn't build (spec.md Key Entities; FR-025).

| Field | Type | Notes |
|---|---|---|
| `label` | `string` | Display text (e.g. "Student Login") |
| `href` | `string` | An internal `/portal/<slug>` placeholder route, never a fabricated external URL |

**Validation / authoring rules**:
- Read by `TopBar` only.
- Adding, removing, or relabeling a portal link is a content edit (FR-025)
  — the matching `/portal/[slug]` route renders a generic placeholder
  regardless of slug, so no route needs to be created per link.

## FooterContent

The footer's structural content, scoped to Metroville (spec.md Key
Entities; FR-014–FR-015).

| Field | Type | Notes |
|---|---|---|
| `columns` | `{ title: string; links: { label: string; href: string }[] }[]` | Footer link columns matching the reference layout |
| `quickLinks` | `{ label: string; href: string }[]` | Secondary quick-link list in the footer |
| `bottomText` | `string` (optional) | Any bottom-bar text beyond the copyright line (e.g. a tagline); the copyright year itself is **not** stored here — it's computed at render time (`new Date().getFullYear()`) per FR-015, not read from content |

**Validation / authoring rules**:
- Populated with Metroville content only, never das.edu.pk head-office
  content (FR-014, mirrors FR-021's rule for ContactInfo).
- Signup-form markup is explicitly excluded from this feature's footer
  (spec.md Out of Scope — feature 004 owns it).

## SitemapRoute (conceptual — not a stored entity)

Represents one PRD-sitemap route and whether it has real content yet
(spec.md Key Entities; FR-017). This isn't a data record read at runtime;
it's simply which `page.tsx` files exist under `src/app/` and whether each
one renders `PagePlaceholder` or real section components. Tracked in code
structure (plan.md's Project Structure), not in `site-shell.ts`.

| Route | Status in this feature |
|---|---|
| `/` | Placeholder (real Home sections are a later feature) |
| `/about` | Placeholder |
| `/campuses` | Placeholder |
| `/academics` | Placeholder |
| `/admission` | Placeholder |
| `/resources` | Placeholder |
| `/news` | Placeholder |
| `/news/[slug]` | Placeholder (no real slugs exist yet — spec.md Assumptions) |
| `/contact` | Placeholder |
| *(unmatched URL)* | Global `not-found.tsx`, rendered inside the shell, with a link home (FR-018) |

No state transitions apply to any entity in this feature — content is
static per deployment; changing it is a content-file edit, not a runtime
state change.
