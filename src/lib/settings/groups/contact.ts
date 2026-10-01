import { contactInfo } from "@/content/site-shell";
import { settingsCopy } from "@/content/admin";
import type { GroupDefinition } from "../types";

const labels = settingsCopy.fields.contact;

/**
 * Contact & social (005 FR-008). The defaults ARE the 001/008 content-file
 * values, imported rather than copied, so a group that has never been saved
 * reads exactly as the site did before this feature (FR-009, SC-001). Stored
 * keys keep the existing `ContactInfo` names so `getContactDetails()` can
 * return the value unchanged.
 */
export const contactDefinition: GroupDefinition = {
  key: "contact",
  label: settingsCopy.groups.contact.title,
  fields: [
    { type: "text", key: "phone", label: labels.phone, maxLength: 40, required: true, default: contactInfo.phone },
    { type: "text", key: "email", label: labels.email, maxLength: 120, required: true, format: "email", default: contactInfo.email },
    { type: "longText", key: "address", label: labels.address, maxLength: 300, required: true, default: contactInfo.address },
    {
      type: "text",
      key: "officeHours",
      label: labels.officeHours,
      hint: settingsCopy.hints.officeHours,
      maxLength: 120,
      default: contactInfo.officeHours,
    },
    { type: "url", key: "mapUrl", label: labels.mapUrl, maxLength: 500, required: true, default: contactInfo.mapUrl },
    {
      type: "group",
      key: "social",
      label: labels.social,
      fields: [
        { type: "url", key: "facebook", label: labels.facebook, hint: settingsCopy.hints.optionalLink, maxLength: 300, default: contactInfo.social.facebook ?? "" },
        { type: "url", key: "instagram", label: labels.instagram, hint: settingsCopy.hints.optionalLink, maxLength: 300, default: contactInfo.social.instagram ?? "" },
        { type: "url", key: "youtube", label: labels.youtube, hint: settingsCopy.hints.optionalLink, maxLength: 300, default: contactInfo.social.youtube ?? "" },
        { type: "url", key: "tiktok", label: labels.tiktok, hint: settingsCopy.hints.optionalLink, maxLength: 300, default: contactInfo.social.tiktok ?? "" },
      ],
    },
  ],
};
