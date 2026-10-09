"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cloudinaryLoader } from "@/lib/news/cloudinary-loader";
import { requestSignature, uploadToCloudinary } from "@/lib/uploads/direct-upload";
import { precheckImage } from "@/lib/uploads/image-limits";
import { newsCopy } from "@/content/admin";
import type { CoverImageInput } from "@/lib/validation/news";

const SIGN_ENDPOINT = "/api/admin/uploads/sign";

export interface CoverImageFieldProps {
  value: CoverImageInput | null;
  onChange: (value: CoverImageInput | null) => void;
  errorMessage?: string;
}

/**
 * Cover image upload (FR-023–FR-027, research.md §3): the browser
 * uploads directly to Cloudinary using a signature this component asks
 * the server to mint — the server never sees the file. A failed upload
 * leaves every other field the admin already entered untouched (FR-024)
 * because this component only ever calls `onChange`, never resets its
 * own or the parent's other state on error.
 */
export function CoverImageField({ value, onChange, errorMessage }: CoverImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLocalError(null);

    const failure = await precheckImage(file);
    if (failure === "bad_format") {
      setLocalError(newsCopy.editor.validation.imageBadFormat);
      return;
    }
    if (failure === "too_large") {
      setLocalError(newsCopy.editor.validation.imageTooLarge);
      return;
    }

    setUploading(true);
    try {
      const signed = await requestSignature(SIGN_ENDPOINT, "news-cover");
      const result = await uploadToCloudinary(file, signed);
      onChange({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        alt: value?.alt ?? "",
      });
    } catch {
      setLocalError(newsCopy.toasts.uploadFailed);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {value ? (
        <div className="flex items-start gap-3">
          <Image
            src={value.url}
            alt={value.alt || ""}
            width={160}
            height={90}
            loader={cloudinaryLoader}
            className="h-24 w-40 rounded border border-input object-cover"
          />
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              {newsCopy.editor.buttons.chooseImage}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(null);
                setLocalError(null);
              }}
            >
              <X aria-hidden="true" />
              {newsCopy.editor.buttons.removeImage}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Upload aria-hidden="true" />
          )}
          {uploading ? newsCopy.editor.buttons.uploading : newsCopy.editor.buttons.chooseImage}
        </Button>
      )}

      {localError && <p className="font-light text-xs text-destructive">{localError}</p>}

      {value && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="news-editor-cover-alt" className="font-bold text-sm text-foreground">
            {newsCopy.editor.fields.coverImageAlt}
          </label>
          <Input
            id="news-editor-cover-alt"
            required
            value={value.alt}
            onChange={(event) => onChange({ ...value, alt: event.target.value })}
            placeholder={newsCopy.editor.fields.coverImageAltHint}
          />
          {errorMessage && <p className="font-light text-xs text-destructive">{errorMessage}</p>}
        </div>
      )}
    </div>
  );
}
