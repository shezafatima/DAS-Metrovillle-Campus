# Contract: `FlipCoverflow` (shared flip-card coverflow)

**File**: `src/components/ui/flip-coverflow.tsx` (client). Extracted from `src/components/home/quick-access-cards.tsx` (006 FR-008); `QuickAccessCards` becomes a wrapper around it. No second copy of the behaviour exists.

## Props

```ts
export interface FlipCoverflowItem {
  id: string;
  title: string;              // used in the flip button's accessible name
  front: ReactNode;           // face content; the component adds the flip button over it
  back: ReactNode;            // may contain a link (home) or not (uniform)
  frontClassName?: string;    // classes for the .qa-front face
  backClassName?: string;     // classes for the .qa-back face
}

export interface FlipCoverflowProps {
  items: FlipCoverflowItem[];
  label: string;                                   // aria-label of the carousel root
  flipLabel: (title: string) => string;            // flip button name
  positionLabel: (n: number, total: number) => string; // slide aria-label
  header?: ReactNode;                              // rendered inside the root, above the stage
  as?: "section" | "div";                          // default "section"; "div" adds role="group"
  className?: string;                              // root classes
  stageClassName?: string;                         // card size custom properties (--qa-w/--qa-h)
  testIdPrefix?: string;                           // default "quick-access" → -card, -flip, -link
}
```

## Behaviour (unchanged from 006, now shared)

- Loops for ≥ 3 items; centre card larger, neighbours faded, others parked (`.qa-*` CSS in `globals.css`, unchanged).
- Mouse: hover on the centre card flips it; clicking does not undo a hover flip.
- Touch: tap flips/unflips the centre card; tap outside or Escape unflips; a horizontal drag beyond 12 px changes the slide and never also flips; tapping the back (outside a link) turns it back.
- Keyboard: arrow keys move and keep focus on the new centre flip button; `:focus-visible` on the centre card reveals the back; Enter/Space toggles.
- Auto-advance every 3 s; paused while any card is flipped, the mouse is over the carousel, keyboard focus is inside, within 4 s of a touch, while the tab is hidden, and always under `prefers-reduced-motion` (which also cross-fades instead of rotating).
- The flip control is always a `<button type="button">` (`data-testid="{prefix}-flip"`, `aria-expanded`), never a link, whether or not the back has a link (FR-026).
- Each card: `<li data-qa-index data-testid="{prefix}-card" data-flipped data-centre role="group" aria-roledescription="slide">`.

## Home usage (must stay identical)

`QuickAccessCards` passes `as="section"`, `label="Quick links"` (from `homeContent.quickAccess.label`), the current section classes, the current stage size classes, `testIdPrefix="quick-access"`, a `header` with the existing `SectionHeading`, and fronts/backs reproducing today's markup (icon `Image`, `h3` title, text; back with `aria-hidden` title/text and the `quick-access-link` Read More link). Proof: `e2e/home-cards.spec.ts`, `e2e/home.spec.ts` pass unchanged.

## Uniform usage

`UniformSection` (`src/components/admission/uniform-section.tsx`, a server component that builds the items) passes `as="div"`, `label="Uniforms"` (content file), `testIdPrefix="uniform"`, `stageClassName` with the uniform size tokens, and per group:
- front: photo (`next/image`), or `Shirt` icon (`aria-hidden`) on a plain `bg-surface` face; then `<h3 id="uniform-{id}-title">` with the category as a small label, a screen-reader-only " – ", and the gender as the main text (accessible name "Kids Uniform – Boys");
- back: the same label and gender drawn the same way but `aria-hidden` (one heading per card), then `<ul data-testid="uniform-items" aria-labelledby="uniform-{id}-title">` of items (in the accessibility tree), on `bg-primary` (theme navy, as on home) with white text;
- flip button name: `flipLabel("{category} – {gender}")`.
