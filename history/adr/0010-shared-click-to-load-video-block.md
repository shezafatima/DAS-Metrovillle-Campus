# ADR-0010: One Shared Click-to-Load Video Block for YouTube and Instagram, With Local-Only Posters on Content Pages

- **Status:** Proposed (draft for the owner's approval)
- **Date:** 2026-10-12
- **Feature:** 018-academics, touching 006-home-page (Why Choose video) and, later, 014-page-content (video fields in Settings)
- **Context:** The home page has a click-to-load YouTube player (`src/components/home/youtube-embed.tsx`, 006 FR-010). It loads the privacy-enhanced player only after a click, but shows YouTube's own thumbnail (`i.ytimg.com`) as its poster, so the home page contacts a Google host on every visit. 018 adds two more videos: a YouTube video in Teachers' Training and an Instagram video in Hifz-e-Quran. The spec forbids a second video component (FR-016) and any request to YouTube, Instagram or their content or script hosts before the click (FR-017, SC-004). It also requires switching a video's provider to be a content-only change, because the owner may move the Hifz video to YouTube if Instagram looks poor in a 16:9 frame. 014 will later make these videos editable, so the stored shape has to work as a Settings value.

## Decision

- **One component.** `src/components/media/video-embed.tsx` (`VideoEmbed`, client) replaces `youtube-embed.tsx`. It takes an already-resolved `PlayableVideo { provider, embedUrl }`, a `title` (iframe name), a `playLabel` (button name), a `poster` and an optional `testId`. It knows nothing about URL parsing.
- **One resolver, used for both validation and rendering.** `src/lib/video/embed.ts` exports `resolveVideo(entry) → PlayableVideo | null`:
  - YouTube reuses the existing `parseYouTubeAddress` (005) and produces `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0`.
  - Instagram uses a new `parseInstagramAddress`. It accepts `instagram.com`/`www.instagram.com` with `/p|reel|reels|tv/<code>` and produces `https://www.instagram.com/<p|reel>/<code>/embed/`.
  - Anything else, including look-alike hosts, profiles and credentials in the URL, returns `null`, which hides the block.
  - The content schema's refine calls the same function, so a URL that saves is a URL that renders.
- **One stored shape.** `VideoEntry { provider: "youtube" | "instagram", url, poster: ImageRef | null, title }`. An empty `url` means no block (no empty frame). Changing `provider` and `url` is the whole switch.
- **The network rule is enforced by what the markup contains.** Before the click, only the poster renders. On content pages (Academics) the poster is always local: the entry's own image, or a built-in placeholder (navy panel with the school emblem). No third-party URL exists in the HTML until the click mounts the iframe.
- **Instagram without its script.** It loads Instagram's own embed page in an iframe, never `embed.js`. The iframe fills the same 16:9 frame as YouTube.
- **The home page keeps its current behaviour by explicit opt-in.** It passes `poster: { src: i.ytimg thumbnail, remote: true }` and `testId="why-choose-video"`, so its appearance and E2E coverage don't change (FR-019, SC-008). `remote` is the only path that renders a third-party image, and only the home page uses it.

## Consequences

### Positive

- One player implementation with one set of accessibility behaviours (labelled button, keyboard activation, iframe title) and one place to fix bugs.
- The privacy rule ("nothing from the provider before the click") is structural and testable in a unit test (no third-party `src`/`href` in the pre-click markup), not just something a reviewer has to remember.
- Switching providers, adding a poster or removing a video is a content edit. 014 can expose these fields with `resolveVideo` as the validator, as 005 reuses `parseYouTubeAddress`.
- No new dependency and no third-party script on the page.

### Negative

- **Instagram's embed isn't designed for 16:9.** It has its own header and caption and may scroll inside the frame, especially at 375 px. The owner reviews screenshots, and the fallback (switch to YouTube) is cheap.
- **Inconsistent privacy between pages.** The home page still requests YouTube's thumbnail before the click. This is accepted for now (spec Assumptions, Out of Scope). Moving the home page to a local poster later is a one-prop change.
- **Instagram's embed URL format is an undocumented convention.** If Instagram changes it, Hifz videos break until `resolveVideo` is updated. The failure is contained: after the click the frame keeps its size and shows the provider's error.
- **The refactor touches a shipped home-page component,** so its E2E (`admin-home-page.spec.ts`) has to stay green.
- **The click still autoplays YouTube** (`autoplay=1`), matching the existing behaviour. "No autoplay" means only "nothing plays on page load".

## Alternatives Considered

- **A second component for Instagram (or one per provider).** Simpler individually, but it's forbidden by FR-016 and duplicates the poster, button and accessibility logic. Rejected.
- **Instagram's official `embed.js` blockquote.** Gives native sizing, but loads a third-party script. Deferring it until the click means injecting scripts by hand, and it renders outside a fixed frame (the layout jumps). Rejected.
- **A third-party lite-embed library** (e.g. `lite-youtube-embed`). Polished for YouTube, but it has no Instagram support and adds a dependency (Constitution II). Rejected.
- **Provider thumbnails as posters everywhere,** as the home page does. No poster assets are needed, but it violates FR-017 on Academics and needs a request to the provider before the click. Rejected for content pages and tolerated only on the home page.
- **Store a raw embed URL instead of `provider` + `url`.** Fewer fields, but editors would have to know each provider's embed format, validation gets harder, and pasting an arbitrary iframe URL becomes possible. Rejected.

## References

- Feature Spec: [specs/018-academics/spec.md](../../specs/018-academics/spec.md) (FR-013, FR-015 to FR-019, FR-021, US4, SC-004, SC-008)
- Implementation Plan: [specs/018-academics/plan.md](../../specs/018-academics/plan.md); [research.md](../../specs/018-academics/research.md) R3, R4, R10; [contracts/page-structure.md](../../specs/018-academics/contracts/page-structure.md) "VideoEmbed"; [contracts/academics-content.md](../../specs/018-academics/contracts/academics-content.md)
- Related ADRs: ADR-0009 (single pages with anchored sections; the videos live in its sections). No conflict.
- Evaluator Evidence: [history/prompts/018-academics/0004-adr-shared-video-block.plan.prompt.md](../prompts/018-academics/0004-adr-shared-video-block.plan.prompt.md)
