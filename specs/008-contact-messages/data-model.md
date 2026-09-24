# Data Model: Contact & Messages

**Feature**: 008-contact-messages | **Date**: 2026-09-24

## Message → `messages`

One document per contact-form submission. **Append-only from the public
side** — never looked up, merged, updated or restored by email
(research §1; ADR-0001 explicitly not applied).

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | — |
| `name` | String | required, 1–100 chars, trimmed, inner whitespace collapsed; any script |
| `email` | String | required, ≤ 254, lower-cased + trimmed; **not unique**, indexed only for search |
| `phone` | String \| null | optional; when present canonical E.164 `+923XXXXXXXXX` (`src/lib/phone.ts`) |
| `subject` | String | required, 1–150 chars, trimmed, inner whitespace collapsed; any script |
| `body` | String | required, 1–5,000 chars, CRLF/CR → LF, trimmed; inner line breaks kept |
| `status` | `"new" \| "read" \| "responded"` | required, default `"new"` |
| `statusChangedAt` | Date \| null | `null` until the first status change; set on every change |
| `createdAt` | Date | Mongoose timestamp — **the "date received"** shown and sorted on |
| `updatedAt` | Date | Mongoose timestamp |
| `deletedAt` | Date \| null | from `softDeletePlugin` |

Stored field `body` (not `message`) avoids the ambiguity of a
`message.message` path; the public request/Zod field is still named
`message` (the form label) and mapped in `createMessage`.

Schema options: `{ timestamps: true, collection: "messages" }`;
`messageSchema.plugin(softDeletePlugin)`. Mongoose `maxlength`s mirror
the Zod limits as a second line of defence.

### Indexes

