// @vitest-environment node
import { describe, it, expect } from "vitest";
import { describeWithDb } from "@/test/db";
import {
  createPost,
  updatePost,
  setPostStatus,
  deletePost,
  ValidationFailure,
  SlugConflictError,
  UploadVerificationError,
} from "./mutations";
import { NewsPost } from "@/models/news-post";

function coverImageInput(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://res.cloudinary.com/demo/image/upload/v1/news/covers/abc.jpg",
    publicId: "news/covers/abc",
    width: 1200,
    height: 630,
    alt: "A descriptive caption",
    ...overrides,
  };
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Sports Day",
    bodyHtml: "<p>Come join us for sports day.</p>",
    category: "events",
    publishDate: "2026-09-21",
    ...overrides,
  };
}

describeWithDb("news mutations", ["news"], () => {
  describe("createPost — slugs", () => {
    it("generates sports-day then sports-day-2 for two posts with the same title", async () => {
      const first = await createPost(validInput());
      const second = await createPost(validInput());
      expect(first.slug).toBe("sports-day");
      expect(second.slug).toBe("sports-day-2");
    });

    it("still forces -2 when the first sports-day post is soft-deleted", async () => {
      const first = await createPost(validInput());
      await deletePost(first.id);
      const second = await createPost(validInput());
      expect(second.slug).toBe("sports-day-2");
    });

    it("throws SlugConflictError for a hand-typed slug that's taken", async () => {
      await createPost(validInput({ slug: "taken-slug" }));
      await expect(createPost(validInput({ slug: "taken-slug" }))).rejects.toBeInstanceOf(
        SlugConflictError,
      );
    });
  });

  describe("createPost — body validation", () => {
    it("rejects a formatting-only body (empty headings/list items)", async () => {
      await expect(
        createPost(validInput({ bodyHtml: "<p></p><ul><li></li></ul>" })),
      ).rejects.toBeInstanceOf(ValidationFailure);
    });

    it("rejects an empty title", async () => {
      await expect(createPost(validInput({ title: "" }))).rejects.toBeInstanceOf(
        ValidationFailure,
      );
    });
  });

  describe("updatePost", () => {
    it("keeps the slug when only the title changes", async () => {
      const created = await createPost(validInput({ title: "Original Title" }));
      const updated = await updatePost(created.id, validInput({ title: "Updated Title" }));
      expect(updated?.slug).toBe(created.slug);
    });

    it("changes the slug when a different one is explicitly sent", async () => {
      const created = await createPost(validInput());
      const updated = await updatePost(created.id, validInput({ slug: "new-address" }));
      expect(updated?.slug).toBe("new-address");
    });

    it("recomputes the excerpt on update", async () => {
      const created = await createPost(validInput({ bodyHtml: "<p>Original body text.</p>" }));
      await updatePost(created.id, validInput({ bodyHtml: "<p>Completely different text.</p>" }));
      const doc = await NewsPost.findById(created.id);
      expect(doc?.excerpt).toBe("Completely different text.");
    });

    it("returns null for an unknown id", async () => {
      const result = await updatePost("507f1f77bcf86cd799439011", validInput());
      expect(result).toBeNull();
    });
  });

  describe("setPostStatus", () => {
    it("toggles between draft and published", async () => {
      const created = await createPost(validInput({ status: "draft" }));
      const published = await setPostStatus(created.id, "published");
      expect(published?.status).toBe("published");
      const unpublished = await setPostStatus(created.id, "draft");
      expect(unpublished?.status).toBe("draft");
    });

    it("returns null for an unknown id", async () => {
      expect(await setPostStatus("507f1f77bcf86cd799439011", "published")).toBeNull();
    });
  });

  describe("cover image verification", () => {
    it("rejects a new cover image the verifier flags as too large", async () => {
      const verifyCover = async () => ({ ok: false as const, reason: "too_large" as const });
      await expect(
        createPost(validInput({ coverImage: coverImageInput() }), { verifyCover }),
      ).rejects.toBeInstanceOf(ValidationFailure);
    });

    it("throws UploadVerificationError when the verifier is unavailable", async () => {
      const verifyCover = async () => ({ ok: false as const, reason: "unavailable" as const });
      await expect(
        createPost(validInput({ coverImage: coverImageInput() }), { verifyCover }),
      ).rejects.toBeInstanceOf(UploadVerificationError);
    });

    it("accepts a post whose cover image passes verification", async () => {
      const verifyCover = async () => ({ ok: true as const });
      const created = await createPost(validInput({ coverImage: coverImageInput() }), { verifyCover });
      const doc = await NewsPost.findById(created.id);
      expect(doc?.coverImage?.publicId).toBe("news/covers/abc");
    });

    it("does not re-verify an unchanged cover image on update", async () => {
      let calls = 0;
      const verifyCover = async () => {
        calls++;
        return { ok: true as const };
      };
      const created = await createPost(validInput({ coverImage: coverImageInput() }), { verifyCover });
      expect(calls).toBe(1);
      await updatePost(created.id, validInput({ title: "Updated", coverImage: coverImageInput() }), {
        verifyCover,
      });
      expect(calls).toBe(1); // same publicId — not re-verified
    });
  });

  describe("deletePost", () => {
    it("sets deletedAt and removes the post from find()", async () => {
      const created = await createPost(validInput());
      await deletePost(created.id);
      expect(await NewsPost.findById(created.id)).toBeNull();
      const withDeleted = await NewsPost.findById(created.id).setOptions({ withDeleted: true });
      expect(withDeleted?.deletedAt).not.toBeNull();
    });

    it("returns null for an unknown id", async () => {
      expect(await deletePost("507f1f77bcf86cd799439011")).toBeNull();
    });
  });
});
