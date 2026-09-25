/**
 * Fixed message status list (data-model.md "Message status"). Used by
 * the model enum, the PATCH schema, the inbox filter options, the row
 * badge and the detail select.
 */
export const MESSAGE_STATUSES = [
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "responded", label: "Responded" },
] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number]["key"];

export const MESSAGE_STATUS_KEYS = MESSAGE_STATUSES.map((s) => s.key) as [MessageStatus, ...MessageStatus[]];

export function isMessageStatus(value: unknown): value is MessageStatus {
  return typeof value === "string" && (MESSAGE_STATUS_KEYS as readonly string[]).includes(value);
}

export function statusLabel(status: MessageStatus): string {
  return MESSAGE_STATUSES.find((s) => s.key === status)!.label;
}
