/**
 * Resources page copy: the School App section (`#mobile-apps`).
 * PENDING CLIENT APPROVAL: the wording, the feature list and the links are as supplied for 023, not yet
 * confirmed by the client. Copy lives here, not in components (Constitution IX).
 */
export const schoolApp = {
  id: "mobile-apps",
  /** The Resources menu label (the anchor stays `#mobile-apps`). */
  menuLabel: "School App",
  eyebrow: "Our School App",
  heading: "Dar-e-Arqam LMS",
  line: "Stay connected with your child's learning.",
  features: [
    { id: "attendance-results", icon: "clipboard-check", label: "Attendance & results" },
    { id: "fee-status", icon: "wallet", label: "Fee status" },
    { id: "announcements", icon: "megaphone", label: "School announcements" },
    { id: "islamic-studies", icon: "book-open", label: "Islamic studies resources" },
  ],
  android: {
    label: "Get it on Google Play",
    href: "https://play.google.com/store/apps/details?id=com.kambohcomputingservices.parentsportal.dar_e_arqam_pk",
  },
  web: {
    label: "Login on web",
    href: "https://kamboh.net/admin/pwv_login.php",
  },
  externalSuffix: " (opens external site in a new tab)",
  iphoneNote: "Using an iPhone? Use the web login.",
  qr: {
    caption: "Scan to download",
    label: "QR code to download Dar-e-Arqam LMS on Google Play",
  },
  screenshot: {
    src: "/images/resources/app-screenshot.png",
    width: 702,
    height: 1227,
    alt: "The Dar-e-Arqam LMS app on Google Play, with screens showing family information and fee balances.",
  },
} as const;
