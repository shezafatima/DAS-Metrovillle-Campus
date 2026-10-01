import { settingsCopy } from "@/content/admin";
import type { GroupDefinition } from "../types";

/** Home video (005 FR-019, FR-020). Empty means "no video". */
export const videoDefinition: GroupDefinition = {
  key: "video",
  label: settingsCopy.groups.video.title,
  fields: [
    {
      type: "video",
      key: "youtubeUrl",
      label: settingsCopy.fields.video.youtubeUrl,
      hint: settingsCopy.hints.videoUrl,
      default: "",
    },
  ],
};
