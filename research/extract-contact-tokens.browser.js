// Runs INSIDE the browser page via page.evaluate(), loaded as raw text by
// extract-contact-tokens.ts and evaluated as a string — tsx's esbuild
// transform always sets keepNames:true, which injects __name(...) calls
// that don't exist once Playwright serializes a function via .toString()
// into the browser context (same reason as extract-signup-tokens.browser.js).
// Plain JS, no types.
//
// Selectors are anchored on the Contact Form 7 field names
// (your-name/your-email/your-message, wpcf7-submit) and the column
// heading/subtitle/body tag structure (h3/h5/p), which is stable across
// page rebuilds, rather than Avada's auto-generated per-row/column
// classes.
function extractContactTokens() {
  function styleOf(el, props) {
    if (!el) return null;
    var cs = getComputedStyle(el);
    var out = {};
    for (var i = 0; i < props.length; i++) out[props[i]] = cs.getPropertyValue(props[i]);
    return out;
  }
  function rectGap(a, b) {
    if (!a || !b) return null;
    var ra = a.getBoundingClientRect();
    var rb = b.getBoundingClientRect();
    return Math.round((rb.left - ra.right) * 100) / 100;
  }
  function vGap(a, b) {
    if (!a || !b) return null;
    var ra = a.getBoundingClientRect();
    var rb = b.getBoundingClientRect();
    return Math.round((rb.top - ra.bottom) * 100) / 100;
  }

  // Banner
  var titleBar = document.querySelector(".fusion-page-title-bar, .fusion-title-bar");
  var titleBarBg = titleBar ? getComputedStyle(titleBar).backgroundImage : null;
  var bannerImageUrl = null;
  if (titleBarBg) {
    var m = /url\(["']?(.*?)["']?\)/.exec(titleBarBg);
    if (m) bannerImageUrl = m[1];
  }
  var h1 = document.querySelector("h1.entry-title");
  var breadcrumb = document.querySelector(".fusion-breadcrumbs, .breadcrumbs");

  // Columns (BY PHONE / BY EMAIL / VISIT US / WRITE US)
  var h3s = Array.prototype.slice.call(document.querySelectorAll("h3"));
  var columns = h3s.map(function (h3) {
    var col = h3.closest(".fusion-layout-column, .fusion-column-wrapper");
    var h5 = col ? col.querySelector("h5") : null;
    var p = col ? col.querySelector("p") : null;
    var img = col ? col.querySelector("img") : null;
    var imgRect = img ? img.getBoundingClientRect() : null;
    return {
      heading: h3.textContent.trim(),
      headingStyle: styleOf(h3, ["font-size", "font-weight", "line-height", "font-family", "color", "text-transform"]),
      subtitleText: h5 ? h5.innerText.trim().replace(/\s+/g, " ") : null,
      subtitleStyle: h5 ? styleOf(h5, ["font-size", "font-weight", "letter-spacing", "line-height", "color", "font-family"]) : null,
      bodyText: p ? p.innerText.trim() : null,
      bodyStyle: p ? styleOf(p, ["font-size", "line-height", "color"]) : null,
      imgSrc: img ? img.getAttribute("src") : null,
      imgWidth: imgRect ? Math.round(imgRect.width) : null,
      imgHeight: imgRect ? Math.round(imgRect.height) : null,
    };
  });

  var cols = h3s.map(function (h3) {
    return h3.closest(".fusion-layout-column, .fusion-column-wrapper");
  });
  var columnsGap = cols.length >= 2 ? rectGap(cols[0], cols[1]) : null;

  // Map heading + area
  var mapHeading = null;
  var h2s = document.querySelectorAll("h2");
  for (var i = 0; i < h2s.length; i++) {
    if (h2s[i].textContent.indexOf("Locate Us") !== -1) {
      mapHeading = h2s[i];
      break;
    }
  }
  var iframe = document.querySelector('iframe[src*="maps"]');
  var mapArea = iframe ? iframe.closest("div") : null;
  var mapAreaRect = mapArea ? mapArea.getBoundingClientRect() : null;

  // Form band
  var nameInput = document.querySelector('input[name="your-name"]');
  var emailInput = document.querySelector('input[name="your-email"]');
  var messageTextarea = document.querySelector('textarea[name="your-message"]');
  var submitButton = document.querySelector("input.wpcf7-submit, .wpcf7-form-control.wpcf7-submit");
  var form = nameInput ? nameInput.closest("form") : null;
  var band = form ? form.closest(".fusion-fullwidth, .fusion-builder-row-container") : null;

  var layout = "stacked";
  if (nameInput && emailInput) {
    var nTop = nameInput.getBoundingClientRect().top;
    var eTop = emailInput.getBoundingClientRect().top;
    if (Math.abs(nTop - eTop) < 2) layout = "row";
  }

  return {
    banner: {
      bannerImageUrl: bannerImageUrl,
      titleBarStyle: styleOf(titleBar, ["height", "background-color"]),
      h1Style: styleOf(h1, ["font-size", "font-weight", "color"]),
      breadcrumbText: breadcrumb ? breadcrumb.textContent.trim().replace(/\s+/g, " ") : null,
      breadcrumbStyle: styleOf(breadcrumb, ["font-size", "color"]),
    },
    columns: columns,
    columnsGap: columnsGap,
    map: {
      headingText: mapHeading ? mapHeading.textContent.trim() : null,
      headingStyle: styleOf(mapHeading, ["font-size", "font-weight", "color", "text-align"]),
      areaHeight: mapAreaRect ? Math.round(mapAreaRect.height) : null,
    },
    form: {
      bandStyle: styleOf(band, ["background-color", "padding-top", "padding-bottom"]),
      inputStyle: styleOf(nameInput, ["height", "padding", "font-size", "border", "border-radius", "background-color"]),
      inputPlaceholderColor: nameInput ? getComputedStyle(nameInput, "::placeholder").color : null,
      textareaStyle: styleOf(messageTextarea, ["height", "padding", "font-size", "border", "border-radius", "background-color"]),
      buttonStyle: submitButton
        ? styleOf(submitButton, ["background-color", "height", "padding", "font-size", "font-weight", "border-radius", "color", "font-family"])
        : null,
      gapX: rectGap(nameInput, emailInput),
      gapY: vGap(nameInput, messageTextarea),
      layout: layout,
    },
  };
}
