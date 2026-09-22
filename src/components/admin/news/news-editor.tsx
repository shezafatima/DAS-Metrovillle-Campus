"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Form, FormField, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { RichTextEditor } from "@/components/admin/news/rich-text-editor";
import { CoverImageField } from "@/components/admin/news/cover-image-field";
import { useUnsavedChanges } from "@/components/admin/news/use-unsaved-changes";
import { newsCopy } from "@/content/admin";
import { NEWS_CATEGORIES } from "@/lib/news/categories";
import { slugify } from "@/lib/news/slug";
import { toDateInput } from "@/lib/news/dates";
import { newsPostInputSchema, fieldErrors, type CoverImageInput } from "@/lib/validation/news";
import type { AdminPost } from "@/lib/news/admin-queries";

const editorCopy = newsCopy.editor;

interface FormState {
  title: string;
  slug: string;
  language: "en" | "ur";
  category: string; // "" until chosen — validated as a real category on submit
  publishDate: string;
  status: "draft" | "published";
  bodyHtml: string;
  coverImage: CoverImageInput | null;
}

function initialState(post?: AdminPost): FormState {
  if (post) {
    return {
      title: post.title,
      slug: post.slug,
      language: post.language,
      category: post.category,
      publishDate: post.publishDate,
      status: post.status,
      bodyHtml: post.bodyHtml,
      coverImage: post.coverImage,
    };
  }
  return {
    title: "",
    slug: "",
    language: "en",
    category: "",
    publishDate: toDateInput(new Date()),
    status: "draft",
    bodyHtml: "",
    coverImage: null,
  };
}

export interface NewsEditorProps {
  mode: "create" | "edit";
  post?: AdminPost;
}