| Index | Serves |
|---|---|
| `{ createdAt: -1 }` | inbox default order (plugin's `deletedAt` index covers the filter) |
| `{ status: 1, createdAt: -1 }` | status filter + order; `countDocuments({ status: "new" })` for badge/overview |
| `{ deletedAt: 1 }` | added by the plugin |

No unique index anywhere (FR-010). Search is an unanchored
case-insensitive regex over `name`/`email`/`subject` — no index can
serve it and none is needed at this volume (research §7).

### Statics (from the plugin)

`Message.softDeleteById(id)`, `Message.restoreById(id)` (the latter is
unused by app code — developer recovery only, spec FR-022).

## Message status (fixed list)

`src/lib/messages/statuses.ts`

```ts
export const MESSAGE_STATUSES = [
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "responded", label: "Responded" },
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]["key"];
export const MESSAGE_STATUS_KEYS: [MessageStatus, ...MessageStatus[]];
export function isMessageStatus(value: unknown): value is MessageStatus;
export function statusLabel(status: MessageStatus): string;
```

Used by the model enum, the PATCH schema, the inbox filter options,
the row badge and the detail select.

## Validation schemas (shared client + server)

`src/lib/validation/message.ts`

```ts
export const messageInputSchema = z.object({
  name:    z.string().trim().transform(collapseSpaces).pipe(z.string().min(1, "Name is required.").max(100, "Name must be 100 characters or fewer.")),
  email:   z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.").max(254, "Enter a valid email address.")),
  phone:   z.string().trim().optional().transform(/* "" | undefined → null; else normalisePakistaniMobile or issue "Enter a Pakistani mobile number, e.g. 03001234567." */),
  subject: z.string().trim().transform(collapseSpaces).pipe(z.string().min(1, "Subject is required.").max(150, "Subject must be 150 characters or fewer.")),
  message: z.string().transform(normaliseNewlines).pipe(z.string().trim().min(1, "Message is required.").max(5000, "Message must be 5,000 characters or fewer.")),
});
export type MessageInput = z.infer<typeof messageInputSchema>;
export const MESSAGE_MAX_LENGTH = 5000; // shared with the form's counter

export const messageStatusUpdateSchema = z.object({ status: z.enum(MESSAGE_STATUS_KEYS) });
```

`fieldErrors(error)` moves to `src/lib/validation/field-errors.ts`
(signup re-exports it). `collapseSpaces` moves alongside it.

## Write paths (`src/lib/messages/mutations.ts`)

| Function | Operation | Returns |
|---|---|---|
| `createMessage(input: MessageInput)` | `Message.create({ name, email, phone, subject, body: input.message, status: "new", statusChangedAt: null })` | `{ id }` |
| `markMessageRead(id)` | `findOneAndUpdate({ _id: id, status: "new" }, { $set: { status: "read", statusChangedAt: now } }, { new: true })`; if no match, `findOne({ _id: id })` to distinguish "already read" from "gone" | `{ id, status, changed: boolean } \| null` (null = unknown/malformed/deleted) |
| `setMessageStatus(id, status)` | `findOneAndUpdate({ _id: id }, { $set: { status, statusChangedAt: now } }, { new: true })` | `{ id, status, statusChangedAt } \| null` |
| `deleteMessage(id)` | `Message.softDeleteById(id)` | `{ id } \| null` |

All return `null` for a malformed id (`mongoose.isValidObjectId`)
without querying. None pass `withDeleted` — deleted messages are
invisible to every write (a deleted message can't be re-statused or
re-deleted: 404).

## State transitions

```
   (none) ── public submit ─────────────▶ new
   new     ── admin opens (auto) ────────▶ read            (conditional; only from new)
   new|read|responded ── admin sets X ───▶ X               (any → any, last write wins; statusChangedAt = now)
   read|responded ── admin opens ────────▶ unchanged
   any     ── admin delete ──────────────▶ deleted (deletedAt = now; hidden from every read/write/count)
   deleted ── any admin action ──────────▶ 404 "no longer available"
```

A message set back to `new` stays `new` until the next open
(`MarkReadOnOpen` runs once per mount of the detail page; spec
Assumptions).

## Read paths (`src/lib/messages/admin-queries.ts`)

```ts
export interface MessageRow {           // inbox row
  id: string;
  name: string;
  email: string;
  subject: string;
  preview: string;                      // toPreview(body): whitespace collapsed, ≤100 code points + "…"
  status: MessageStatus;
  receivedAt: string;                   // ISO (createdAt)
}

export interface MessageDetail {        // detail page
  id: string;
  name: string;
  email: string;
  phone: string | null;                 // E.164 for tel:/wa.me
  phoneDisplay: string | null;          // "03XXXXXXXXX"
  subject: string;
  body: string;                         // full, LF line breaks
  status: MessageStatus;
  receivedAt: string;                   // ISO
  statusChangedAt: string | null;       // ISO
}

listMessages({ q?, status?, page? }): Promise<Paged<MessageRow>>   // Paged/ADMIN_PAGE_SIZE/escapeRegExp from src/lib/admin-list.ts
getMessage(id): Promise<MessageDetail | null>                       // null = malformed/unknown/deleted
countMessages(): Promise<{ total: number; new: number }>            // overview card
countNewMessages(): Promise<number>                                 // sidebar badge
```

DTOs omit `updatedAt`/`deletedAt` (Constitution VII — minimal,
consumer-agnostic surface). `MessageRow` carries only the preview,
never the full body.

Pure helpers (unit-tested, no DB):

- `toPreview(body, max = 100)` — `src/lib/messages/preview.ts`.
- `inboxHref(from?: string)` — `src/lib/messages/inbox-href.ts`:
  whitelist `q`, `status` (valid key), `page` (positive int) →
  `/admin/messages[?…]` (research §8).

## Contact details (content now, Settings in 005)

`src/content/site-shell.ts` — `ContactInfo` gains two fields:

```ts
export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  mapUrl: string;        // NEW — ordinary Google Maps share link (clarification Q2)
  officeHours: string;   // NEW — e.g. "Monday to Saturday, 9am to 6pm PST" (placeholder until client confirms)
  social: Partial<Record<SocialPlatform, string>>;
}
```

`src/lib/contact-details.ts` —
`getContactDetails(): Promise<ContactInfo>` (content today; Settings
read in 005 — the only function whose body changes). The embed URL is
derived, never stored: `mapEmbedSrc(address)` in the same module.

## Collections touched by tests

- Vitest: `describeWithDb(..., ["messages", "throttles", "user", "account", "session"], ...)`
  (the Throttle model has no explicit collection name, so Mongoose
  stores it as `throttles`)
  for route tests; `["messages"]` for query/mutation tests.
- Playwright: `e2e/global-setup.ts` adds `"messages"` to its wipe
  list; `e2e/helpers/messages.ts` exposes `seedMessages()`,
  `findMessages({ email, withDeleted })`, `clearMessages()`.
