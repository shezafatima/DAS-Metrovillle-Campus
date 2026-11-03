import { settingsCopy } from "@/content/admin";
import type { GroupDefinition } from "../types";

const labels = settingsCopy.fields.admission;
const hints = settingsCopy.hints;

/**
 * Admission window (020 FR-008). Dates are calendar days in Pakistan time;
 * whether admissions are open is worked out per request from these values
 * (src/lib/admission/window.ts, ADR-0011). Empty dates mean closed.
 */
export const admissionDefinition: GroupDefinition = {
  key: "admission",
  label: settingsCopy.groups.admission.title,
  fields: [
    { type: "date", key: "opensOn", label: labels.opensOn, hint: hints.opensOn, notBeforeToday: true },
    { type: "date", key: "closesOn", label: labels.closesOn, hint: hints.closesOn, notBeforeToday: true },
    { type: "text", key: "announcement", label: labels.announcement, hint: hints.announcement, maxLength: 160 },
    { type: "text", key: "closedMessage", label: labels.closedMessage, hint: hints.closedMessage, maxLength: 160 },
    // 013: the class list of the registration form, in saved order. An empty list keeps the form closed.
    {
      type: "list",
      key: "classes",
      label: labels.classes,
      hint: hints.classes,
      itemLabel: "class",
      // 014b: an item is a ticked Class Level (`levelId` = that level's id, `name` = a snapshot of its name, refreshed by the
      // server on every save) or, while `levelId` is empty, a typed name not linked to a level yet. Items stored before 014b
      // have no `levelId`, so they read as not linked and are still offered. See ADR-0014.
      itemFields: [
        { type: "text", key: "name", label: labels.className, required: true, maxLength: 60 },
        { type: "text", key: "levelId", label: labels.levelId, maxLength: 40 },
      ],
      inlineFields: ["name"],
      layout: "cards",
      summary: { title: ["name"] },
      maxItems: 30,
      rules: [
        { kind: "uniqueText", field: "name", message: settingsCopy.errors.classDuplicate },
        { kind: "uniqueText", field: "levelId", message: settingsCopy.errors.classLevelLinkDuplicate },
      ],
      default: [],
    },
  ],
  rules: [{ kind: "dateOrder", from: "opensOn", to: "closesOn", message: settingsCopy.errors.closesBeforeOpens }],
};
