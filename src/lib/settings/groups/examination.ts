import { settingsCopy } from "@/content/admin";
import type { GroupDefinition } from "../types";

const labels = settingsCopy.fields.examination;

/**
 * Examination (014b, spec FR-020–FR-022): headed blocks of plain text, shown as
 * cards on `/academics#examination`. A block's body is paragraphs separated by a
 * blank line. At most 20 blocks, a heading of 120 characters and a body of 3,000.
 * A never-saved group has no blocks, so the section is hidden until an admin adds
 * some (or the seed script copies the reference ones).
 */
export const examinationDefinition: GroupDefinition = {
  key: "examination",
  label: settingsCopy.groups.examination.title,
  fields: [
    {
      type: "list",
      key: "blocks",
      label: labels.blocks,
      itemLabel: "block",
      maxItems: 20,
      layout: "cards",
      inlineFields: ["heading", "body"],
      summary: { title: ["heading"] },
      itemFields: [
        { type: "text", key: "heading", label: labels.heading, required: true, maxLength: 120 },
        { type: "longText", key: "body", label: labels.body, hint: settingsCopy.hints.examinationBody, required: true, maxLength: 3000 },
      ],
      default: [],
    },
  ],
};
