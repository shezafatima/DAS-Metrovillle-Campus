import { settingsCopy } from "@/content/admin";
import type { GroupDefinition } from "../types";

const labels = settingsCopy.fields.portalLinks;

/**
 * Portal links (014b, spec FR-040–FR-046): the footer's "Portal Links" column.
 * An ordered list of label + web address. Each address must be absolute http
 * or https with a host, and may not carry a username or password; an `http://`
 * address is accepted but the editor warns that visitors' browsers will mark
 * the site as not secure. A never-saved group has no links, so the footer
 * column is hidden until an admin adds some (or the seed script writes the
 * reference site's six).
 */
export const portalLinksDefinition: GroupDefinition = {
  key: "portalLinks",
  label: settingsCopy.groups.portalLinks.title,
  fields: [
    {
      type: "list",
      key: "links",
      label: labels.links,
      itemLabel: "link",
      maxItems: 12,
      layout: "cards",
      inlineFields: ["label", "url"],
      summary: { title: ["label"] },
      itemFields: [
        { type: "text", key: "label", label: labels.label, required: true, maxLength: 40 },
        {
          type: "url",
          key: "url",
          label: labels.url,
          required: true,
          maxLength: 2048,
          rejectCredentials: true,
          warnInsecure: true,
          testLink: true,
        },
      ],
      default: [],
    },
  ],
};
