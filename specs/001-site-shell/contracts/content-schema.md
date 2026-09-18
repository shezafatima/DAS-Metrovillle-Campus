# Contract: `src/content/site-shell.ts`

This feature has no HTTP API — see research.md §3. The equivalent of an API
contract here is the TypeScript shape this content file exports, which
`TopBar`, `Header`/`NavDesktop`/`NavMobile`, and `Footer` all depend on.
Any change to these exported names or shapes is a breaking change for those
components and their tests.

```typescript
export type SocialPlatform = "facebook" | "instagram" | "youtube" | "tiktok";

export interface NavigationItem {
  label: string;
  href: string;
  /** Small caption under the label (e.g. "Front Page" under Home) —
   * confirmed on the live reference site, das.edu.pk. */
  tagline?: string;
  children?: NavigationItem[];
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  social: Partial<Record<SocialPlatform, string>>;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterContent {
  columns: FooterColumn[];
  quickLinks: FooterLink[];
  bottomText?: string;
}

export interface PortalLink {
  label: string;
  href: string;
}

export const navigationItems: NavigationItem[];
export const contactInfo: ContactInfo;
export const portalLinks: PortalLink[];
export const footerContent: FooterContent;
```

## Consumers

| Export | Consumed by | Requirement(s) |
|---|---|---|
| `navigationItems` | `NavDesktop`, `NavMobile` | FR-001–FR-004, FR-006, FR-020 |
| `contactInfo.phone`/`.email`/`.address` | `Footer` | FR-010, FR-011, FR-021 |
| `contactInfo.social` | `TopBar` | FR-012, FR-013 |
| `portalLinks` | `TopBar` | FR-025 |
| `footerContent` | `Footer` | FR-014, FR-015 |

## Contract tests (Vitest, `src/content/site-shell.test.ts`)

- [ ] `navigationItems` renders in the exact fixed order (Home, About,
      Campuses, Academics, Admission, Resources, News, Contact).
- [ ] No `navigationItems` entry is labeled "Franchise Offer".
- [ ] `contactInfo.phone` and `contactInfo.email` are non-empty strings.
- [ ] A `contactInfo.social` entry that is absent/empty is never rendered
      by `TopBar` as a link (unit test at the component level, keyed off
      this contract).
