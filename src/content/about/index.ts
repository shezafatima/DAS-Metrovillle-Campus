import {
  aboutPageSchema,
  coreValuesSchema,
  managementTeamSchema,
  messagesSchema,
  ourStorySchema,
  visionMissionSchema,
} from "@/lib/about/schema";
import { aboutPage as rawPage } from "./page";
import { coreValues as rawValues } from "./core-values";
import { managementTeam as rawTeam } from "./management-team";
import { messagesContent as rawMessages } from "./messages";
import { ourStory as rawStory } from "./our-story";
import { visionMission as rawVm } from "./vision-mission";

// Parsed at module load, so a bad edit fails loudly at build and in tests.
export const aboutPage = aboutPageSchema.parse(rawPage);
export const ourStory = ourStorySchema.parse(rawStory);
export const visionMission = visionMissionSchema.parse(rawVm);
export const coreValues = coreValuesSchema.parse(rawValues);
export const managementTeam = managementTeamSchema.parse(rawTeam);
export const messagesContent = messagesSchema.parse(rawMessages);

export { teamPlaceholders } from "./management-team";
