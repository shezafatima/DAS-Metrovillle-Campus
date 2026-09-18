// Runs INSIDE the browser page via page.evaluate(). Loaded as raw text by
// extract-tokens.ts and evaluated as a string, deliberately bypassing the
// tsx/esbuild TypeScript transform — that transform injects `__name(...)`
// helper calls into compiled output which don't exist once Playwright
// serializes a function via .toString() into the browser context (fails
// with "ReferenceError: __name is not defined"). Keeping this logic in a
// plain, untranspiled .js file avoids that entirely. Plain JS, no types.
function browserExtract(thirdPartySelectors) {
  function isExcluded(el) {
    for (const sel of thirdPartySelectors) {
      try {
        if (el.closest(sel)) return true;
      } catch (e) {
        // invalid selector in this engine — ignore
      }
    }
    return false;
  }
  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const st = getComputedStyle(el);
    return st.visibility !== "hidden" && st.display !== "none" && st.opacity !== "0";
  }
  function styleOf(el) {
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      textTransform: s.textTransform,
      color: s.color,
      backgroundColor: s.backgroundColor,
      padding: s.padding,
      margin: s.margin,
      border: s.border,
      borderRadius: s.borderRadius,
      boxShadow: s.boxShadow,
    };
  }
  function bump(map, key) {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  }
  function topEntries(map, n) {
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([value, count]) => ({ value, count }));
  }
  function first(sel) {
    try {
      const els = Array.from(document.querySelectorAll(sel)).filter((e) => visible(e) && !isExcluded(e));
      return els[0] || null;
    } catch (e) {
      return null;
    }
  }
  function firstN(sel, n) {
    try {
      return Array.from(document.querySelectorAll(sel))
        .filter((e) => visible(e) && !isExcluded(e))
        .slice(0, n);
    } catch (e) {
      return [];
    }
  }

  // ---- global color / font census (all visible, non-third-party elements) ----
  const colorCount = new Map();
  const fontCount = new Map();
  const radiusCount = new Map();
  const shadowCount = new Map();
  const spacingCount = new Map();
  document.querySelectorAll("*").forEach((el) => {
    if (!visible(el) || isExcluded(el)) return;
    const s = getComputedStyle(el);
    bump(colorCount, s.color);
    if (s.backgroundColor && s.backgroundColor !== "rgba(0, 0, 0, 0)") bump(colorCount, s.backgroundColor);
    bump(fontCount, `${s.fontFamily} | weight:${s.fontWeight} | style:${s.fontStyle}`);
    if (s.borderRadius && s.borderRadius !== "0px") bump(radiusCount, s.borderRadius);
    if (s.boxShadow && s.boxShadow !== "none") bump(shadowCount, s.boxShadow);
    const cls = (el.className || "").toString();
    const isLayoutish =
      /fusion-row|fusion-builder-row|fusion-columns|fusion-column-wrapper|fusion-header|fusion-footer|content-box-wrapper/.test(cls) ||
      /^(SECTION|HEADER|FOOTER|MAIN|NAV)$/.test(el.tagName);
    if (isLayoutish) {
      if (s.paddingTop !== "0px" || s.paddingBottom !== "0px") bump(spacingCount, `padding-y:${s.paddingTop}/${s.paddingBottom}`);
      if (s.paddingLeft !== "0px" || s.paddingRight !== "0px") bump(spacingCount, `padding-x:${s.paddingLeft}/${s.paddingRight}`);
      if (s.marginTop !== "0px" || s.marginBottom !== "0px") bump(spacingCount, `margin-y:${s.marginTop}/${s.marginBottom}`);
      if (s.gap && s.gap !== "normal" && s.gap !== "0px") bump(spacingCount, `gap:${s.gap}`);
    }
  });

  // ---- @font-face + @media breakpoints from accessible stylesheets ----
  const fontFaces = [];
  const mediaQueries = new Map();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
      if (!rules) continue;
    } catch (e) {
      continue; // cross-origin without CORS headers
    }
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSFontFaceRule) {
        fontFaces.push({
          family: rule.style.getPropertyValue("font-family"),
          weight: rule.style.getPropertyValue("font-weight"),
          style: rule.style.getPropertyValue("font-style"),
          src: rule.style.getPropertyValue("src").slice(0, 300),
          sheet: sheet.href,
        });
      } else if (rule instanceof CSSMediaRule && /width/i.test(rule.conditionText)) {
        const key = rule.conditionText.trim();
        const existing = mediaQueries.get(key);
        if (existing) existing.count += 1;
        else mediaQueries.set(key, { sheet: sheet.href, count: 1 });
      }
    }
  }

  // ---- containers (row/wrapper-level elements) ----
  const containerEls = firstN(".fusion-row, .fusion-builder-row, .fusion-footer-widget-area .fusion-row, header .fusion-row", 8);
  const containers = containerEls.map((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      classes: el.className,
      maxWidth: s.maxWidth,
      width: Math.round(r.width),
      paddingLeft: s.paddingLeft,
      paddingRight: s.paddingRight,
    };
  });

  // ---- element types (Avada/Fusion Builder selectors, discovered by inspection) ----
  const elementTypeSelectors = {
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    bodyText: ".fusion-text p, .post-content p, p",
    smallText: "small, .fusion-text small",
    link: ".fusion-text a, .post-content a, article a",
    topBar: ".fusion-secondary-header, .fusion-top-header",
    header: ".fusion-header",
    mainMenuItem: ".fusion-main-menu > ul > li > a, .fusion-main-menu ul.fusion-menu > li > a",
    dropdownMenu: ".fusion-main-menu .sub-menu, .fusion-dropdown-menu, .fusion-dropdown-submenu",
    mobileMenu: ".fusion-mobile-menu, .fusion-mobile-nav-holder",
    sectionTitle: ".fusion-title h1, .fusion-title h2, .fusion-title h3, .fusion-title-heading",
    sectionSubtitle: ".fusion-title-subheading, .fusion-subheading",
    formInput: '.wpcf7-form input[type="text"], .wpcf7-form input[type="email"], .wpcf7-form-control-wrap input',
    formLabel: ".wpcf7-form label",
    submitButton: '.wpcf7-submit, input[type="submit"]',
    footerHeading: ".fusion-footer-widget-area h1, .fusion-footer-widget-area h2, .fusion-footer-widget-area h3, .fusion-footer-widget-area h4",
    footerLink: ".fusion-footer-widget-area a, footer a",
    footerBottomBar: ".fusion-footer-copyright-area",
  };
  const elements = {};
  for (const key of Object.keys(elementTypeSelectors)) {
    const sel = elementTypeSelectors[key];
    const matches = firstN(sel, 50);
    const sampleEl = matches[0];
    elements[key] = {
      count: matches.length,
      sample: sampleEl
        ? { classes: sampleEl.className, text: (sampleEl.textContent || "").trim().slice(0, 60), style: styleOf(sampleEl) }
        : null,
    };
  }

  // button variants (button-1 .. button-6 observed on this theme)
  const buttonVariantEls = firstN('[class*="fusion-button"]', 30);
  const buttonVariantsSeenMap = new Map();
  for (const el of buttonVariantEls) {
    const variantMatch = el.className.match(/button-[1-6]\b/);
    const key = variantMatch ? variantMatch[0] : el.className;
    if (!buttonVariantsSeenMap.has(key)) {
      buttonVariantsSeenMap.set(key, {
        classes: el.className,
        style: styleOf(el),
        text: (el.textContent || "").trim().slice(0, 30),
      });
    }
  }

  // card variants: Avada content boxes / flip boxes / column cards
  const cardSelectors = [
    ".fusion-content-boxes .fusion-content-box",
    ".flip-box-front-inner",
    ".fusion-column-wrapper.fusion-column-has-shadow",
    ".fusion-counter-box",
  ];
  const cards = cardSelectors.map((sel) => {
    const el = first(sel);
    return { selector: sel, count: firstN(sel, 50).length, sample: el ? { classes: el.className, style: styleOf(el) } : null };
  });

  // slider / carousel settings, read via library internals exposed on the page
  const jq = window.jQuery;
  const flexSliders = Array.from(document.querySelectorAll(".flexslider")).map((el) => {
    try {
      const d = jq ? jq(el).data("flexslider") : null;
      if (!d || !d.vars) return { found: false };
      const v = d.vars;
      return {
        found: true,
        animation: v.animation,
        slideshow: v.slideshow,
        slideshowSpeed: v.slideshowSpeed,
        animationSpeed: v.animationSpeed,
        direction: v.direction,
      };
    } catch (e) {
      return { found: false };
    }
  });
  const swiperEls = Array.from(document.querySelectorAll(".awb-swiper, .swiper-container, .swiper"));
  const swipers = swiperEls.map((el) => {
    const inst = el.swiper;
    if (!inst) return { found: false };
    return {
      found: true,
      autoplayDelay: inst.params && inst.params.autoplay ? inst.params.autoplay.delay : null,
      autoplayEnabled: inst.params && inst.params.autoplay ? inst.params.autoplay.enabled : null,
      speed: inst.params ? inst.params.speed : null,
      loop: inst.params ? inst.params.loop : null,
      effect: inst.params ? inst.params.effect : null,
    };
  });
  const counterBoxes = Array.from(document.querySelectorAll(".fusion-counter-box, .counter-box-container"));
  const counters = counterBoxes.slice(0, 5).map((box) => {
    const numberEl = box.querySelector('[class*="counter-box-number"], [data-speed], [data-to]');
    return {
      boxClass: box.className,
      numberElClass: numberEl ? numberEl.className : null,
      dataset: numberEl ? Object.assign({}, numberEl.dataset) : null,
      readable: !!numberEl,
    };
  });

  return {
    colors: topEntries(colorCount, 40),
    fonts: topEntries(fontCount, 20),
    radii: topEntries(radiusCount, 20),
    shadows: topEntries(shadowCount, 20),
    spacing: topEntries(spacingCount, 40),
    fontFaces,
    mediaQueries: Array.from(mediaQueries.entries()).map(([query, v]) => ({ query, sheet: v.sheet, count: v.count })),
    containers,
    elements,
    buttonVariants: Array.from(buttonVariantsSeenMap.entries()).map(([variant, v]) => ({
      variant,
      classes: v.classes,
      style: v.style,
      text: v.text,
    })),
    cards,
    sliders: { flexSliders, swipers },
    counters,
  };
}
