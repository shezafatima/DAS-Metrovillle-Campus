import { settingsCopy } from "@/content/admin";
import type { GroupDefinition } from "../types";

const labels = settingsCopy.fields.hero;

/** Fixed id of the bundled starting slide, so its first save is stable. */
export const DEFAULT_HERO_SLIDE_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Hero slides (005 FR-012–FR-016). The starting value is one visible slide
 * with the bundled branded placeholder images (clarification 1), so "at
 * least one visible slide" holds from the first request.
 */
export const heroDefinition: GroupDefinition = {
  key: "hero",
  label: settingsCopy.groups.hero.title,
  fields: [
    {
      type: "number",
      key: "displaySeconds",
      label: labels.displaySeconds,
      hint: settingsCopy.hints.displaySeconds,
      min: 3,
      max: 15,
      required: true,
      errorMessage: settingsCopy.errors.displaySeconds,
      default: 5,
    },
    {
      type: "list",
      key: "slides",
      label: labels.slides,
      itemLabel: "slide",
      maxItems: 10,
      layout: "table",
      addMode: "panel",
      summary: { image: "desktop", title: ["heading", "alt"] },
      rules: [
        { kind: "atLeastOneVisible", field: "visible", message: settingsCopy.errors.lastVisibleSlide },
        { kind: "allOrNone", fields: ["buttonLabel", "buttonLink"], message: settingsCopy.errors.buttonPair },
      ],
      itemFields: [
        { type: "image", key: "desktop", label: labels.desktop, hint: settingsCopy.hints.heroDesktop, required: true, folder: "settings/hero", kind: "hero-desktop" },
        { type: "image", key: "mobile", label: labels.mobile, hint: settingsCopy.hints.heroMobile, folder: "settings/hero", kind: "hero-mobile" },
        { type: "text", key: "alt", label: labels.alt, maxLength: 150, required: true },
        { type: "text", key: "heading", label: labels.heading, maxLength: 80 },
        { type: "text", key: "buttonLabel", label: labels.buttonLabel, maxLength: 30 },
        { type: "url", key: "buttonLink", label: labels.buttonLink, hint: settingsCopy.hints.buttonLink, maxLength: 500, allowPath: true },
        { type: "boolean", key: "visible", label: labels.visible, default: true },
      ],
      default: [
        {
          id: DEFAULT_HERO_SLIDE_ID,
          desktop: { url: "/images/hero/placeholder-desktop.svg", publicId: "", width: 1920, height: 700 },
          mobile: { url: "/images/hero/placeholder-mobile.svg", publicId: "", width: 750, height: 900 },
          alt: "Dar-e-Arqam Schools",
          heading: "",
          buttonLabel: "",
          buttonLink: "",
          visible: true,
        },
      ],
    },
  ],
};
