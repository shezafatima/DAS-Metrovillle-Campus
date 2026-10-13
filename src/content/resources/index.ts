import { mobileAppsSchema } from "@/lib/resources/schema";
import { mobileApps as rawMobileApps } from "./mobile-apps";

// Parsed at module load, so a bad edit fails loudly at build and in tests.
export const mobileApps = mobileAppsSchema.parse(rawMobileApps);

export { mobileAppsCopy, mobileAppsSource, review as mobileAppsReview } from "./mobile-apps";
