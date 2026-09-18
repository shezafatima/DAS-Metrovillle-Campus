// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import mongoose, { Schema, type Model } from "mongoose";
import { describeWithDb } from "@/test/db";
import { softDeletePlugin, type SoftDeleteStatics } from "@/lib/soft-delete";

interface TestItemDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  deletedAt: Date | null;
}

type TestItemModel = Model<TestItemDoc> & SoftDeleteStatics<TestItemDoc>;

function getTestItemModel(): TestItemModel {
  const existing = mongoose.models.TestItem as TestItemModel | undefined;
  if (existing) return existing;
  const schema = new Schema<TestItemDoc>({ name: { type: String, required: true } });
  schema.plugin(softDeletePlugin);
  return mongoose.model<TestItemDoc>("TestItem", schema) as TestItemModel;
}

describeWithDb("soft-delete plugin", ["testitems"], () => {
  let TestItem: TestItemModel;

  beforeAll(() => {
    TestItem = getTestItemModel();
  });

  it("excludes a soft-deleted record from find/findOne/countDocuments/aggregate", async () => {
    const doc = await TestItem.create({ name: "visible-then-deleted" });
    await TestItem.softDeleteById(doc._id);

    expect(await TestItem.findOne({ _id: doc._id })).toBeNull();
    expect(await TestItem.find({ _id: doc._id })).toHaveLength(0);
    expect(await TestItem.countDocuments({ _id: doc._id })).toBe(0);
    const aggregated = await TestItem.aggregate([{ $match: { _id: doc._id } }]);
    expect(aggregated).toHaveLength(0);
  });

  it("includes a soft-deleted record when withDeleted is set", async () => {
    const doc = await TestItem.create({ name: "findable-with-flag" });
    await TestItem.softDeleteById(doc._id);

    const found = await TestItem.findOne({ _id: doc._id }).setOptions({ withDeleted: true });
    expect(found).not.toBeNull();
    expect(found!.deletedAt).not.toBeNull();
  });

  it("restoreById brings the record back with its original data intact", async () => {
    const doc = await TestItem.create({ name: "round-trip" });
    await TestItem.softDeleteById(doc._id);
    expect(await TestItem.findOne({ _id: doc._id })).toBeNull();

    const restored = await TestItem.restoreById(doc._id);
    expect(restored).not.toBeNull();
    expect(restored!.deletedAt).toBeNull();
    expect(restored!.name).toBe("round-trip");

    const foundNormally = await TestItem.findOne({ _id: doc._id });
    expect(foundNormally).not.toBeNull();
    expect(foundNormally!.name).toBe("round-trip");
  });

  it("updateMany skips soft-deleted rows by default", async () => {
    const a = await TestItem.create({ name: "bulk-a" });
    const b = await TestItem.create({ name: "bulk-b" });
    await TestItem.softDeleteById(a._id);

    await TestItem.updateMany({ name: { $in: ["bulk-a", "bulk-b"] } }, { $set: { name: "bulk-updated" } });

    const aAfter = await TestItem.findOne({ _id: a._id }).setOptions({ withDeleted: true });
    const bAfter = await TestItem.findOne({ _id: b._id });
    expect(aAfter!.name).toBe("bulk-a"); // untouched — was filtered out
    expect(bAfter!.name).toBe("bulk-updated");
  });
});

describe("soft-delete plugin (no DB required)", () => {
  it("adds a deletedAt field to the schema", () => {
    const schema = new Schema({ name: String });
    softDeletePlugin(schema);
    expect(schema.path("deletedAt")).toBeDefined();
  });
});
