/**
 * Single typed content source for the public site shell (top bar, header
 * menu, footer). Editing values here changes what renders everywhere they
 * are read, with no layout-code change — see
 * specs/001-site-shell/contracts/content-schema.md.
 */

export type SocialPlatform = "facebook" | "instagram" | "youtube" | "tiktok";

export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  /** Ordinary Google Maps share link, always present regardless of the embedded map's fate (008 clarification Q2). */
  mapUrl: string;
  /** Placeholder until the client confirms Metroville's real office hours (008). */
  officeHours: string;
  social: Partial<Record<SocialPlatform, string>>;
}

export interface PortalLink {
  label: string;
  href: string;
}

export interface FooterContent {
  /** A short description of the school, under the logo. */
  description: string;
  logo: { src: string; alt: string; width: number; height: number };
  headings: { quickLinks: string; portalLinks: string; contact: string };
  /** Said after an external link's label for assistive technology (014b): "LMS App (opens external site in a new tab)". The footer puts the space between them. */
  externalLinkSuffix: string;
  /** The main pages (Campuses is deliberately not here; Careers is). */
  quickLinks: PortalLink[];
  /** "Get directions": goes to the Contact page. */
  directions: PortalLink;
  /** The copyright sentence for a year (the year is generated, never typed in). */
  copyright: (year: number) => string;
  /** "Developed by <name>", the developer credit (the name is the link). */
  credit: { before: string; name: string; href: string };
}

/**
 * The sections of the pages that used to have sub-routes. Each page is ONE
 * route; its former sub-routes are sections with these ids (`/about#overview`).
 * The menu children and the page sections come from here, so an id is
 * defined once. Admission's old-route redirects in next.config.ts also come
 * from here; About's and Academics' ids were remapped (see the legacy maps).
 */
export interface PageSection {
  /** Short, lowercase, hyphenated and stable: it is the URL fragment. */
  id: string;
  /** The section's h2 and its menu label. */
  label: string;
}

export const pageSections = {
  about: [
    { id: "our-story", label: "Our Story" },
    { id: "vision-mission", label: "Vision & Mission" },
    { id: "core-values", label: "Core Values" },
    { id: "management-team", label: "Our Management Team" },
    { id: "messages", label: "Messages" },
  ],
  /**
   * Syllabi and Examination (014b) are admin-managed: each is listed, rendered and searchable only while it has
   * content (src/lib/page-sections/dynamic.ts).
   */
  academics: [
    { id: "academic-overview", label: "Academic Overview" },
    { id: "syllabi", label: "Syllabi" },
    { id: "examination", label: "Examination" },
    { id: "teachers-training", label: "Teachers' Training" },
    { id: "hifz-e-quran", label: "Hifz-e-Quran" },
  ],
  /**
   * Class Levels (014b) is admin-managed: it is listed, rendered and searchable only while it has rows
   * (src/lib/page-sections/dynamic.ts). /admission/class-levels redirects to /admission#class-levels, derived from this list.
   */
  admission: [
    { id: "admission-procedure", label: "Admission Procedure" },
    { id: "class-levels", label: "Class Levels" },
    { id: "uniform", label: "Uniform" },
  ],
  /** Photo Gallery is rendered by GallerySection (007, hidden when empty). The menu, search and the page all read this list. */
  resources: [
    { id: "photo-gallery", label: "Photo Gallery" },
    { id: "mobile-apps", label: "School App" },
  ],
} satisfies Record<string, PageSection[]>;

/**
 * About's old section ids (overview, salient-features, management, messages)
 * were remapped in 017. These four old sub-routes still redirect, to the
 * nearest new section. next.config.ts reads this; Admission derives its
 * redirects from `pageSections`.
 */
export const legacyAboutRedirects: { source: string; destination: string }[] = [
  { source: "/about/overview", destination: "/about#our-story" },
  { source: "/about/salient-features", destination: "/about" },
  { source: "/about/management", destination: "/about#management-team" },
  { source: "/about/messages", destination: "/about#messages" },
];

/**
 * Academics' section ids were remapped in 018 (`academics-overview` became
 * `academic-overview`; Syllabi and Examinations were removed). The old
 * sub-routes still redirect, to the nearest new section. `/hifz-e-quran` keeps
 * its own rule in next.config.ts.
 */
export const legacyAcademicsRedirects: { source: string; destination: string }[] = [
  { source: "/academics/academics-overview", destination: "/academics#academic-overview" },
  // 014b: Syllabi is a section again; with no content its anchor matches nothing and the page opens at the top.
  { source: "/academics/syllabi", destination: "/academics#syllabi" },
  { source: "/academics/examinations", destination: "/academics#examination" },
  { source: "/academics/teachers-training", destination: "/academics#teachers-training" },
];

