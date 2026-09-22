# Contract: Public news pages and read queries — News (003)

No authentication. Every read goes through the single visibility
predicate in `src/lib/news/public-queries.ts` (research §5):

```
status = "published" AND publishDate <= startOfTodayPkt() AND deletedAt = null
```

There is no other way for a page, metadata function or future consumer
to fetch news publicly. Drafts, future-dated and deleted posts are
therefore unreachable by construction (user constraint; FR-015, FR-019).

## Query module (`src/lib/news/public-queries.ts`)

| Function | Returns | Notes |
|---|---|---|
| `listPublishedPosts({ page, category? })` | `Paged<PublicPostSummary>` | 9 per page; `publishDate` desc, `updatedAt` desc; `page` clamped to ≥1 |
| `getPublishedPostBySlug(slug)` | `PublicPost \| null` | `null` for anything not visible — callers `notFound()` |

Both return plain DTOs (data-model.md), never documents.

## Routes (all `dynamic = "force-dynamic"`)

### `GET /news?page=N`

- Banner "News" + breadcrumb Home » News; grid of cards (3 / 2 / 1
  columns per the reference at desktop / tablet / phone).
- Card: cover (or placeholder), title (`dir`+font by `language`),
  "<date> | <Category label>", excerpt, "Read More ›" → `/news/<slug>`.
- Category filter control (links to `/news/<key>`, plus "All" → `/news`).
- Pagination: previous/next links carrying `?page=`; hidden when
  `totalPages ≤ 1`.
- Empty state when `items.length === 0` (also for a page beyond the
  last).
- Metadata: title "News" (page 1) / "News — Page N"; description from
  site content.

### `GET /news/<category-key>?page=N`

Same as above filtered to the category; banner title = category label;
metadata title "<Label> — News". Unknown category key falls through to
the post lookup below.

### `GET /news/<slug>`

- `getPublishedPostBySlug(slug)`; `null` → `notFound()` → the root
  `not-found.tsx` (identical response to a never-existing address,
  FR-019).
- Renders banner (title + breadcrumb), formatted date | category label,
  cover image at content width (when present), body HTML (already
  sanitised at save; rendered as-is, never re-sanitised on the client),
  `dir` + Urdu font by `language`.
- External links in the body already carry `rel`/`target` from the
  server transform.

### Metadata for a post (`generateMetadata`)

| Field | Source |
|---|---|
| `title` | post title |
| `description` | `excerpt` |
| `openGraph.type` | `article` |
| `openGraph.images` | cover via Cloudinary transform `c_fill,w_1200,h_630,f_auto,q_auto`, else the site's default preview image |
| `openGraph.publishedTime` | `publishDate` ISO |
| `alternates.canonical` | `/news/<slug>` |

`generateMetadata` uses the same `getPublishedPostBySlug` and returns
`{}`-equivalent for `null` (the page then 404s).

## Images (`src/components/news/cover-image.tsx`)

`next/image` with `cloudinaryLoader(src, width)` → inserts
`f_auto,q_auto,c_limit,w_<width>` after `/image/upload/`. Cards:
`sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"`,
fixed aspect ratio, `object-cover`. Detail: `sizes="(min-width: 1280px)
1280px, 100vw"`. `alt` from `coverImage.alt`. Placeholder component when
`coverImage` is `null`.
