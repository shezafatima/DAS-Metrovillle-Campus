"use client";

import { useEffect, useState } from "react";
import { createGalleryAlbum, updateGalleryAlbum } from "@/app/admin/(dashboard)/settings/gallery/actions";
import { useSheetDirtyGuard } from "@/components/admin/settings/use-sheet-dirty-guard";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { galleryCopy } from "@/content/admin";
import { albumDetailsSchema, fieldErrors } from "@/lib/gallery/schema";
import { DESCRIPTION_MAX, TITLE_MAX, type AdminAlbum, type AdminGallery } from "@/lib/gallery/types";
import { reportGalleryError } from "./report-error";

interface Draft {
  title: string;
  description: string;
  date: string;
}

export interface AlbumPanelProps {
  /** The album to edit; absent to create a new one. */
  album?: AdminAlbum;
  onSaved: (gallery: AdminGallery) => void;
  triggerLabel: string;
  triggerAriaLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "default" | "sm";
  disabled?: boolean;
}

/**
 * Create an album, or edit its title, description and date, in the 011
 * right-hand panel (007 FR-024). Saves at once through the album action; a
 * stale edit (someone else changed the album since the panel opened) is
 * refused and the typed values stay (FR-026).
 */
export function AlbumPanel({ album, onSaved, triggerLabel, triggerAriaLabel, triggerVariant = "outline", triggerSize = "default", disabled }: AlbumPanelProps) {
  const guard = useSheetDirtyGuard(galleryCopy.unsavedPrompt);
  return (
    <Sheet open={guard.open} onOpenChange={guard.requestOpenChange}>
      <SheetTrigger
        disabled={disabled}
        render={<Button type="button" variant={triggerVariant} size={triggerSize} aria-label={triggerAriaLabel} disabled={disabled} />}
      >
        {triggerLabel}
      </SheetTrigger>
      <SheetContent closeLabel={galleryCopy.close}>
        <SheetHeader>
          <SheetTitle>{album ? galleryCopy.editAlbum : galleryCopy.createAlbum}</SheetTitle>
          <SheetDescription>{galleryCopy.intro}</SheetDescription>
        </SheetHeader>
        <PanelBody
          album={album}
          onDirtyChange={guard.setDirty}
          onCancel={() => guard.requestOpenChange(false)}
          onSaved={(gallery) => {
            onSaved(gallery);
            guard.close();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({
  album,
  onDirtyChange,
  onCancel,
  onSaved,
}: {
  album?: AdminAlbum;
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
  onSaved: (gallery: AdminGallery) => void;
}) {
  const [baseline] = useState<Draft>({ title: album?.title ?? "", description: album?.description ?? "", date: album?.date ?? "" });
  const [draft, setDraft] = useState<Draft>(baseline);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty = draft.title !== baseline.title || draft.description !== baseline.description || draft.date !== baseline.date;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const set = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([field]) => field !== key)));
  };

  async function save() {
    const checked = albumDetailsSchema.safeParse(draft);
    if (!checked.success) {
      setErrors(fieldErrors(checked.error));
      return;
    }
    setSaving(true);
    setConflict(false);
    const result = album
      ? await updateGalleryAlbum({ ...checked.data, albumId: album.id, rev: album.rev })
      : await createGalleryAlbum(checked.data);
    setSaving(false);
    if (result.status === "success") {
      toast({ title: album ? galleryCopy.toasts.albumUpdated(checked.data.title) : galleryCopy.toasts.albumCreated(checked.data.title), type: "success" });
      onSaved(result.data);
      return;
    }
    if (result.error === "invalid") setErrors(result.fields);
    if (result.error === "conflict") setConflict(true);
    reportGalleryError(result);
  }

  const f = galleryCopy.fields;
  return (
    <form
      className="flex flex-1 flex-col gap-5"
      data-testid="album-panel"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <FormField name="title" invalid={Boolean(errors.title)}>
        <FormLabel>{f.title}</FormLabel>
        <FormControl value={draft.title} maxLength={TITLE_MAX} dir="auto" autoComplete="off" onChange={set("title")} />
        <p className="font-light text-muted-foreground text-xs" aria-hidden="true">
          {galleryCopy.charCount(draft.title.length, TITLE_MAX)}
        </p>
        {errors.title && <FormMessage match>{errors.title}</FormMessage>}
      </FormField>

      <FormField name="description" invalid={Boolean(errors.description)}>
        <FormLabel>{f.description}</FormLabel>
        <FormControl
          render={<textarea rows={3} />}
          className="h-auto min-h-20 py-2"
          value={draft.description}
          maxLength={DESCRIPTION_MAX}
          dir="auto"
          onChange={set("description")}
        />
        <p className="font-light text-muted-foreground text-xs" aria-hidden="true">
          {galleryCopy.charCount(draft.description.length, DESCRIPTION_MAX)}
        </p>
        {errors.description && <FormMessage match>{errors.description}</FormMessage>}
      </FormField>

      <FormField name="date" invalid={Boolean(errors.date)}>
        <FormLabel>{f.date}</FormLabel>
        <FormControl type="date" value={draft.date} onChange={set("date")} />
        {errors.date && <FormMessage match>{errors.date}</FormMessage>}
      </FormField>

      {conflict && (
        <p role="alert" className="font-light text-destructive text-sm">
          {galleryCopy.toasts.conflict}
        </p>
      )}

      <div className="mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {galleryCopy.cancel}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? galleryCopy.saving : galleryCopy.save}
        </Button>
      </div>
    </form>
  );
}
