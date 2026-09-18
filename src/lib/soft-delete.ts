import type { Schema } from "mongoose";

declare module "mongoose" {
  // TS requires this declaration-merge to repeat the original's exact
  // type parameter name (DocType), even though this added member
  // doesn't use it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface QueryOptions<DocType = unknown> {
    /** Bypasses the soft-delete plugin's default deletedAt:null filter. */
    withDeleted?: boolean;
  }
}

/**
 * Soft-delete Mongoose plugin (FR-030; data-model.md "Shared plugin").
 * Adds `deletedAt: Date | null` and filters it out of every normal
 * read/update by default — callers opt in to seeing deleted records
 * with `.setOptions({ withDeleted: true })`, so a later feature cannot
 * forget the filter (it would have to deliberately ask to bypass it).
 */
export function softDeletePlugin(schema: Schema): void {
  schema.add({
    deletedAt: { type: Date, default: null, index: true },
  });

  const queryMiddlewareOps = [
    "find",
    "findOne",
    "countDocuments",
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
  ] as const;

  for (const op of queryMiddlewareOps) {
    schema.pre(op, function (this: import("mongoose").Query<unknown, unknown>) {
      const options = this.getOptions();
      if (options.withDeleted) return;
      const filter = this.getFilter();
      if (filter.deletedAt === undefined) {
        this.where({ deletedAt: null });
      }
    });
  }

  schema.pre("aggregate", function (this: import("mongoose").Aggregate<unknown[]>) {
    const options = this.options as { withDeleted?: boolean } | undefined;
    if (options?.withDeleted) return;
    this.pipeline().unshift({ $match: { deletedAt: null } });
  });

  schema.statics.softDeleteById = function (id: unknown) {
    return this.findOneAndUpdate({ _id: id }, { $set: { deletedAt: new Date() } }, { new: true });
  };

  schema.statics.restoreById = function (id: unknown) {
    return this.findOneAndUpdate(
      { _id: id },
      { $set: { deletedAt: null } },
      { new: true, withDeleted: true },
    );
  };
}

export interface SoftDeleteStatics<T> {
  softDeleteById(id: unknown): Promise<T | null>;
  restoreById(id: unknown): Promise<T | null>;
}
