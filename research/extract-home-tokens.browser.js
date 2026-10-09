// Runs INSIDE the browser page via page.evaluate(), loaded as raw text by
// extract-home-tokens.ts (same reason as the other *.browser.js files: tsx's
// keepNames transform would inject __name() calls that don't exist in the
// page). Plain JS, no types.
//
// Walks every full-width Avada row of the home page in document order (the
// home page's sections) and records, per row, the computed values the 006
// home sections need: background, padding, heading/body type, images,
// buttons, cards (flip boxes, columns with shadow), counters and carousels.
// Section identity is the row's first heading text; rows are never matched
// by Avada's generated per-row classes, which are not stable.
function extractHomeTokens() {
  var TYPE = ["font-family", "font-size", "font-weight", "line-height", "color", "text-transform", "letter-spacing", "text-align"];
  var BOX = ["padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top", "margin-bottom", "border-radius", "box-shadow", "background-color", "border-top-width", "border-top-color", "border-bottom-width", "border-bottom-color"];

  function styleOf(el, props) {
    if (!el) return null;
    var cs = getComputedStyle(el);
    var out = {};
    for (var i = 0; i < props.length; i++) out[props[i]] = cs.getPropertyValue(props[i]);
    return out;
  }
  function rect(el) {
    var r = el.getBoundingClientRect();
    return { width: Math.round(r.width), height: Math.round(r.height) };
  }
  function text(el) {
    return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : null;
  }
  function firstN(list, n) {
    return Array.prototype.slice.call(list, 0, n);
  }
  function bgImage(el) {
    var cs = getComputedStyle(el);
    var img = cs.backgroundImage;
    return img && img !== "none" ? img : null;
  }

  var rows = Array.prototype.slice.call(document.querySelectorAll(".post-content .fusion-fullwidth, #main .fusion-fullwidth"));
  // De-duplicate nested rows (keep outermost).
  rows = rows.filter(function (row, i) {
    for (var j = 0; j < rows.length; j++) if (j !== i && rows[j].contains(row)) return false;
    return true;
  });

  var sections = rows.map(function (row, index) {
    var headings = Array.prototype.slice.call(row.querySelectorAll("h1, h2, h3, h4"));
    var visibleHeadings = headings.filter(function (h) {
      return h.getBoundingClientRect().height > 0;
    });
    var paragraphs = Array.prototype.slice.call(row.querySelectorAll("p")).filter(function (p) {
      return text(p) && p.getBoundingClientRect().height > 0;
    });
    var images = Array.prototype.slice.call(row.querySelectorAll("img")).map(function (img) {
      var r = rect(img);
      return { src: img.currentSrc || img.src, alt: img.getAttribute("alt"), width: r.width, height: r.height, objectFit: getComputedStyle(img).objectFit };
    });
    var buttons = Array.prototype.slice.call(row.querySelectorAll("a.fusion-button, .fusion-button, a.button, .wpcf7-submit")).map(function (b) {
      return { text: text(b), href: b.getAttribute("href"), size: rect(b), style: styleOf(b, TYPE.concat(BOX)) };
    });
    var columns = Array.prototype.slice.call(row.querySelectorAll(".fusion-layout-column")).filter(function (c) {
      return c.getBoundingClientRect().height > 0;
    });
    var flipBoxes = Array.prototype.slice.call(row.querySelectorAll(".flip-box-front, .flip-box-front-inner")).map(function (f) {
      return { size: rect(f), style: styleOf(f, BOX), title: text(f.querySelector("h2, h3, .flip-box-heading")), titleStyle: styleOf(f.querySelector("h2, h3, .flip-box-heading"), TYPE), bodyStyle: styleOf(f.querySelector("p, .flip-box-front-inner > div"), TYPE) };
    });
    var counters = Array.prototype.slice.call(row.querySelectorAll(".fusion-counter-box, .counter-box-container")).map(function (c) {
      var value = c.querySelector(".display-counter, .counter-box-content, .content-box-percentage");
      return { value: text(value), valueStyle: styleOf(value, TYPE), label: text(c.querySelector(".counter-box-info-title, .counter-box-content + div, .counter-box-container p")), size: rect(c), labelStyle: styleOf(c.querySelector(".counter-box-info-title, p"), TYPE) };
    });
    var swipers = Array.prototype.slice.call(row.querySelectorAll(".swiper, .swiper-container, .awb-swiper, .fusion-carousel")).map(function (sw) {
      var box = sw.getBoundingClientRect();
      var slides = Array.prototype.slice.call(sw.querySelectorAll(".swiper-slide, .fusion-carousel-item"));
      var visible = slides.filter(function (s) {
        var r = s.getBoundingClientRect();
        return r.width > 0 && r.left >= box.left - 2 && r.right <= box.right + 2;
      });
      var first = visible[0] || slides[0];
      var next = row.querySelector(".swiper-button-next, .fusion-nav-next, .flex-next");
      return {
        totalSlides: slides.length,
        visibleSlides: visible.length,
        slideSize: first ? rect(first) : null,
        slideGap: visible.length > 1 ? Math.round(visible[1].getBoundingClientRect().left - visible[0].getBoundingClientRect().right) : null,
        arrow: next ? { size: rect(next), style: styleOf(next, BOX.concat(["color", "opacity", "width", "height"])) } : null,
        dots: !!row.querySelector(".swiper-pagination-bullet, .flex-control-paging"),
      };
    });
    var shadowColumns = Array.prototype.slice.call(row.querySelectorAll(".fusion-column-has-shadow")).map(function (c) {
      return { size: rect(c), style: styleOf(c, BOX) };
    });
    var iframe = row.querySelector("iframe");

    return {
      index: index,
      id: row.id || null,
      firstHeading: text(visibleHeadings[0] || headings[0]),
      size: rect(row),
      background: { color: getComputedStyle(row).backgroundColor, image: bgImage(row) },
      box: styleOf(row, BOX),
      contentWidth: (function () {
        var inner = row.querySelector(".fusion-row");
        return inner ? rect(inner).width : null;
      })(),
      headings: firstN(visibleHeadings, 6).map(function (h) {
        return { tag: h.tagName.toLowerCase(), text: text(h), style: styleOf(h, TYPE.concat(["margin-bottom"])) };
      }),
      paragraphs: firstN(paragraphs, 4).map(function (p) {
        return { text: text(p).slice(0, 300), style: styleOf(p, TYPE) };
      }),
      columnsPerRow: (function () {
        if (columns.length === 0) return 0;
        var top = columns[0].getBoundingClientRect().top;
        return columns.filter(function (c) {
          return Math.abs(c.getBoundingClientRect().top - top) < 4;
        }).length;
      })(),
      images: images,
      buttons: buttons,
      flipBoxes: flipBoxes,
      counters: counters,
      swipers: swipers,
      shadowColumns: shadowColumns,
      iframe: iframe ? { src: iframe.getAttribute("src"), size: rect(iframe) } : null,
    };
  });

  return { viewportWidth: window.innerWidth, sections: sections };
}
