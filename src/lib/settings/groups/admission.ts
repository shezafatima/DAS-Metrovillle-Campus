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
    { type: "date", key: "opensOn", label: labels.opensOn, hint: hints.opensOn },
    { type: "date", key: "closesOn", label: labels.closesOn, hint: hints.closesOn },
    { type: "text", key: "announcement", label: labels.announcement, hint: hints.announcement, maxLength: 160 },
    { type: "text", key: "closedMessage", label: labels.closedMessage, hint: hints.closedMessage, maxLength: 160 },
    // 013: the class list of the registration form, in saved order. An empty list keeps the form closed.
    {
      type: "list",
      key: "classes",
      label: labels.classes,
      hint: hints.classes,
      itemLabel: "class",
      itemFields: [{ type: "text", key: "name", label: labels.className, required: true, maxLength: 50 }],
      inlineFields: ["name"],
      layout: "cards",
      summary: { title: ["name"] },
      maxItems: 30,
      rules: [{ kind: "uniqueText", field: "name", message: settingsCopy.errors.classDuplicate }],
      default: [],
    },
  ],
  rules: [{ kind: "dateOrder", from: "opensOn", to: "closesOn", message: settingsCopy.errors.closesBeforeOpens }],
};
