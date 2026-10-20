# Contract: /about page structure, navigation and redirects

The E2E tests and the header depend on this. Change it only with a spec change.

## Document outline

```text
<main id="main-content">
  PageBanner            h1 "About Us"  (breadcrumb: Home » About)
  section#our-story          aria-labelledby="our-story-heading"        h2#our-story-heading
  section#vision-mission     aria-labelledby="vision-mission-heading"   h2#vision-mission-heading
                               h3 Vision, h3 Mission (panels)
  section#core-values        aria-labelledby="core-values-heading"      h2#core-values-heading
                               ul > li (one per value) with h3 name
  section#management-team    (only when shown)                         h2#management-team-heading
                               ul > li (one per card) with h3 name
  section#messages           (only when there are messages)              h2#messages-heading
                               article (one per message) with h3 name
</main>
```

- Every `section` has the class `anchor-section` (scroll-margin = header height).
- Exactly one h1 on the page.
- Every section has a `data-background` of `surface`, `navy` or `muted` (test hook, R6).
- Placeholder team cards have `data-placeholder="true"` and a visible "Placeholder" label. Their silhouettes are `aria-hidden`.
- A message `article` has `data-photo-side="start" | "end"` for desktop alternation (test hook).
- Icons are `aria-hidden="true"` and `focusable="false"`.
- No section body text has `lang="ur"` in 017 (the Urdu versions are not displayed). A name or designation written in Urdu script is marked `lang="ur" dir="rtl"`.

## Navigation

The About children, in order: Our Story `/about#our-story`, Vision & Mission `/about#vision-mission`, Core Values `/about#core-values`, Our Management Team `/about#management-team` (only when shown), Messages `/about#messages` (only when there are messages).

The same list feeds the desktop dropdown, the mobile menu and the header search index (`aboutView`, R4). Careers stays a top-level item.

## Redirects (permanent, 308)

| Source | Destination |
|---|---|
| /about/overview | /about#our-story |
| /about/salient-features | /about |
| /about/management | /about#management-team |
| /about/messages | /about#messages |

Any other `/about/*` path returns 404 (unchanged).

## Accessibility scan

`e2e/about.spec.ts` runs an axe scan (`@axe-core/playwright`, tags `wcag2a` and `wcag2aa`, scope `main`) on /about with and without the production cookie. Any `serious` or `critical` violation fails the test (SC-008).

## Test-only seam

With `E2E_FRESH_READS=1` on a non-production server, the request cookie `e2e-production-content=1` makes `aboutView` behave as in production (no placeholders). It has no effect in production builds.
