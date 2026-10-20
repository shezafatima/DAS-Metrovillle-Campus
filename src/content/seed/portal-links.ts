// Portal links seed: copied once from https://das.edu.pk/ on 2026-10-20 by the capture described in specs/014b-dynamic-sections/research.md (R10).
// PENDING CLIENT CONFIRMATION: it has not been confirmed that this applies to the Metroville campus.
// It is written to the database only by `npm run seed:sections` (a dry run unless --confirm), and never over existing content.
import type { PortalLinksSeed } from "./types";

export const portalLinksSeed: PortalLinksSeed = {
  "source": "https://das.edu.pk/ (the links in the top bar)",
  "capturedOn": "2026-10-20",
  "adaptations": [
    "The six labels and addresses are copied from the reference site's top bar as they are, including three plain http:// addresses (DAS Portal, ePortal, Student Login)."
  ],
  "links": [
    {
      "label": "DAS Portal",
      "url": "http://www.dais.edu.pk/"
    },
    {
      "label": "ePortal",
      "url": "http://eportal.das.edu.locumset.com/"
    },
    {
      "label": "Student Login",
      "url": "http://203.170.66.35/pp"
    },
    {
      "label": "Mail Login",
      "url": "https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fadmin.google.com%2Fmail%2F&hd=das.edu.pk"
    },
    {
      "label": "LMS App",
      "url": "https://play.google.com/store/apps/details?id=com.darearqam.daslms"
    },
    {
      "label": "Alumni Registration",
      "url": "https://forms.gle/6YDN9wrGiwWgkx3z8"
    }
  ]
};
