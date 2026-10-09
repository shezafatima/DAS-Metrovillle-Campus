// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { formatMigrationReport } from "@/lib/gallery/migrate-cli";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

vi.mock("@/lib/cloudinary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloudinary")>();
  return { ...actual, deleteUploadedImage: vi.fn() };
});

describe("migrate:gallery report", () => {
  it("prints one line for each outcome", () => {
    expect(formatMigrationReport({ status: "migrated", migrated: 10, notMigrated: 0, albums: 2 })).toBe(
      "Migrated 10 photo(s) into 2 album(s); 0 photo(s) were not migrated.",
    );
    expect(formatMigrationReport({ status: "migrated", migrated: 48, notMigrated: 2, albums: 6 })).toBe(
      "Migrated 48 photo(s) into 6 album(s); 2 photo(s) were not migrated.",
    );
    expect(formatMigrationReport({ status: "already" })).toBe("Gallery already migrated; nothing to do.");
    expect(formatMigrationReport({ status: "none" })).toBe("No gallery to migrate.");
  });
});

function flat(live: number) {
  return {
    images: Array.from({ length: live }, (_, i) => ({
      id: crypto.randomUUID(),
      image: { url: `https://res.cloudinary.com/demo/image/upload/v1/settings/gallery/i${i}.jpg`, publicId: `settings/gallery/i${i}`, width: 8, height: 6 },
      caption: "",
      deletedAt: null,
    })),
  };
}

describeWithDb("migrate:gallery against the database", ["settings"], () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  async function seed(data: unknown) {
    const mongoose = (await import("mongoose")).default;
    await mongoose.connection.db!.collection("settings").insertOne({ _id: "gallery" as never, data, version: 1, updatedBy: "seed", updatedAt: new Date() });
  }

  it("reports 10 → 2 albums, then nothing to do", async () => {
    await seed(flat(10));
    const { runGalleryMigration } = await import("@/lib/gallery/migrate-cli");
    expect(await runGalleryMigration()).toBe("Migrated 10 photo(s) into 2 album(s); 0 photo(s) were not migrated.");
    expect(await runGalleryMigration()).toBe("Gallery already migrated; nothing to do.");
  });

  it("reports the photos past 48", async () => {
    await seed(flat(50));
    const { runGalleryMigration } = await import("@/lib/gallery/migrate-cli");
    expect(await runGalleryMigration()).toBe("Migrated 48 photo(s) into 6 album(s); 2 photo(s) were not migrated.");
  });

  it("reports no gallery when there is none", async () => {
    const { runGalleryMigration } = await import("@/lib/gallery/migrate-cli");
    expect(await runGalleryMigration()).toBe("No gallery to migrate.");
  });
});
