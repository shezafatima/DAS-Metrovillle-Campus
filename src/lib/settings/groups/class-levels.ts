import { settingsCopy } from "@/content/admin";
import type { GroupDefinition } from "../types";

const labels = settingsCopy.fields.classLevels;
const hints = settingsCopy.hints;

/**
 * Class Levels (014b, spec FR-030/FR-031): the table on `/admission#class-levels`
 * (class level + the age a child must be on the reference date), and the list
 * that "Classes open for admission" ticks from. Each row keeps its `id` when it
 * is renamed or reordered, because the open-classes checklist stores that id.
 *
 * Names must be unique, compared ignoring case and repeated spaces, because
 * registration and the class migration match classes by name. A never-saved
 * group has no rows, so the section is hidden until the client supplies them.
 */
export const classLevelsDefinition: GroupDefinition = {
  key: "classLevels",
  label: settingsCopy.groups.classLevels.title,
  fields: [
    { type: "dayMonth", key: "ageReferenceDate", label: labels.ageReferenceDate, hint: hints.ageReferenceDate, required: true, default: "07-31" },
    {
      type: "list",
      key: "levels",
      label: labels.levels,
      itemLabel: "class level",
      maxItems: 30,
      layout: "cards",
      inlineFields: ["name", "ageRule"],
      summary: { title: ["name"] },
      rules: [{ kind: "uniqueText", field: "name", message: settingsCopy.errors.classLevelNameDuplicate }],
      itemFields: [
        { type: "text", key: "name", label: labels.name, hint: hints.classLevelName, required: true, maxLength: 60 },
        { type: "text", key: "ageRule", label: labels.ageRule, hint: hints.ageRule, required: true, maxLength: 80 },
      ],
      default: [],
    },
  ],
};
