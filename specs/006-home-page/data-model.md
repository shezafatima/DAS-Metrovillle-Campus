# Data Model: Home Page (006)

## Books covers (static, content file)

`homeContent.books.covers`: 10 entries `{ id: "book-NN", src: "/images/home/books/book-NN.jpg", alt, width: 400, height: 508 }`, in display order. The files are added to `public/` by the owner. A listed file that is missing is skipped, and with none present the section is hidden. They're not stored in the database and there's no admin screen. Books are a fixed section: 10 hardcoded cover images in `public/images/home/books/` (owner's final decision, 2026-10-01; the earlier admin-managed Books group was dropped).

## Settings — existing groups read by the home page

| Group | Used for | Public shape (005) |
|---|---|---|
| `hero` | hero slider | `{ displaySeconds, slides: { id, desktop, mobile, alt, heading, button }[] }` (visible only) |
| `stats` | progress dashboard | `{ students, books, teachers, campuses }` |
| `video` | Why Choose video | `{ youtubeUrl, youtubeId }` |

## News — read model

`listLatestPosts(limit = 6): PublicPostSummary[]` applies the same `publicVisibilityFilter` and sort (`publishDate` desc, `updatedAt` desc) as the News list.

## Static content — `src/content/home.ts`

Typed records in the shape a future database row would take (FR-026, feature 014):

```ts
interface ContentImage { src: string; alt: string }           // alt "" = decorative
interface FindUsNearby { text: string; highlight: string; cta: { label: string; href: "/campuses" } }
interface QuickAccessCard { id: string; title: string; text: string; icon: ContentImage; href: string }   // ×4
interface Inspiration { heading: string; line: string; logo: ContentImage }
interface WhyChoose { heading: string; paragraphs: string[] }   // video from Settings
interface BooksSection { heading: string; line: string; background?: ContentImage }
interface SalientFeature { id: string; title: string; text: string; image: ContentImage }  // ×4
interface ProgressDashboard { heading: string; line: string; labels: Record<"students"|"books"|"teachers"|"campuses", { title: string; caption: string }> }
interface QuickLink { id: string; label: string; image: ContentImage; href: string }        // ×4
interface CareersCta { heading: { before; highlight; after }; supporting: string; button: { label: "Join Now"; href: "/careers" } }
interface Partner { id: string; name: string; logo: ContentImage; href?: string }
```

Every record has a `placeholder?: boolean` flag. Placeholder wording renders `data-placeholder` (the 004 precedent).

### Fixed destinations

| Item | href |
|---|---|
| Find Us Nearby | `/campuses` |
| Admission Procedure | `/admission/admission-procedure` |
| Salient Features | `/about/salient-features` |
| Branch Network | `/campuses` |
| Education Curriculum | `/academics` |
| Photo/Videos | `/resources#photo-gallery` |
| Downloads | `/resources#downloads` |
| Our Books | `/resources#our-books` |
| Call/Mail/Chat | `/contact` |
| Join Now | `/careers` |
| News "View all" | `/news` |