function anchors(path: string, sections: PageSection[]): NavigationItem[] {
  return sections.map((section) => ({ label: section.label, href: `${path}#${section.id}` }));
}

// Fixed render order (FR-001). Sections are grounded in the live reference
// site (das.edu.pk), not docs/prd.md's rougher "TBD: subpages such as..."
// guess. About, Academics, Admission and Resources are single pages whose
// dropdown links are anchors to their sections; News is a plain link. Adding/removing a section later is a content
// edit only (FR-004), never a code change.
export const navigationItems: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about", children: anchors("/about", pageSections.about) },
  { label: "Careers", href: "/careers" },
  { label: "Academics", href: "/academics", children: anchors("/academics", pageSections.academics) },
  { label: "Admission", href: "/admission", children: anchors("/admission", pageSections.admission) },
  { label: "Resources", href: "/resources", children: anchors("/resources", pageSections.resources) },
  { label: "News", href: "/news" },
  { label: "Contact", href: "/contact" },
];

// The footer's portal links (DAS Portal, ePortal, ...) are admin-managed since
// 014b: Settings → Site-wide → Portal links, read by the shell from the
// `portalLinks` settings group. The old placeholder pages for those links are
// retired: their addresses redirect to the home page (next.config.ts).

// Real Metroville phone/email/address are not yet supplied (PRD §5.3, Open
// Question 8) — these are marked placeholders, not fabricated real values.
// Swapping in the real values later is a content edit only (FR-013). Shown
// in the footer only — the reference top bar carries portal/social links
// instead (see spec.md's updated FR-010/FR-025 and Assumptions).
// mapUrl and officeHours (008) are placeholders too, pending the client's
// real Metroville address and hours — 005 (Settings) will make all of
// these admin-editable; getContactDetails() is the only seam that changes.
export const contactInfo: ContactInfo = {
  phone: "+92-42-0000000",
  email: "metroville@dararqam.edu.pk",
  address: "Dar-e-Arqam School, Metroville Campus — address TBD",
  mapUrl: "https://maps.google.com/?q=Dar-e-Arqam+School+Metroville",
  officeHours: "Monday to Saturday, 9am to 6pm PST",
  social: {
    facebook: "https://www.facebook.com/arqam.metroville",
    youtube: "https://www.youtube.com/@DASMetroville",
    instagram: "https://www.instagram.com/darearqam_metroville",
    tiktok: "https://www.tiktok.com/@dar_e_arqam_metroville",
  },
};

// The actual das.edu.pk footer (consistent across all 11 crawled pages per
// research/design-tokens.md — "6 footer links, 1 footer bottom bar") has no
// link-columns or quick-links section at all: just a bottom bar (copyright +
// credit link + social icons) — confirmed directly against the reference by
// the user, correcting this feature's earlier quick-links-row addition.
export const footerContent: FooterContent = {
  // PENDING CLIENT APPROVAL: this description was supplied by the project owner and has not been approved by the client yet.
  description:
    "Dar-e-Arqam School, Metroville Campus, offers quality education rooted in Islamic values, helping every student grow in knowledge, character and faith.",
  logo: { src: "/images/logo.svg", alt: "Dar-e-Arqam School Metroville Campus", width: 1974, height: 797 },
  headings: { quickLinks: "Quick Links", portalLinks: "Portal Links", contact: "Contact Us" },
  externalLinkSuffix: "(opens external site in a new tab)",
  quickLinks: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Academics", href: "/academics" },
    { label: "Admission", href: "/admission" },
    { label: "Resources", href: "/resources" },
    { label: "News", href: "/news" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  directions: { label: "Get directions", href: "/contact" },
  copyright: (year) => `© ${year} Dar-e-Arqam School, Metroville Campus. All rights reserved.`,
  credit: { before: "Developed by", name: "Sheza Fatima", href: "https://sheza-fatima.vercel.app/" },
};

// Fallback social-preview image for pages with no page-specific one (e.g.
// a news post with no cover image — FR-031 US6 scenario 2). The brand logo
// is an SVG placeholder pending a proper 1200x630 raster design asset;
// most modern crawlers (Facebook, X, Slack, Discord) accept SVG, but this
// should be replaced with a designed PNG/JPEG when one exists.
export const SITE_OG_IMAGE = "/images/logo.svg";
