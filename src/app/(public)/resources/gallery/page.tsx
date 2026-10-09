import { redirect } from "next/navigation";

/** `/resources/gallery` on its own is not a page: send visitors to the gallery section (007). */
export default function ResourcesGalleryIndexPage() {
  redirect("/resources#photo-gallery");
}
