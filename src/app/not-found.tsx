import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-(--container-max-width) flex-col items-start gap-4 px-(--container-gutter-x) py-section-gap-lg">
      <h1 className="font-heading text-h3 text-text">Page not found</h1>
      <p className="font-body text-body text-text-muted">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="font-body text-body text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Back to home
      </Link>
    </div>
  );
}
