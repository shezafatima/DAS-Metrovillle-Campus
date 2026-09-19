import { placeholderCopy } from "@/content/admin";

export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="font-bold text-2xl text-foreground">{title}</h1>
      <p className="font-light text-sm text-muted-foreground">{placeholderCopy.comingSoon}</p>
    </div>
  );
}
