// Runs INSIDE the browser page via page.evaluate(), loaded as raw text by
// extract-signup-tokens.ts and evaluated as a string — same reason as
// extract-tokens.browser.js: tsx's esbuild transform always sets
// keepNames:true, which injects __name(...) calls that don't exist once
// Playwright serializes a function via .toString() into the browser
// context. Plain JS, no types.
//
// Selectors are anchored on the Contact Form 7 field names
// (your-name/your-email/your-phone, wpcf7-submit) rather than Avada's
// auto-generated per-row/column classes (fusion-builder-row-9 etc.),
// which are not stable identifiers across page rebuilds.
function extractSignupTokens() {
  function styleOf(el, props) {
    if (!el) return null;
    var cs = getComputedStyle(el);
    var out = {};
    for (var i = 0; i < props.length; i++) out[props[i]] = cs.getPropertyValue(props[i]);
    return out;
  }

  var nameInput = document.querySelector('input[name="your-name"]');
  var emailInput = document.querySelector('input[name="your-email"]');
  var phoneInput = document.querySelector('input[name="your-phone"]');
  var submitButton = document.querySelector(".wpcf7-form-control.wpcf7-submit, input.wpcf7-submit");
  var form = nameInput ? nameInput.closest("form") : null;

  // The full-width row this form sits in — Avada renders it as the
  // closest ancestor with the fusion-fullwidth class; that class name
  // itself is stable even though the per-row modifier (fusion-builder-row-N)
  // is not.
  var band = form ? form.closest(".fusion-fullwidth") : null;

  // Heading/supporting text sit in fusion-text wrapper divs immediately
  // preceding the form's own wrapper column content — walk up to the
  // shared column, then find the h3 (heading) and h4 (supporting line)
  // inside it.
  var column = form ? form.closest(".fusion-column-wrapper, .fusion-layout-column") : null;
  var heading = column ? column.querySelector("h3") : null;
  var supporting = column ? column.querySelector("h4") : null;
  var note = column ? column.querySelector("p, .fusion-text:last-child") : null;

  // Both the heading and the supporting line wrap their entire text in one
  // inner <span style="color:...">; the outer h3/h4 element's own computed
  // color is its inherited default, not the (overriding) rendered colour
  // of the text — read the span, not the container, or the colour comes
  // back wrong.
  var supportingSpan = supporting ? supporting.querySelector("span") : null;

  var headingSpans = heading ? Array.prototype.slice.call(heading.querySelectorAll("span")) : [];
  // The highlighted span is whichever one isn't white/near-white — Avada
  // renders "Join Over" and "Enjoying..." in white and the number in gold.
  var highlightSpan = null;
  for (var i = 0; i < headingSpans.length; i++) {
    var color = getComputedStyle(headingSpans[i]).color;
    if (color !== "rgb(255, 255, 255)") {
      highlightSpan = headingSpans[i];
      break;
    }
  }

  function rectGap(a, b) {
    if (!a || !b) return null;
    var ra = a.getBoundingClientRect();
    var rb = b.getBoundingClientRect();
    return Math.round((rb.left - ra.right) * 100) / 100;
  }

  var layout = "stacked";
  if (nameInput && emailInput) {
    var nTop = nameInput.getBoundingClientRect().top;
    var eTop = emailInput.getBoundingClientRect().top;
    if (Math.abs(nTop - eTop) < 2) layout = "row";
  }

  return {
    headingText: heading ? heading.textContent.trim().replace(/\s+/g, " ") : null,
    headingSpanTexts: headingSpans.map(function (s) {
      return s.textContent;
    }),
    highlightText: highlightSpan ? highlightSpan.textContent : null,
    highlightColor: highlightSpan ? getComputedStyle(highlightSpan).color : null,
    headingStyle: styleOf(heading, ["font-size", "line-height", "font-weight", "font-family"]),
    supportingText: supporting ? supporting.textContent.trim() : null,
    supportingStyle: styleOf(supportingSpan || supporting, [
      "font-size",
      "line-height",
      "font-weight",
      "color",
      "font-family",
    ]),
    noteText: note ? note.textContent.trim() : null,
    bandBackground: band ? getComputedStyle(band).backgroundColor : null,
    bandPaddingTop: band ? getComputedStyle(band).paddingTop : null,
    bandPaddingBottom: band ? getComputedStyle(band).paddingBottom : null,
    inputStyle: styleOf(nameInput, [
      "height",
      "padding",
      "font-size",
      "border",
      "border-radius",
      "background-color",
      "color",
    ]),
    inputPlaceholderColor: (function () {
      // ::placeholder isn't reachable via getComputedStyle on the element
      // itself; Avada's theme uses a fixed placeholder color across
      // browsers for this input class, read from a probe element's
      // computed style isn't possible for pseudo-elements either, so this
      // is left null here and confirmed visually against the screenshot
      // instead (documented in design-tokens.md).
      return null;
    })(),
    gapBetweenInputs: rectGap(nameInput, emailInput),
    buttonStyle: submitButton
      ? styleOf(submitButton, [
          "background-color",
          "padding",
          "font-size",
          "font-weight",
          "border-radius",
          "color",
          "font-family",
        ])
      : null,
    layout: layout,
  };
}