export function NewsEditor({ mode, post }: NewsEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(post));
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<"draft" | "published" | "status" | null>(null);
  const [currentStatus, setCurrentStatus] = useState<"draft" | "published">(post?.status ?? "draft");

  useUnsavedChanges(dirty);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-fill the address from the title while creating a post and
      // the admin hasn't edited it by hand yet (FR-003).
      if (key === "title" && mode === "create" && !slugTouched) {
        next.slug = slugify(String(value));
      }
      return next;
    });
    setDirty(true);
  }

  function handleSlugBlur() {
    // FR-005: a hand-typed address is normalised, and the admin sees
    // the normalised result (sp.analyze finding I1).
    setForm((prev) => ({ ...prev, slug: slugify(prev.slug) }));
  }

  function buildPayload(status: "draft" | "published") {
    return {
      title: form.title,
      slug: form.slug ? slugify(form.slug) : undefined,
      bodyHtml: form.bodyHtml,
      language: form.language,
      category: form.category,
      publishDate: form.publishDate,
      status,
      coverImage: form.coverImage,
    };
  }

  async function submitForm(status: "draft" | "published") {
    const payload = buildPayload(status);
    const parsed = newsPostInputSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(status);
    try {
      const url = mode === "create" ? "/api/admin/news" : `/api/admin/news/${post!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();

      if (response.ok) {
        setDirty(false);
        setCurrentStatus(status);
        toast({
          title: status === "published" ? newsCopy.toasts.published : newsCopy.toasts.draftSaved,
          type: "success",
        });
        if (mode === "create") {
          router.push(`/admin/news/${body.id}`);
        } else {
          router.refresh();
        }
        return;
      }

      if (response.status === 400 || response.status === 409) {
        setErrors(body.fields ?? {});
        toast({ title: newsCopy.toasts.saveFailed, type: "error" });
        return;
      }

      toast({ title: newsCopy.toasts.unavailable, type: "error" });
    } catch {
      toast({ title: newsCopy.toasts.unavailable, type: "error" });
    } finally {
      setSaving(null);
    }
  }

  async function toggleStatus() {
    if (mode !== "edit" || !post) return;
    const action = currentStatus === "draft" ? "publish" : "unpublish";
    setSaving("status");
    try {
      const response = await fetch(`/api/admin/news/${post.id}/${action}`, { method: "POST" });
      if (response.ok) {
        const body = await response.json();
        setCurrentStatus(body.status);
        setForm((prev) => ({ ...prev, status: body.status }));
        toast({
          title: body.status === "published" ? newsCopy.toasts.published : newsCopy.toasts.unpublished,
          type: "success",
        });
        router.refresh();
      } else {
        toast({ title: newsCopy.toasts.unavailable, type: "error" });
      }
    } catch {
      toast({ title: newsCopy.toasts.unavailable, type: "error" });
    } finally {
      setSaving(null);
    }
  }

  const dir = form.language === "ur" ? "rtl" : "ltr";

  return (
    <Form
      className="flex max-w-2xl flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <FormField name="title">
        <FormLabel>{editorCopy.fields.title}</FormLabel>
        <FormControl
          required
          value={form.title}
          dir={dir}
          className={dir === "rtl" ? "font-body-urdu" : undefined}
          onChange={(event) => update("title", event.target.value)}
        />
        {errors.title && <FormMessage match>{errors.title}</FormMessage>}
      </FormField>

      <FormField name="slug">
        <FormLabel>{editorCopy.fields.slug}</FormLabel>
        <FormControl
          value={form.slug}
          onChange={(event) => {
            setSlugTouched(true);
            update("slug", event.target.value);
          }}
          onBlur={handleSlugBlur}
        />
        <FormDescription>{editorCopy.fields.slugHint}</FormDescription>
        {errors.slug && <FormMessage match>{errors.slug}</FormMessage>}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField name="language">
          <FormLabel htmlFor="news-editor-language">{editorCopy.fields.language}</FormLabel>
          <Select
            id="news-editor-language"
            value={form.language}
            onChange={(event) => update("language", event.target.value as "en" | "ur")}
          >
            <option value="en">{editorCopy.fields.languageEn}</option>
            <option value="ur">{editorCopy.fields.languageUr}</option>
          </Select>
        </FormField>

        <FormField name="category">
          <FormLabel htmlFor="news-editor-category">{editorCopy.fields.category}</FormLabel>
          <Select
            id="news-editor-category"
            value={form.category}
            onChange={(event) => update("category", event.target.value)}
          >
            <option value="" disabled>
              {editorCopy.validation.category}
            </option>
            {NEWS_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
          {errors.category && <FormMessage match>{errors.category}</FormMessage>}
        </FormField>
      </div>

      <FormField name="publishDate">
        <FormLabel>{editorCopy.fields.publishDate}</FormLabel>
        <FormControl
          type="date"
          value={form.publishDate}
          onChange={(event) => update("publishDate", event.target.value)}
        />
        {errors.publishDate && <FormMessage match>{errors.publishDate}</FormMessage>}
      </FormField>

      <FormField name="coverImage">
        <FormLabel>{editorCopy.fields.coverImage}</FormLabel>
        <CoverImageField
          value={form.coverImage}
          onChange={(coverImage) => update("coverImage", coverImage)}
          errorMessage={errors["coverImage.alt"]}
        />
        {errors.coverImage && <FormMessage match>{errors.coverImage}</FormMessage>}
      </FormField>

      <div className="flex flex-col gap-1.5">
        <span className="font-bold text-sm text-foreground">{editorCopy.fields.body}</span>
        <RichTextEditor
          value={form.bodyHtml}
          dir={dir}
          onChange={(html) => update("bodyHtml", html)}
        />
        {errors.bodyHtml && <p className="font-light text-xs text-destructive">{errors.bodyHtml}</p>}
      </div>

      {mode === "edit" && (
        <div className="flex items-center gap-2">
          <span className="font-light text-xs text-muted-foreground">Status:</span>
          <Badge variant={currentStatus === "published" ? "default" : "secondary"}>
            {currentStatus === "published" ? editorCopy.statusBadge.published : editorCopy.statusBadge.draft}
          </Badge>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={saving !== null}
          onClick={() => submitForm("draft")}
        >
          {saving === "draft" && <Loader2 className="animate-spin" aria-hidden="true" />}
          {editorCopy.buttons.saveDraft}
        </Button>
        <Button type="button" disabled={saving !== null} onClick={() => submitForm("published")}>
          {saving === "published" && <Loader2 className="animate-spin" aria-hidden="true" />}
          {editorCopy.buttons.saveAndPublish}
        </Button>
        {mode === "edit" && (
          <Button type="button" variant="outline" disabled={saving !== null} onClick={toggleStatus}>
            {saving === "status" && <Loader2 className="animate-spin" aria-hidden="true" />}
            {currentStatus === "draft" ? editorCopy.buttons.publish : editorCopy.buttons.unpublish}
          </Button>
        )}
        <Link href="/admin/news" className={buttonVariants({ variant: "ghost" })}>
          {editorCopy.buttons.cancel}
        </Link>
      </div>
    </Form>
  );
}
