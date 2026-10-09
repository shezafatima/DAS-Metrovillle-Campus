"use client";

import Image from "next/image";
import { cloudinaryLoader } from "@/lib/news/cloudinary-loader";
import type { ImageRef } from "@/lib/gallery/types";

/**
 * A gallery photo delivered through Cloudinary at a screen-suited size
 * (007 FR-018, FR-032). Client Component for the same reason as the news
 * CoverImage: the loader is a function and cannot cross from a Server
 * Component. Lazy by default, so photos below the fold load on scroll.
 */
export function GalleryImage({
  image,
  alt,
  sizes,
  className = "object-cover",
  priority = false,
}: {
  image: ImageRef;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return <Image src={image.url} alt={alt} fill loader={cloudinaryLoader} sizes={sizes} className={className} priority={priority} />;
}
