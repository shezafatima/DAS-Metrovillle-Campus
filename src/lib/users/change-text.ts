import { changeRecordCopy, usersCopy } from "@/content/admin";
import { PERMISSION_LABELS, isPermission, isRole } from "@/lib/permissions";
import type { UserChangeType } from "@/models/user-change";

function roleLabel(value: unknown): string {
  return isRole(value) ? usersCopy.roles[value] : String(value ?? "");
}

function sectionLabels(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .filter(isPermission)
    .map((key) => PERMISSION_LABELS[key])
    .join(", ");
}

/**
 * One change-record entry as the sentence the main admin reads (011
 * contracts/users-ui.md), e.g. "Sections: added Messages; removed News".
 * Built only from the entry's fixed `details` shapes, so it can never
 * print anything that is not already safe to store.
 */
export function describeUserChange(entry: { type: UserChangeType; details?: Record<string, unknown> }): string {
  const details = entry.details ?? {};
  const types = changeRecordCopy.types;
  switch (entry.type) {
    case "created":
      return details.restored
        ? types.restored(roleLabel(details.role), sectionLabels(details.permissions))
        : types.created(roleLabel(details.role), sectionLabels(details.permissions));
    case "role_changed":
      return types.role_changed(roleLabel(details.from), roleLabel(details.to));
    case "permissions_changed":
      return types.permissions_changed(sectionLabels(details.added), sectionLabels(details.removed));
    case "disabled":
      return types.disabled;
    case "enabled":
      return types.enabled;
    case "password_set":
      return types.password_set;
    case "deleted":
      return types.deleted;
  }
}
