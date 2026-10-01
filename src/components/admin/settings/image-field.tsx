"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { settingsCopy } from "@/content/admin";
import { cloudinaryLoader } from "@/lib/news/cloudinary-loader";
import { requestSignature, uploadToCloudinary } from "@/lib/uploads/direct-upload";
import { precheckImage } from "@/lib/uploads/image-limits";
import type { ImageFieldDef, ImageRef } from "@/lib/settings/types";

export const SETTINGS_SIGN_ENDPOINT = "/api/admin/settings/uploads/sign";

/** Preview of a stored image: bundled placeholders are local files, everything else goes through Cloudinary. */
export function ImagePreview({ image, alt, className }: { image: ImageRef; alt: string; className?: string }) {
  const local = image.publicId === "";
  return (
    <Image
      src={image.url}
      alt={alt}
      width={160}
      height={90}
      {...(local ? { unoptimized: true } : { loader: cloudinaryLoader })}
      className={className ?? "h-24 w-40 rounded border border-input object-cover"}
    />
  );
}

export interface ImageFieldProps {
  field: ImageFieldDef;
  path: string;
  value: ImageRef | null;
  onChange: (value: ImageRef | null) => void;
  error?: string;
}

/**
 * One image (005 FR-023): the 003 cover-image flow — pre-check the type, size
 * and real leading bytes, ask the server to sign, upload straight to
 * Cloudinary. A failed upload only sets this field's own message and never
 * touches anything else in the form (FR-028).
 */
export function ImageField({ field, path, value, onChange, error }: ImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${path}-error`;

  async function handleFile(file: File) {
    setLocalError(null);
    if (await precheckImage(file)) {
      setLocalError(settingsCopy.errors.imageLimits);
      return;
    }
    setUploading(true);
    try {
      const signed = await requestSignature(SETTINGS_SIGN_ENDPOINT, field.kind);
      const result = await uploadToCloudinary(file, signed);
      onChange({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height });
    } catch {
      setLocalError(settingsCopy.list.uploadFailed(file.name, settingsCopy.toasts.unavailable));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const message = localError ?? error;

  return (
    <div className="flex flex-col gap-2" data-testid={`image-field-${path}`}>
      <span className="font-bold text-foreground text-sm" id={`${path}-label`}>
        {field.label}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-labelledby={`${path}-label`}
        data-testid={`image-input-${path}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {value ? (
        <div className="flex flex-wrap items-start gap-3">
          <ImagePreview image={value} alt="" />
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
              {uploading ? settingsCopy.list.uploading(field.label) : settingsCopy.list.replaceImage}
            </Button>
            {!field.required && (
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
                {settingsCopy.list.removeImage}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {uploading ? settingsCopy.list.uploading(field.label) : settingsCopy.list.chooseImage}
          </Button>
        </div>
      )}

      {field.hint && <p className="font-light text-muted-foreground text-xs">{field.hint}</p>}
      {message && (
        <p id={errorId} role="alert" className="font-light text-destructive text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
