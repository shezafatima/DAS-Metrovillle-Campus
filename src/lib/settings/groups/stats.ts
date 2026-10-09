import { settingsCopy } from "@/content/admin";
import type { GroupDefinition, NumberField } from "../types";

const labels = settingsCopy.fields.stats;

function stat(key: string, label: string, value: number): NumberField {
  return {
    type: "number",
    key,
    label,
    min: 0,
    max: 100_000_000,
    required: true,
    errorMessage: settingsCopy.errors.wholeNumber,
    default: value,
  };
}

/** Stats (005 FR-018). Starting values are the reference home page's progress dashboard. */
export const statsDefinition: GroupDefinition = {
  key: "stats",
  label: settingsCopy.groups.stats.title,
  fields: [
    stat("students", labels.students, 300000),
    stat("books", labels.books, 50),
    stat("teachers", labels.teachers, 14500),
    stat("campuses", labels.campuses, 700),
  ],
};
