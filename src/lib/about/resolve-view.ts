import "server-only";
import { cookies } from "next/headers";
import { managementTeam, messagesContent } from "@/content/about";
import { freshReadsForTests } from "@/lib/e2e-fresh-reads";
import { aboutView, showTeamPlaceholders } from "./view";

/**
 * The About view for this request. `cookies()` is read only under the
 * test-only guard, so production pages never touch it and stay static
 * (research R4). The cookie `e2e-production-content=1` makes a dev server
 * behave as production for the E2E specs.
 */
export async function resolveAboutView() {
  const forceProduction = freshReadsForTests() && (await cookies()).get("e2e-production-content")?.value === "1";
  return aboutView({
    members: managementTeam.members,
    messageCount: messagesContent.messages.length,
    showPlaceholders: showTeamPlaceholders({ nodeEnv: process.env.NODE_ENV, forceProduction }),
  });
}
