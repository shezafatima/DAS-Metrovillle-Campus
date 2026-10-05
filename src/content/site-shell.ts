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
  /** Small caption shown under the label (e.g. "Front Page" under Home) —
   * confirmed on the live reference site (das.edu.pk), optional so an item
   * can omit it without a code change. */
  tagline?: string;
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
  /** The brand name shown in the copyright line (e.g. "Dar-e-Arqam
   * Schools") — the reference footer's bottom bar is the *entire*
   * footer, no columns or quick-links row above it. */
  bottomText: string;
  /** Links shown in the bottom bar beside the copyright (012: Careers; PRD §4 keeps it out of the main menu). */
  links: PortalLink[];
}

// Fixed render order (FR-001). Taglines and sub-pages below are grounded in
// the live reference site (das.edu.pk) itself, not docs/prd.md's rougher
// "TBD: subpages such as..." guess, which named pages the site doesn't
// actually have (e.g. it guessed "Uniform" under Academics, but that page is
// really under Admission). Adding/removing a sub-page later is a content
// edit only (FR-004), never a code change.
export const navigationItems: NavigationItem[] = [
  { label: "Home", href: "/", tagline: "Front Page" },
  {
    label: "About",
    href: "/about",
    tagline: "Who We Are?",
    children: [
      { label: "Overview", href: "/about/overview" },
      { label: "Salient Features", href: "/about/salient-features" },
      { label: "Management", href: "/about/management" },
      { label: "Messages", href: "/about/messages" },
    ],
  },
  { label: "Campuses", href: "/campuses", tagline: "Branch Network" },
  {
    label: "Academics",
    href: "/academics",
    tagline: "Our Courses",
    children: [
      { label: "Academics Overview", href: "/academics/academics-overview" },
      { label: "Syllabi", href: "/academics/syllabi" },
      { label: "Examinations", href: "/academics/examinations" },
      { label: "Teachers' Training", href: "/academics/teachers-training" },
      { label: "Hifz-e-Quran", href: "/hifz-e-quran" },
    ],
  },
  {
    label: "Admission",
    href: "/admission",
    tagline: "Apply Now",
    children: [
      { label: "Admission Procedure", href: "/admission/admission-procedure" },
      { label: "Class Levels", href: "/admission/class-levels" },
      { label: "Uniform", href: "/admission/uniform" },
    ],
  },
  {
    label: "Resources",
    href: "/resources",
    tagline: "Gallery & Download",
    children: [
      { label: "Photo Gallery", href: "/resources#photo-gallery" },
      { label: "Prospectus", href: "/resources/prospectus" },
      { label: "Our Books", href: "/resources/our-books" },
      { label: "Monthly Arqam", href: "/resources/monthly-arqam" },
      { label: "Newsletters", href: "/resources/newsletters" },
      { label: "Useful Links", href: "/resources/useful-links" },
      { label: "Scarlet Mobile Apps", href: "/resources/scarlet-mobile-apps" },
    ],
  },
  {
    label: "News",
    href: "/news",
    tagline: "Latest News",
    children: [
      { label: "Head Office", href: "/news/head-office" },
      { label: "Events", href: "/news/events" },
      { label: "Activities", href: "/news/activities" },
      { label: "Achievements", href: "/news/achievements" },
      { label: "Announcements", href: "/news/announcements" },
    ],
  },
  { label: "Contact", href: "/contact", tagline: "Call or Mail" },
];

// The reference top bar's portal-login links (confirmed on the live site)
// point to external student/parent/staff systems this project doesn't have
// yet (no auth — Constitution III/out of scope). Rather than fabricate
// external URLs that don't exist, each links to an internal placeholder
// page under /portal/<slug>, consistent with every other not-yet-built page
// in this feature (FR-017's pattern, extended here by content, not code).
// Careers (012, PRD §4: "link in the top bar and footer, not the main menu")
// is the first link in the top (yellow) bar; it is a real page, unlike the
// portal placeholders after it.
export const portalLinks: PortalLink[] = [
  { label: "Careers", href: "/careers" },
  { label: "DAS Portal", href: "/portal/das-portal" },
  { label: "ePortal", href: "/portal/eportal" },
  { label: "Student Login", href: "/portal/student-login" },
  { label: "Mail Login", href: "/portal/mail-login" },
  { label: "LMS App", href: "/portal/lms-app" },
  { label: "Alumni Registration", href: "/portal/alumni-registration" },
];

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
  bottomText: "Dar-e-Arqam Schools",
  links: [{ label: "Careers", href: "/careers" }],
};

// Fallback social-preview image for pages with no page-specific one (e.g.
// a news post with no cover image — FR-031 US6 scenario 2). The brand logo
// is an SVG placeholder pending a proper 1200x630 raster design asset;
// most modern crawlers (Facebook, X, Slack, Discord) accept SVG, but this
// should be replaced with a designed PNG/JPEG when one exists.
export const SITE_OG_IMAGE = "/images/logo.svg";
