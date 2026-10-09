import { galleryContent } from "@/content/gallery";
import { getPublicGallery } from "@/lib/gallery/public";
import { AlbumCard } from "./album-card";

/**
 * The Photo Gallery section of the Resources page (007 US4), anchored at
 * `#photo-gallery` (the Home page's Photo/Videos link and the site menu point
 * here). With no album that has photos, it renders nothing at all: no
 * heading, no empty grid (FR-031). If the gallery cannot be read it is
 * likewise hidden, never an error (FR-033).
 *
 * Feature 016 adds the Downloads (`#downloads`) and Our Books (`#our-books`)
 * sections AROUND this one. This component, its id and its behaviour must
 * not change for that.
 */
export async function GallerySection() {
  const { albums } = await getPublicGallery();
  if (albums.length === 0) return null;
  return (
    <section id="photo-gallery" aria-labelledby="photo-gallery-heading" className="anchor-section flex flex-col gap-6">
      <h2 id="photo-gallery-heading" className="font-bold font-heading text-2xl text-primary">
        {galleryContent.sectionHeading}
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </section>
  );
}
