import "server-only";
import { managementTeam, messagesContent } from "@/content/about";
import { placeholdersAllowed } from "@/lib/content-mode";
import { aboutView } from "./view";

/** The About view for this request. See `placeholdersAllowed` for the test seam. */
export async function resolveAboutView() {
  return aboutView({
    members: managementTeam.members,
    messageCount: messagesContent.messages.length,
    showPlaceholders: await placeholdersAllowed(),
  });
}
