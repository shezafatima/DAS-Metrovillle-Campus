import Link from "next/link";

/**
 * "Apply Now" (020 FR-017): the site's primary call-to-action style (as the
 * home careers button). The page renders it only when isAdmissionApplyOpen()
 * says so; it never decides that itself.
 */
export function ApplyButton({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex justify-center">
      <Link
        href={href}
        data-testid="admission-apply"
        className="rounded-(--radius-home-careers-button) bg-cta px-(--spacing-home-read-more-x) py-(--spacing-home-read-more-y) font-button text-(length:--text-button) font-semibold text-white outline-none transition-colors duration-(--motion-fast) hover:bg-(--color-home-careers-button-hover) hover:text-(--color-home-dark-text) focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {label}
      </Link>
    </div>
  );
}
