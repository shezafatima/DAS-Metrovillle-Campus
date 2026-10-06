// Runs INSIDE the browser page (see extract-home-tokens.browser.js for why it
// is plain JS loaded as text). Second, targeted pass for the 006 home page:
// the hero slider, the flip-box backs, the counter labels/icons and the
// "Why Choose" video, which the row walk did not break down.
function extractHomeDetails() {
  var TYPE = ["font-family", "font-size", "font-weight", "line-height", "color", "text-transform", "text-align"];
  function styleOf(el, props) {
    if (!el) return null;
    var cs = getComputedStyle(el);
    var out = {};
    for (var i = 0; i < props.length; i++) out[props[i]] = cs.getPropertyValue(props[i]);
    return out;
  }
  function rect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top + window.scrollY) };
  }
  function text(el) {
    return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : null;
  }

  var hero = document.querySelector(".fusion-slider-container, .rev_slider_wrapper, .flexslider, #sliders-container > *");
  var heroImg = hero ? hero.querySelector("img") : null;
  var heroBg = hero ? hero.querySelector("[style*='background-image'], .background-image") : null;
  var heroArrow = hero ? hero.querySelector(".flex-next, .tp-rightarrow, .swiper-button-next") : null;
  var heroDots = hero ? hero.querySelector(".flex-control-nav, .tp-bullets") : null;

  var flips = Array.prototype.slice.call(document.querySelectorAll(".flip-box-wrapper, .fusion-flip-box")).map(function (box) {
    var front = box.querySelector(".flip-box-front");
    var back = box.querySelector(".flip-box-back");
    return {
      title: text(box.querySelector(".flip-box-front h2, .flip-box-heading")),
      size: rect(box),
      frontBg: front ? getComputedStyle(front).backgroundColor : null,
      frontBorder: front ? styleOf(front, ["border-top-width", "border-top-color", "border-radius"]) : null,
      backBg: back ? getComputedStyle(back).backgroundColor : null,
      backTitle: text(back && back.querySelector("h3, .flip-box-heading-back")),
      backText: text(back && back.querySelector("p, .flip-box-back-inner")),
      frontText: text(front && front.querySelector("p, .flip-box-front-inner > div:last-child")),
      frontTextStyle: styleOf(front && front.querySelector("p, .flip-box-front-inner"), TYPE),
      link: (box.querySelector("a") || {}).href || null,
    };
  });

  var counters = Array.prototype.slice.call(document.querySelectorAll(".fusion-counter-box")).map(function (c) {
    var info = c.querySelector(".counter-box-info-title, .fusion-counter-box-info, .counter-box-content + *");
    var icon = c.querySelector("i, .counter-box-icon, img");
    return {
      html: (c.innerText || "").replace(/\s+/g, " ").trim(),
      value: text(c.querySelector(".display-counter")),
      unitStyle: styleOf(c.querySelector(".display-counter"), TYPE),
      info: text(info),
      infoStyle: styleOf(info, TYPE),
      icon: icon ? { tag: icon.tagName.toLowerCase(), className: icon.className, color: getComputedStyle(icon).color, size: getComputedStyle(icon).fontSize } : null,
      size: rect(c),
    };
  });

  var video = document.querySelector(".fusion-video, .fusion-youtube, iframe[src*='youtube'], [data-src*='youtube'], .wp-video, video");
  var whyHeading = Array.prototype.slice.call(document.querySelectorAll("h3")).filter(function (h) {
    return /why choose/i.test(text(h) || "");
  })[0];
  var whyColumn = whyHeading ? whyHeading.closest(".fusion-layout-column") : null;
  var whyParas = whyColumn ? Array.prototype.slice.call(whyColumn.querySelectorAll("p")).map(text).filter(Boolean) : [];

  var findUs = Array.prototype.slice.call(document.querySelectorAll("h3")).filter(function (h) {
    return /learning experience/i.test(text(h) || "");
  })[0];
  var findUsSpans = findUs ? Array.prototype.slice.call(findUs.querySelectorAll("span, strong, b")).map(function (s) {
    return { text: text(s), color: getComputedStyle(s).color };
  }) : [];

  var quickLinks = Array.prototype.slice.call(document.querySelectorAll("img[src*='photos_videos'], img[src*='downloads'], img[src*='our_books'], img[src*='call_mail_chat']")).map(function (img) {
    var a = img.closest("a");
    return { src: img.currentSrc || img.src, href: a ? a.href : null, size: rect(img) };
  });

  var partners = Array.prototype.slice.call(document.querySelectorAll(".fusion-fullwidth:last-of-type img, .fusion-image-carousel img")).map(function (img) {
    var a = img.closest("a");
    return { src: img.currentSrc || img.src, alt: img.getAttribute("alt"), href: a ? a.href : null };
  });

  var books = Array.prototype.slice.call(document.querySelectorAll("img[src*='Workbooks'], img[src*='workbook'], img[src*='Book']")).map(function (img) {
    var a = img.closest("a");
    return { src: img.currentSrc || img.src, href: a ? a.href : null };
  });

  return {
    hero: hero
      ? {
          className: hero.className,
          size: rect(hero),
          image: heroImg ? heroImg.currentSrc || heroImg.src : null,
          background: heroBg ? getComputedStyle(heroBg).backgroundImage : null,
          slideCount: hero.querySelectorAll(".slides > li, .tp-revslider-slidesli, .swiper-slide").length,
          arrow: heroArrow ? { size: rect(heroArrow), style: styleOf(heroArrow, ["color", "background-color", "font-size", "width", "height", "border-radius"]) } : null,
          dots: heroDots ? { style: styleOf(heroDots.querySelector("a, span, li") || heroDots, ["width", "height", "background-color", "border-radius"]) } : null,
        }
      : null,
    flips: flips,
    counters: counters,
    video: video ? { tag: video.tagName.toLowerCase(), src: video.getAttribute("src") || video.getAttribute("data-src"), size: rect(video), html: video.outerHTML.slice(0, 300) } : null,
    whyChooseParagraphs: whyParas,
    findUsSpans: findUsSpans,
    quickLinks: quickLinks,
    partners: partners,
    books: books,
  };
}
