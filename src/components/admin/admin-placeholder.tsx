import { placeholderCopy } from "@/content/admin";

export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="font-heading text-h3 text-text">{title}</h1>
      <p className="font-body text-body text-text-muted">{placeholderCopy.comingSoon}</p>
    </div>
  );
}
