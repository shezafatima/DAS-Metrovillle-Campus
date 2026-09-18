# Dar-e-Arqam School — Metroville Campus Website

A public website and admin dashboard for Dar-e-Arqam School, Metroville
Campus, built with Next.js (App Router), Better Auth, and MongoDB Atlas
Flex. See `docs/prd.md` for the product requirements and `docs/architecture.md`
for the technical architecture.

## Getting started

### 1. Configure

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Atlas Flex connection string (no database name in the path) |
| `MONGODB_DB_NAME` | optional, defaults to `dar_e_arqam` |
| `BETTER_AUTH_SECRET` | ≥ 32 random characters, e.g. `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` |
| `ADMIN_EMAIL` | the single admin's email |
| `ADMIN_PASSWORD` | at least 12 characters |

Starting the app with any required value missing fails immediately with
`Missing required environment variable: <NAME>`.

### 2. Install and seed the admin account

```bash
npm install
npm run seed:admin            # creates the admin; safe to re-run
npm run seed:admin -- --reset # changes the password and ends all sessions
```

There is no public sign-up; the seed command is the only way to create
or reset the single admin account.

### 3. Run

```bash
npm run dev
```

- `http://localhost:3000` — the public site
- `http://localhost:3000/admin` — redirects to login, then to the admin
  dashboard (Overview, News, Messages, Signups, Settings)
- `http://localhost:3000/api/health` — `{"status":"ok"}` when the
  database is reachable

### 4. Verify

```bash
npm run lint
npm test          # Vitest — DB-backed suites need MONGODB_URI, otherwise skip with a notice
npm run test:e2e  # Playwright — seeds a dedicated test database, then runs e2e/*.spec.ts
```

## Project structure

See `docs/architecture.md` for the full folder layout, API namespaces,
and the admin authentication/authorization model. In short:

- `src/app/(public)/` — the public site, sharing one header/footer shell
- `src/app/admin/` — the admin dashboard, session-protected end to end
- `src/lib/` — database connection, auth, validation, and shared
  server-side primitives (rate limiting, soft delete, honeypot)
- `src/components/` — one component per visual section
- `src/content/` — typed page copy
- `scripts/seed-admin.ts` — the admin account setup/reset command

## Spec-driven development

This project follows Spec-Driven Development via SpecKit Plus. Feature
specs, plans, and tasks live under `specs/<feature>/`, and prompt
history is recorded under `history/prompts/`. See
`.specify/memory/constitution.md` for the project's governing
principles.

## Learn more about Next.js

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
