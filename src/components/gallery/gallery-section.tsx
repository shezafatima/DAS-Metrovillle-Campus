import { AboutSection } from "@/components/about/about-section";
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
 * On the 019 Resources page it is the first of two sections (Photo Gallery,
 * Mobile Apps), in the shared AboutSection wrapper.
 */
export async function GallerySection() {
  const { albums } = await getPublicGallery();
  if (albums.length === 0) return null;
  return (
    <AboutSection id="photo-gallery" background="surface" heading={galleryContent.sectionHeading} stroke>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </AboutSection>
  );
}
