# Contract: Tabs, panels and admin UI (014)

## Tab registry (`src/lib/settings/panels.ts`)

| Order | Tab key / URL | Label | Access | Panels (in order) |
|---|---|---|---|---|
| 1 | `site-wide` | Site-wide | `settings` | `contact` |
| 2 | `home` | Home | `pages` | `hero`, `video`, `stats` |
| 3 | `about` | About | `pages` | — (hidden) |
| 4 | `academics` | Academics | `pages` | — (hidden) |
| 5 | `admission` | Admission | `settings_or_pages` | `admission-window`, `admission-messages`, `admission-classes` |
| 6 | `resources` | Resources | `pages` | `photo-gallery` |
| 7 | `careers` | Careers | `pages` | — (hidden) |

Visible tabs for a user = tabs with ≥ 1 panel whose `access` the user passes. Computed on the server in `settings/layout.tsx` and passed to the tab bar (presentation only; each page checks again).

## Panels

| Key | Title | Admin anchor | Group fields | Save access | View on site |
|---|---|---|---|---|---|
| `contact` | Contact & social | `#contact` | all of `contact` | settings | `/contact` |
| `hero` | Hero slides | `#hero` | all of `hero` | pages | `/#hero` |
| `video` | Why Choose video | `#video` | all of `video` | pages | `/#why-choose` |
| `stats` | Progress dashboard | `#stats` | all of `stats` | pages | `/#progress-dashboard` |
| `admission-window` | Admission window | `#admission-window` | `opensOn`, `closesOn` (+ `dateOrder` rule) | settings | `/admission#admission-procedure` |
| `admission-messages` | Admission messages | `#admission-messages` | `announcement`, `closedMessage` | pages | `/admission#admission-procedure` |
| `admission-classes` | Classes open for admission | `#admission-classes` | `classes` | settings | `/admission/register` |
| `photo-gallery` | Photo gallery | `#photo-gallery` | (album list, 007) | pages | `/resources#photo-gallery` |

Extras kept from 020/013: the window status line sits in `admission-window`; the "open with no classes" warning sits in `admission-classes`.

## Panel markup

```html
<section id="{anchor}" aria-labelledby="{anchor}-title" class="anchor-section …">
  <div class="sticky top-[admin top bar] …">                      <!-- header row: only this is sticky -->
    <h2 id="{anchor}-title">
      <button type="button" aria-expanded="true" aria-controls="{anchor}-body">{title}</button>
    </h2>
    <span data-testid="panel-unsaved">Unsaved changes</span>    <!-- only while dirty -->
    <a href="{viewOnSite}">View on site</a>
  </div>
  <div id="{anchor}-body" [hidden when collapsed]>
    …form (inside <fieldset disabled> when read-only)…
  </div>
</section>
```

Exact structure is the implementer's, within these rules:
- Toggle by mouse, Enter and Space; expanded state exposed natively.
- Content stays mounted when collapsed (edits survive).
- The form inside a panel is keyed `key={panel.key}`. A server refresh after a save never remounts it or resets its state.
- `location.hash` matching an anchor opens that panel and scrolls it into view, on load and on `hashchange`.
- The unsaved marker shows on the header whether open or collapsed, and the header row stays visible while any part of the panel is on screen.
- Read-only: `<fieldset disabled>`, no Save button, line `settingsCopy.readOnly.needs("Settings" | "Page content")`.

## Tab bar

- `<nav aria-label="Settings sections">`, one link per visible tab, `aria-current="page"` on the active tab (album pages keep Resources active).
- One row at every width: `flex-nowrap`, `overflow-x-auto` on the bar only; the active link is scrolled into view on mount; the page never scrolls sideways.
- Focus ring visible; every link reachable with Tab.

## Unsaved-changes guard

`UnsavedPanelsProvider` (client) per tab: panels call `useReportUnsaved(panelKey, dirty)`; the provider calls `useUnsavedChanges(anyDirty, settingsCopy.unsavedPrompt)` once. Covers tab links, sidebar, "View on site", reload and close. One prompt regardless of how many panels are dirty.

## Old URLs (`next.config.ts`, permanent)

| Source | Destination |
|---|---|
| `/admin/settings/contact` | `/admin/settings/site-wide#contact` |
| `/admin/settings/hero` | `/admin/settings/home#hero` |
| `/admin/settings/video` | `/admin/settings/home#video` |
| `/admin/settings/stats` | `/admin/settings/home#stats` |
| `/admin/settings/gallery` | `/admin/settings/resources#photo-gallery` |
| `/admin/settings/gallery/:albumId` | `/admin/settings/resources/gallery/:albumId` |

## Public anchors (only public change)

`src/components/home/hero-slider.tsx` → `id="hero"`; `inspiration-why-choose.tsx` (the Why Choose block) → `id="why-choose"`; `progress-dashboard.tsx` → `id="progress-dashboard"`; each with `anchor-section`.

## Top-bar titles

`adminExtraPageTitles` (`src/content/admin.ts`): replace the five old group paths with `/admin/settings/site-wide` "Site-wide", `/home` "Home", `/admission` "Admission", `/resources` "Resources".
