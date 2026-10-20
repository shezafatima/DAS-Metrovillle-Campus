import { settingsCopy } from "@/content/admin";
import type { GroupDefinition } from "../types";

const labels = settingsCopy.fields.syllabi;

/** The whole syllabus holds at most this many topics, so a full set of per-level limits can never outgrow one stored record. */
export const SYLLABUS_MAX_TOPICS = 3000;

/**
 * Syllabi (014b, spec FR-010–FR-017): levels, each with subjects, each with
 * groups. A group has an optional heading, optional intro paragraphs and its
 * topics (one per line in the editor, a `string[]` in storage). A group must
 * have an intro or at least one topic.
 *
 * Limits: 20 levels, 10 subjects per level, 20 groups per subject, 100 topics
 * per group, 200 characters per topic, plus 3,000 topics in all (the brief's
 * per-level limits multiply to far more than one document can hold). Removed
 * levels are kept, the 10 most recent; subjects and groups removed inside a level
 * are recorded in the change record instead (research R3).
 *
 * A never-saved group has no levels, so the Syllabi section is hidden until an
 * admin adds some (or the seed script copies the reference ones).
 */
export const syllabiDefinition: GroupDefinition = {
  key: "syllabi",
  label: settingsCopy.groups.syllabi.title,
  fields: [
    {
      type: "list",
      key: "levels",
      label: labels.levels,
      itemLabel: "level",
      maxItems: 20,
      maxDeletedRetained: 10,
      summary: { title: ["name"] },
      default: [],
      itemFields: [
        { type: "text", key: "name", label: labels.levelName, required: true, maxLength: 60 },
        {
          type: "list",
          key: "subjects",
          label: labels.subjects,
          itemLabel: "subject",
          maxItems: 10,
          summary: { title: ["name"] },
          itemFields: [
            { type: "text", key: "name", label: labels.subjectName, required: true, maxLength: 60 },
            {
              type: "list",
              key: "groups",
              label: labels.groups,
              itemLabel: "group",
              maxItems: 20,
              summary: { title: ["heading"] },
              rules: [{ kind: "anyOf", fields: ["intro", "topics"], message: settingsCopy.errors.groupNeedsContent }],
              itemFields: [
                { type: "text", key: "heading", label: labels.heading, maxLength: 120 },
                { type: "longText", key: "intro", label: labels.intro, maxLength: 1500 },
                { type: "lines", key: "topics", label: labels.topics, hint: settingsCopy.hints.topics, maxItems: 100, maxLength: 200, default: [] },
              ],
            },
          ],
        },
      ],
    },
  ],
  rules: [{ kind: "maxTotalLines", path: "levels.subjects.groups.topics", max: SYLLABUS_MAX_TOPICS, message: settingsCopy.errors.tooManyTopics(SYLLABUS_MAX_TOPICS) }],
};
