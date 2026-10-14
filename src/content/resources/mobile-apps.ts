import type { ReviewMeta } from "@/lib/academics/schema";
import type { LinkType, MobileApps } from "@/lib/resources/schema";

// Source: docs/content-source/resources/mobile-apps.txt (https://das.edu.pk/resources/scarlet-mobile-apps/, copied 2026-10-12).
// PENDING CLIENT APPROVAL: the text is the reference's, word for word (R1, R2); see the review notes below.
export const mobileApps: MobileApps = {
  heading: "Scarlet Series Mobile Applications",
  body: "Scarlet series applications are interactive educational game applications to cover the subject areas of Mathematics, Knowledge and Understanding of the World, Urdu and English concepts to establish a foundation of knowledge for our children. These applications feature multiple interactive and fun learning games, each designed to teach a specific concept. The content specifically chosen for ECE children helps to develop their literacy and numeracy skills and encourages their curiosity. All of the games include voiced instructions, so our young children will find it easy to learn and play for making something in the real rather than the virtual world. Kindly click on the following links to download the three Applications.",
  // The Scarlet Series flyer was removed at the owner's request (2026-10-14), so the text uses the full width.
  // The file is still in public/images/resources/ and the schema still accepts an image (R7 is moot while it is off).
  image: null,
  imageAlt: "",
  apps: [
    {
      id: "scarlet-english",
      name: "Scarlet English",
      icon: "book-a",
      linkType: "direct-download",
      url: "https://drive.google.com/file/d/15V_ogaFhGTmkaMHTggAcIFiLDDHevpxy/view?usp=sharing",
    },
    // The next three links were dead on 2026-10-12, so the cards show no button (R4). The reference URLs are in mobileAppsSource.
    { id: "scarlet-math", name: "Scarlet Math", icon: "calculator", linkType: "direct-download", url: "" },
    { id: "scarlet-urdu", name: "Scarlet Urdu", icon: "feather", linkType: "direct-download", url: "" },
    { id: "lms-app", name: "LMS App", icon: "monitor-smartphone", linkType: "play-store", url: "" },
  ],
};

/** Interface strings, not part of the 014 value. */
export const mobileAppsCopy: {
  buttons: Record<LinkType, string>;
  directDownloadNote: string;
  unavailable: string;
  newTab: string;
} = {
  buttons: {
    "play-store": "Get it on Google Play",
    // PENDING CLIENT APPROVAL: wording not from the brief; no app uses it today.
    "app-store": "Download on the App Store",
    "direct-download": "Download for Android",
  },
  // PENDING CLIENT APPROVAL: R6.
  directDownloadNote: "Installs from outside the Play Store",
  // PENDING CLIENT APPROVAL: R6, Clarification Q1.
  unavailable: "Not available at the moment",
  newTab: "opens in a new tab",
};

/** A record of where the content came from. It is never rendered: the dead reference URLs must not reach the HTML. */
export const mobileAppsSource = {
  url: "https://das.edu.pk/resources/scarlet-mobile-apps/",
  copiedOn: "2026-10-12",
  linksCheckedOn: "2026-10-12",
  referenceLinks: {
    "scarlet-english": "https://drive.google.com/file/d/15V_ogaFhGTmkaMHTggAcIFiLDDHevpxy/view?usp=sharing",
    "scarlet-math": "https://drive.google.com/file/d/1z1_05GubJarRVNP-8fno7Az_AVIiDPyi/view?usp=sharing",
    "scarlet-urdu": "https://drive.google.com/file/d/1wFRsPmd0EAdPG4E5DWsKZ27JsVQhptlo/view?usp=sharing",
    "lms-app": "https://play.google.com/store/apps/details?id=com.darearqam.daslms",
  },
};

// PENDING CLIENT APPROVAL: see the notes below and docs/content-source/resources/client-review.md.
export const review: ReviewMeta = {
  status: "pending-client-approval",
  notes: [
    "R1: the last sentence says 'the three Applications', but only one of the three links works. Kept verbatim.",
    "R2: 'in the real rather than the virtual world' reads as incomplete, and 'Applications' is capitalised mid-sentence. Kept verbatim.",
    "R3: card names (Scarlet English, Scarlet Math, Scarlet Urdu, LMS App) are not all from the reference; the body says 'Mathematics'.",
    "R4: the Math, Urdu and LMS links are dead (Drive 404, Play 404), so those cards show no button. Working links are requested.",
    "R5: the text describes the network-wide Scarlet Series, not the Metroville Campus.",
    "R6: 'Not available at the moment' and 'Installs from outside the Play Store' are new wording, not from the reference.",
    "R7: the flyer advertises 'Beginning from New Session 2020-21' and the head office web address; its alt text is a transcription.",
  ],
};
