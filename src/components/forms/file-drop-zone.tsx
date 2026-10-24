"use client";

import { useId, useRef, useState } from "react";
import { FileText } from "lucide-react";

export interface FileDropZoneLabels {
  /** The prompt, also the accessible name of the file input. */
  prompt: string;
  /** Shown before a file is chosen, e.g. "PDF only, max 4 MB". */
  hint: string;
  remove: string;
  /** The accessible name of the Remove button for a file, e.g. "Remove cv.pdf". */
  removeNamed: (fileName: string) => string;
}

/** "812 KB", "1.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A file picker with a drop zone. The real `<input type="file">` is always in the page (visually hidden but
 * focusable and labelled), so the keyboard, assistive technology and the browser's own picker all work: Tab to
 * it and press Enter or Space. A drag-and-drop or a click on the zone only hands the same file to the form.
 * The chosen file lives in the parent's state (`file`), so a failed submit keeps it.
 *
 * The component does not judge the file: the form's own checks (type, size, content) run on submit as before.
 */
export function FileDropZone({
  id,
  name,
  accept,
  file,
  onFile,
  error,
  labels,
}: {
  id: string;
  name: string;
  accept: string;
  file: File | null;
  onFile: (file: File | null) => void;
  error?: string;
  labels: FileDropZoneLabels;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hintId = useId();
  const fileId = useId();
  const describedBy = [file ? fileId : hintId, error ? `${id}-error` : null].filter(Boolean).join(" ");

  function remove() {
    if (inputRef.current) inputRef.current.value = "";
    onFile(null);
    inputRef.current?.focus();
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) onFile(dropped);
      }}
      className="flex flex-col gap-2"
    >
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="peer sr-only"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />

      <label
        htmlFor={id}
        data-dragging={dragging ? "true" : undefined}
        className={
          file
            ? "sr-only"
            : "flex min-h-32 scroll-mt-(--form-scroll-offset) cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-text-muted bg-signup-input-bg px-4 py-6 text-center font-body text-foreground transition-colors duration-(--motion-fast) hover:border-primary hover:bg-primary/10 peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:ring-4 peer-focus-visible:ring-gold/40 data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/10 peer-aria-invalid:border-error-strong"
        }
      >
        {!file && <FileText aria-hidden="true" focusable="false" className="size-8 text-primary" />}
        <span className="font-bold text-sm">{labels.prompt}</span>
        {!file && (
          <span id={hintId} className="text-xs">
            {labels.hint}
          </span>
        )}
      </label>

      {file && (
        <div
          id={fileId}
          aria-live="polite"
          data-testid="chosen-file"
          className="flex items-center gap-3 rounded-lg border border-text-muted bg-signup-input-bg p-3"
        >
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-primary">
            <FileText focusable="false" className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col font-body">
            <span dir="auto" className="truncate font-bold text-foreground text-sm">
              {file.name}
            </span>
            <span className="text-foreground text-xs">{formatFileSize(file.size)}</span>
          </span>
          <button
            type="button"
            onClick={remove}
            aria-label={labels.removeNamed(file.name)}
            className="min-h-11 shrink-0 rounded-lg border-2 border-primary px-4 font-button font-semibold text-primary text-sm outline-none transition-colors duration-(--motion-fast) hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-4 focus-visible:ring-gold/40"
          >
            {labels.remove}
          </button>
        </div>
      )}
    </div>
  );
}
