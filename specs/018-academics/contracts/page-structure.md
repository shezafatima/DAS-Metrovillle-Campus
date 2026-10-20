# Contract: /academics page structure, navigation, redirects, video block

## DOM outline

```text
main
├── PageBanner                 h1 "Academics", breadcrumb Home » Academics
├── section#academic-overview  .anchor-section [data-background=surface] aria-labelledby=academic-overview-heading
│   ├── h2 "Academic Excellence" + line "Building Strong Foundations…"
│   └── grid md:12 → text (7, max-w-prose, 3×p) | figure (5, aspect 4:3; image or emblem panel)
├── section#teachers-training  [data-background=muted]
│   ├── h2 "Teachers' Training"
│   ├── grid md:12 → text (7: p + ul>li×19) | [data-testid=training-photos][data-layout=single|collage] (5)   ← absent when layout=none
│   └── VideoEmbed [data-testid=training-video] (max-w-4xl, centred)                                    ← absent when no URL
└── section#hifz-e-quran       [data-background=surface]
    ├── h2 "HIFZ-UL-QURAN PROGRAM" + line "A Meaningful Step…"
    ├── p (intro)
    ├── h3 "Admission Based on Aptitude" + p
    ├── h3 "Hifz Alongside Academic Education" + p + p (T1)
    └── VideoEmbed [data-testid=hifz-video] (max-w-4xl, centred)                                         ← absent when no URL
```

- Placeholder photo tiles have `data-placeholder="true"` and a visible "Placeholder" badge. In production mode the document contains none.
- No element has `lang="ur"`, and the text contains no Arabic-script characters.

## Navigation and search

`pageSections.academics` = `academic-overview`, `teachers-training`, `hifz-e-quran` (in this order). The desktop dropdown, the mobile group and the search index all derive from it through `navigationItems`. No other code lists Academics anchors.

## Redirects (`next.config.ts`, all `permanent: true` → 308)

| Source | Destination | Origin |
|---|---|---|
| `/academics/academics-overview` | `/academics#academic-overview` | `legacyAcademicsRedirects` |
| `/academics/syllabi` | `/academics` | `legacyAcademicsRedirects` |
| `/academics/examinations` | `/academics` | `legacyAcademicsRedirects` |
| `/academics/teachers-training` | `/academics#teachers-training` | `legacyAcademicsRedirects` |
| `/hifz-e-quran` | `/academics#hifz-e-quran` | existing rule |

Any other `/academics/<x>` is a 404.

## VideoEmbed (`src/components/media/video-embed.tsx`, client)

```ts
type PlayableVideo = { provider: "youtube" | "instagram"; embedUrl: string };
function VideoEmbed(props: {
  video: PlayableVideo;
  title: string;                                   // iframe title
  playLabel: string;                               // button aria-label
  poster: { src: string; remote?: boolean } | null; // null → local placeholder (navy + emblem)
  testId?: string;
}): JSX.Element;
```

| State | Renders | Network |
|---|---|---|
| Before the click | `div.aspect-video` > `button[aria-label]` > poster + play icon | local poster only, or the home page's i.ytimg thumbnail (`remote: true`, home only) |
| After the click (or Enter/Space) | the same `div` > `iframe[src=embedUrl][title]` | provider |

Embed URLs (`src/lib/video/embed.ts`):

- YouTube: `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0`
- Instagram: `https://www.instagram.com/<p|reel>/<code>/embed/`

## Test seams (honoured only when `freshReadsForTests()` is true; never in production)

| Cookie | Effect |
|---|---|
| `e2e-production-content=1` | `placeholdersAllowed()` returns false (shared with /about) |
| `e2e-academics-media=one` / `two` / `three` | fixture photos (1, 2 or 3) plus sample YouTube and Instagram URLs from `src/content/academics/fixtures.ts` |
