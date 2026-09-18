# Architecture Guide — Dar-e-Arqam Metroville Campus Website

## Stack versions
- Next.js 16.3.x (App Router), React 19, TypeScript strict.
- Tailwind CSS v4; tokens in @theme in src/app/globals.css.
- Animation: `motion` package, imported from "motion/react".
  Never install `framer-motion`.
- Fonts self-hosted via next/font.
- Hosting: TODO.
- Exact versions are locked in package.json.

## Folder layout
- src/app/            routes and route handlers
- src/components/     one component per visual section
- src/content/<page>.ts   static page copy (typed)
- src/models/         Mongoose models
- src/lib/db.ts       cached Mongoose connection
- src/lib/auth.ts     Better Auth instance
- src/lib/validation/ Zod schemas (shared client + server)
- scripts/seed-admin.ts
- public/images, public/icons   static assets, kebab-case names
- research/design-tokens.md, research/tokens/*.json
- screenshots/        reference captures, named <page>-<viewport>.png

## API namespaces
- /api/auth/*   Better Auth only
- /api/admin/*  session required
- /api/public/* no auth

## Database and auth
- One cached Mongoose connection, reused across requests.
- Better Auth uses mongodbAdapter with
  mongoose.connection.getClient().db(). Never open a second
  connection or install a different `mongodb` driver version than
  Mongoose uses.
- Better Auth owns the collections user, session, account,
  verification. App code never defines models for or writes to them.
- emailAndPassword.enabled = true, disableSignUp = true.
- The admin is created by scripts/seed-admin.ts from env vars
  (ADMIN_EMAIL, ADMIN_PASSWORD); it is never exposed as a route.
- Admin route handlers call auth.api.getSession() and return 401
  without a session. proxy.ts only redirects admin pages.
- Better Auth rate limiting on; use database storage if hosting is
  serverless.

## Validation and data rules
- Zod normalizes input: emails lowercased and trimmed; phones stored
  as +923XXXXXXXXX (accept 03XXXXXXXXX and +92 formats).
- Upserts use findOneAndUpdate with upsert: true, backed by a unique
  index on the natural key.
- Soft delete: deletedAt: Date | null, excluded by default through a
  shared Mongoose plugin.
- Public POST routes: per-IP rate limit + hidden honeypot field.
- Responses to upserted public forms are identical for new and
  existing records.

## Design tokens
- Every value from research/design-tokens.md becomes a named custom
  token in @theme with the exact extracted value (no rounding to
  Tailwind's default scale).
- The reference site's breakpoints are defined as custom breakpoints.
- No arbitrary-value classes (e.g. text-[17px]) for anything a token
  covers.

## Components and motion
- Breakpoint-specific structures use explicit variants
  (NavbarDesktop, NavbarMobile) behind one responsive wrapper.
- "use client" only on the smallest interactive piece.
- Motion helpers (useCountUp, HoverCard, etc.) live in
  src/components/motion/; timing matches the reference.
- All animation respects prefers-reduced-motion.
- Cross-page anchor IDs are defined in the owning spec and never
  renamed without updating links.

## Media and content
- Admin uploads go to Cloudinary; only URLs are stored.
- Copy not yet supplied by the client uses marked placeholders in
  src/content/.
- Text that may contain Urdu uses dir="auto" and an Urdu fallback
  font.

## Testing
- Vitest: unit tests and route handler tests (validation failures,
  401 for admin routes).
- Playwright: one e2e test per user story; visual comparison against
  screenshots/; computed-style checks against research/tokens/*.json.