# Contract: Routes, navigation and redirects

## Public page `/admission`

`src/app/(public)/admission/page.tsx` (server):

```
await connection()                       // per-request render (ADR-0011)
PageBanner  → the one <h1> "Admission"
for section of pageSections.admission:
  "admission-procedure" → <AdmissionProcedureSection window={…} applyOpen={…} />   (AboutSection, background "surface")
  "uniform"             → <UniformSection />                                       (AboutSection, background "muted")
```

Inside Admission Procedure, in order: window notice (banner | quiet note | nothing) → procedure → Apply Now (only if `isAdmissionApplyOpen()`).

Banner: `<div role="status" data-testid="admission-banner">` with announcement (if set) and "Applications close on {date}", on `bg-topbar` with `text-primary`. Quiet note: `<p data-testid="admission-closed-note">` in muted body text. Apply: `<Link href="/admission/register" data-testid="admission-apply">Apply Now</Link>` in the public primary button style (`bg-cta`, same classes as the careers CTA).

Metadata: `title: "Admission"`, `alternates.canonical: "/admission"`.

## Navigation (`src/content/site-shell.ts`)

```ts
admission: [
  { id: "admission-procedure", label: "Admission Procedure" },
  { id: "uniform", label: "Uniform" },
],
```

Desktop dropdown, mobile menu, footer and site search derive from this.

## Redirects (`next.config.ts`), all permanent

| Source | Destination | Origin |
|---|---|---|
| `/admission/admission-procedure` | `/admission#admission-procedure` | derived from `pageSections` (existing) |
| `/admission/uniform` | `/admission#uniform` | derived from `pageSections` (existing) |
| `/admission/class-levels` | `/admission` | new explicit entry |

`/admission/register` is **not** created or redirected (013 owns it; until then it is a 404, and nothing links to it while `isAdmissionApplyOpen()` is false).

## Links checked for removed sections

`#class-levels` / `/admission/class-levels`: `src/content/site-shell.ts` (menu, removed), `e2e/page-sections.spec.ts` (updated). No other source references (grep at plan time; re-run at implementation).
