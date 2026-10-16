# Contract: Admin registrations (main admin only)

Every page calls `await requireAdminPageOr404("main_admin")` once. Every route handler calls `await requireAdminAccess("main_admin")` once (inventory test).

| Requester | Pages | Routes |
|---|---|---|
| No session | redirect `/admin/login?next=…` | **401** |
| Content manager (any permissions) | **404** (Next not-found), `access_denied` logged | **403**, nothing changed, no data |
| Main admin | rendered | handled |

## Pages

| Path | Content |
|---|---|
| `/admin/registrations?q=&class=&page=` | List, newest first, 20 per page: Reference · Student · Class · Father · Mobile · Submitted · flag "Likely duplicate". Search box (student/father/mother name), class filter (distinct `className` from live registrations), Export CSV button (carries `q` and `class`), link to Deleted. Mounts `MarkRegistrationsOpened`. |
| `/admin/registrations/[id]` | Every field. Sections: Student · Parents · Contact & address · **Health information** (distinct block: vaccinated, medical history) · Reference · Remarks · Record (reference, submitted at in Pakistan time, consent time, duplicate flag). Status select + Save. Delete (confirm dialog). History list. Unknown, malformed or deleted id → 404. |
| `/admin/registrations/deleted` | Deleted within 30 days and within retention: Reference · Student · Class · Deleted on · Days left · Restore (confirm dialog). |

Each page also triggers `after(maybeSweepRegistrations)`.

## Routes

### `PATCH /api/admin/registrations/[id]`
Body `{ status: "new" | "contacted" | "admitted" | "not_admitted" }`.
- Invalid body → **400** `{ error: "validation", fields: { status } }`.
- Not found / deleted / malformed id → **404**.
- **200** `{ ok: true, status }`. History entry and `registration_status_changed` log only when the status actually changed.

### `DELETE /api/admin/registrations/[id]`
- **200** `{ ok: true }`: soft delete; history `deleted`; log `registration_deleted`.
- Already deleted / unknown → **404**.

### `POST /api/admin/registrations/[id]/restore`
- **200** `{ ok: true }` when `deletedAt > now − 30 d` and `createdAt ≥ retention cutoff`; history `restored`; log `registration_restored`.
- Otherwise → **404** `{ error: "not_restorable" }`.

### `GET /api/admin/registrations/export?q=&class=`
- Writes one `registrationExports` record `{ at, byUserId, byEmail, rows, classFilter, searched }` and logs `registration_exported` (`outcome` = row count). The `q` text is never stored or logged.
- **200** `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="registrations-YYYY-MM-DD.csv"`, `Cache-Control: no-store`. Body from `toCsv` (BOM, CRLF, formula guard). Zero matches → header row only (still recorded with `rows: 0`).
- Columns, in order: Reference, Submitted (Pakistan, `YYYY-MM-DD HH:mm`), Status, Likely duplicate (Yes/No), Student name, Date of birth, Class, Father's name, Father's mobile, Mother's name, Mother's mobile, Email, Address, Emergency contact name, Emergency contact phone, Mother tongue, Vaccinated (Yes/No), Medical history, Reference student name, Reference student class, Reference relation, Remarks, Consent given at.

### `POST /api/admin/registrations/opened`
- Sets `registrationsLastOpenedAt = now` for the caller. **200** `{ ok: true }`.

## Notifications (existing `GET /api/admin/notifications`, `access: "any"`)

- For the main admin, `registrationsNew` is a count and items of `kind: "registration"` look like `{ title: "Registration K7MQ2XRT", description: "<class name>", href: "/admin/registrations/<id>" }`.
- For a content manager, `registrationsNew: 0` and no registration items. No query on `studentRegistrations` is run.

## Errors and logs

Error bodies never contain registration fields. Log lines carry `target: <registration id>` and `email: <acting admin>` only.
