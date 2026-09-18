interface PagePlaceholderProps {
  title: string;
}

export function PagePlaceholder({ title }: PagePlaceholderProps) {
  return (
    <div className="mx-auto flex max-w-(--container-max-width) flex-col items-start gap-4 px-(--container-gutter-x) py-section-gap-lg">
      <h1 className="font-heading text-h3 text-text">{title}</h1>
      <p className="font-body text-body text-text-muted">
        This page hasn&apos;t been built yet — its content is coming in a
        later feature.
      </p>
    </div>
  );
}
