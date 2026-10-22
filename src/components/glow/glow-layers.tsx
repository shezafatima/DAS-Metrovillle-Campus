/**
 * The two decorative layers of the travelling gold border (globals.css
 * `.about-glow-*`): the soft halo and the 3px ring. Shared by the About page's
 * Core Values cards and the Contact form frame, so there is one border.
 */
export function GlowLayers() {
  return (
    <>
      <span aria-hidden="true" className="about-glow-halo">
        <span className="about-glow-spin" />
      </span>
      <span aria-hidden="true" className="about-glow-ring">
        <span className="about-glow-spin" />
      </span>
    </>
  );
}
