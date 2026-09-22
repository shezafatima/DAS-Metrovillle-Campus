// Runs INSIDE the browser page via page.evaluate(), loaded as raw text by
// extract-news-tokens.ts and evaluated as a string — same reason as
// extract-tokens.browser.js: tsx's esbuild transform always sets
// keepNames:true, which injects __name(...) calls that don't exist once
// Playwright serializes a function via .toString() into the browser
// context. Plain JS, no types.
function extractNewsCardTokens() {
  function styleOf(el, props) {
    if (!el) return null;
    var cs = getComputedStyle(el);
    var out = {};
    for (var i = 0; i < props.length; i++) out[props[i]] = cs.getPropertyValue(props[i]);
    return out;
  }

  var articles = Array.prototype.slice.call(document.querySelectorAll("article.fusion-post-grid"));
  var firstArticle = articles[0] || null;
  var firstTitle = firstArticle ? firstArticle.querySelector("h2.entry-title") : null;
  var firstMeta = firstArticle ? firstArticle.querySelector(".fusion-single-line-meta") : null;
  var firstExcerpt = firstArticle ? firstArticle.querySelector(".fusion-post-content-container p") : null;
  var firstReadMore = firstArticle ? firstArticle.querySelector(".fusion-read-more") : null;
  var wrapper = document.querySelector(".fusion-post-wrapper");
  var wrapperContentBox = document.querySelector(".fusion-post-content-wrapper");

  var columns = 1;
  var gapX = null;
  if (articles.length > 1) {
    var firstTop = articles[0].getBoundingClientRect().top;
    var sameRow = articles.filter(function (a) {
      return Math.abs(a.getBoundingClientRect().top - firstTop) < 2;
    });
    columns = sameRow.length;
    if (sameRow.length > 1) {
      var r0 = sameRow[0].getBoundingClientRect();
      var r1 = sameRow[1].getBoundingClientRect();
      gapX = Math.round((r1.left - r0.right) * 100) / 100;
    }
  }

  var cardImage = null;
  for (var i = 0; i < articles.length; i++) {
    var img = articles[i].querySelector("img");
    if (img) {
      var r = img.getBoundingClientRect();
      cardImage = { renderedWidth: r.width, renderedHeight: r.height };
      break;
    }
  }

  var banner = document.querySelector(".fusion-page-title-bar, .fusion-title-container, .page-title-bar");
  var bannerTitle = banner ? banner.querySelector("h1, .fusion-page-title") : null;
  var breadcrumb = document.querySelector(".fusion-breadcrumbs, .breadcrumbs");
  var wrapperCs = wrapper ? getComputedStyle(wrapper) : null;

  return {
    columns: columns,
    gapX: gapX,
    titleStyle: styleOf(firstTitle, ["font-size", "line-height", "font-weight", "color"]),
    metaStyle: styleOf(firstMeta, ["font-size", "line-height", "color"]),
    excerptStyle: styleOf(firstExcerpt, ["font-size", "line-height", "color"]),
    readMoreStyle: styleOf(firstReadMore, ["font-size", "line-height", "color", "font-weight"]),
    wrapperPadding: wrapperContentBox ? getComputedStyle(wrapperContentBox).padding : null,
    wrapperBorder: wrapperCs
      ? {
          top: wrapperCs.borderTop,
          bottom: wrapperCs.borderBottom,
          sides: wrapperCs.borderLeft,
          radius: wrapperCs.borderRadius,
          shadow: wrapperCs.boxShadow,
        }
      : null,
    cardImage: cardImage,
    bannerHeight: banner ? banner.getBoundingClientRect().height : null,
    bannerBg: banner ? getComputedStyle(banner).backgroundColor : null,
    bannerTitleFontSize: bannerTitle ? getComputedStyle(bannerTitle).fontSize : null,
    bannerTitleColor: bannerTitle ? getComputedStyle(bannerTitle).color : null,
    breadcrumbFontSize: breadcrumb ? getComputedStyle(breadcrumb).fontSize : null,
    breadcrumbColor: breadcrumb ? getComputedStyle(breadcrumb).color : null,
  };
}
