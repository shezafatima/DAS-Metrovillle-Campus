import { CareerApplication } from "@/models/career-application";
import { newCvKey } from "@/lib/documents/types";

export interface ApplicationSeed {
  name?: string;
  email?: string;
  phone?: string;
  qualification?: string;
  createdAt?: Date;
  /** `null` seeds a pending application (the CV was never confirmed). Default: stored at `createdAt`. */
  storedAt?: Date | null;
  deletedAt?: Date | null;
  key?: string;
}

let counter = 0;

/**
 * Inserts a career application straight into the collection (bypassing the
 * app's write path) so a test can set `createdAt`, the pending state and the
 * deleted state exactly. Returns the id and the storage key.
 */
export async function seedApplication(seed: ApplicationSeed = {}): Promise<{ id: string; key: string }> {
  counter += 1;
  const createdAt = seed.createdAt ?? new Date();
  const key = seed.key ?? newCvKey();
  const result = await CareerApplication.collection.insertOne({
    name: seed.name ?? "Ayesha Khan",
    email: seed.email ?? `applicant${counter}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    phone: seed.phone ?? `+9230${String(10000000 + counter).slice(-8)}`,
    qualification: seed.qualification ?? "M.Ed",
    consentAt: createdAt,
    cv: {
      key,
      size: 1024,
      storedAt: seed.storedAt === undefined ? createdAt : seed.storedAt,
      removedAt: null,
    },
    deletedAt: seed.deletedAt ?? null,
    createdAt,
    updatedAt: createdAt,
  });
  return { id: result.insertedId.toString(), key };
}
