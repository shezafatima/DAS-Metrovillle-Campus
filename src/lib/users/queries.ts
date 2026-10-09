import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { isRole, normalizePermissions, type Permission, type Role } from "@/lib/permissions";
import { ADMIN_PAGE_SIZE, type Paged } from "@/lib/admin-list";
import { UserChange, type UserChangeType } from "@/models/user-change";

/**
 * Reads for the Users page and the change record (011). The user list
 * reads Better Auth's own `user` collection and returns only what the page
 * shows — never a password or hash (those live in the `account`
 * collection, which is not touched here).
 */
export type UserStatus = "active" | "disabled";

export interface UserListItem {
  id: string;
  email: string;
  role: Role;
  permissions: Permission[];
  status: UserStatus;
  lastLoginAt: Date | null;
}

interface RawUser {
  _id: { toString(): string };
  email: string;
  role?: unknown;
  permissions?: unknown;
  disabledAt?: Date | null;
  lastLoginAt?: Date | null;
}

/**
 * The derived status (data-model.md): computed, never stored. (A deleted
 * account is not listed at all.) There is no "pending" state: the main admin
 * sets every password (Constitution III), so an account is either usable or
 * disabled.
 */
export function deriveUserStatus(user: { disabledAt?: Date | null }): UserStatus {
  return user.disabledAt ? "disabled" : "active";
}

async function userCollection() {
  await connectDb();
  return mongoose.connection.db!.collection("user");
}

/** Every non-deleted account, by email. A missing or unknown role reads as content_manager, as the DAL does. */
export async function listUsers(): Promise<UserListItem[]> {
  const users = await userCollection();
  const docs = await users
    .find(
      { deletedAt: null },
      {
        projection: {
          email: 1,
          role: 1,
          permissions: 1,
          disabledAt: 1,
          lastLoginAt: 1,
        },
      },
    )
    .sort({ email: 1 })
    .toArray();

  return (docs as unknown as RawUser[]).map((doc) => ({
    id: doc._id.toString(),
    email: doc.email,
    role: isRole(doc.role) ? doc.role : "content_manager",
    permissions: normalizePermissions(doc.permissions),
    status: deriveUserStatus(doc),
    lastLoginAt: doc.lastLoginAt ?? null,
  }));
}

/** Active main admins: the number FR-027 says can never reach zero. */
export async function countActiveMainAdmins(): Promise<number> {
  const users = await userCollection();
  return users.countDocuments({ role: "main_admin", disabledAt: null, deletedAt: null });
}

export interface UserChangeItem {
  id: string;
  at: Date;
  actorEmail: string;
  targetEmail: string;
  type: UserChangeType;
  details: Record<string, unknown>;
}

/** The change record, newest first, 20 per page (011 FR-032). */
export async function listUserChanges({
  page = 1,
  pageSize = ADMIN_PAGE_SIZE,
}: { page?: number; pageSize?: number } = {}): Promise<Paged<UserChangeItem>> {
  await connectDb();
  const total = await UserChange.countDocuments({});
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);

  const docs = await UserChange.find({})
    .sort({ at: -1, _id: -1 })
    .skip((current - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return {
    items: docs.map((doc) => ({
      id: doc._id.toString(),
      at: doc.at,
      actorEmail: doc.actorEmail,
      targetEmail: doc.targetEmail,
      type: doc.type,
      details: (doc.details ?? {}) as Record<string, unknown>,
    })),
    page: current,
    pageSize,
    total,
    totalPages,
  };
}
