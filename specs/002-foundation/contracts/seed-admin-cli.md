# Contract: `seed-admin` command — Foundation (002)

**Invocation**: `npm run seed:admin` → `tsx scripts/seed-admin.ts`
**Reset**: `npm run seed:admin -- --reset`

Loads `.env.local` with `loadEnvConfig(process.cwd())` from `@next/env`
(the documented way to read Next's env files outside the runtime; the
package is already installed as Next's own dependency and is added to
`package.json` explicitly so the import is not relying on hoisting) and
requires `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`.

## Outcomes

| Situation | Exit | stdout (single line) | Side effect |
|---|---|---|---|
| A required variable is missing/empty | `1` | `Missing required environment variable: ADMIN_EMAIL` (names the first missing one) | none — exits before connecting |
| `ADMIN_PASSWORD` shorter than 12 | `1` | `ADMIN_PASSWORD must be at least 12 characters` | none |
| `ADMIN_EMAIL` not a valid email | `1` | `ADMIN_EMAIL is not a valid email address` | none |
| Database unreachable | `1` | `Could not connect to the database` | none; the connection error is not printed |
| No admin exists (with or without `--reset`) | `0` | `Admin created: <email>` | one `user` + one `account` |
| Admin exists, already a main admin, no `--reset` | `0` | `Admin already exists: <email> (nothing changed)` | none |
| Admin exists but is not yet a main admin (created before 011), no `--reset` | `0` | `Admin role confirmed: <email> (nothing else changed)` | `user.role` set to `main_admin` (011 FR-034) |
| Admin exists, `--reset` | `0` | `Admin password updated: <email> (all sessions ended)` | `account.password` replaced; all `session` rows for the user deleted; since 011 also `role: main_admin` and `mustChangePassword`, `tempPasswordIssuedAt`, `disabledAt`, `deletedAt` cleared (the lock-out recovery path) |
| Concurrent run loses the unique-index race | `0` | `Admin already exists: <email> (nothing changed)` | none |
| Unexpected error | `1` | `Seed failed` | error logged to stderr **without** the password |

## Invariants

- The email is trimmed and lower-cased before lookup and insert
  (FR-010, edge case "email letter case").
- The script never prints the password and never prints a hash.
- After any number of runs, sequential or concurrent, `user` contains
  exactly one document (FR-006, SC-003).
- The script is the **only** code path that can create or change the
  admin credential; `disableSignUp: true` closes the API path.
