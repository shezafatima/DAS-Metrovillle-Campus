// Supplementary in-page extractor for transition/animation CSS properties.
// Loaded as raw text and evaluated as a string for the same tsx/esbuild
// __name-helper reason documented in extract-tokens.browser.js.
function browserExtractTransitions() {
  function transInfo(el) {
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      transition: s.transition,
      transitionDuration: s.transitionDuration,
      transitionTimingFunction: s.transitionTimingFunction,
      transitionDelay: s.transitionDelay,
      animationName: s.animationName,
      animationDuration: s.animationDuration,
      animationTimingFunction: s.animationTimingFunction,
      animationDelay: s.animationDelay,
    };
  }
  function firstVisible(sel) {
    try {
      const els = Array.from(document.querySelectorAll(sel)).filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      return els[0] || null;
    } catch (e) {
      return null;
    }
  }

  const targets = {
    mainMenuItem: ".fusion-main-menu > ul > li > a",
    dropdownSubmenu: ".fusion-main-menu .sub-menu, .fusion-dropdown-menu",
    button: ".fusion-button",
    card: ".fusion-content-boxes .fusion-content-box, .flip-box-front-inner",
    flipBoxInner: ".flip-box-inner-wrapper",
    footerLink: ".fusion-footer-widget-area a, footer a",
    imageRollover: ".fusion-rollover, .fusion-image-wrapper",
    swiperSlide: ".swiper-slide, .awb-swiper .swiper-slide",
    counterBox: ".fusion-counter-box",
  };
  const result = {};
  for (const key of Object.keys(targets)) {
    result[key] = transInfo(firstVisible(targets[key]));
  }

  // Any element with a non-default transition, for a broader sweep (capped).
  const nonDefault = [];
  const seen = new Set();
  document.querySelectorAll("a, button, .fusion-button, [class*='hover']").forEach((el) => {
    if (nonDefault.length >= 15) return;
    const s = getComputedStyle(el);
    if (s.transitionDuration && s.transitionDuration !== "0s") {
      const key = s.transition;
      if (!seen.has(key)) {
        seen.add(key);
        nonDefault.push({ classes: el.className, transition: s.transition });
      }
    }
  });
  result.otherNonDefaultTransitions = nonDefault;

  return result;
}
