import { describe, expect, it } from "vitest";
import { aboutPage, coreValues, managementTeam, messagesContent, ourStory, visionMission } from "./index";
import * as page from "./page";
import * as story from "./our-story";
import * as vm from "./vision-mission";
import * as values from "./core-values";
import * as team from "./management-team";
import * as messages from "./messages";

describe("About content files", () => {
  it("all parse (index parses at load)", () => {
    expect(aboutPage.title).toBe("About Us");
    expect(ourStory.heading).toBe("Our Story");
    expect(visionMission.vision.heading).toBe("Vision");
    expect(managementTeam.members.map((member) => [member.name, member.designation])).toEqual(
      messagesContent.messages.map((message) => [message.name, message.designation]),
    );
    expect(managementTeam.members).toHaveLength(3);
    expect(messagesContent.heading).toBe("Messages");
  });

  it("has exactly the 6 core values, in order", () => {
    expect(coreValues.values.map((v) => v.id)).toEqual([
      "leadership",
      "responsibility",
      "commitment",
      "excellence",
      "respect",
      "citizenship",
    ]);
    expect(coreValues.urdu?.values.map((v) => v.id)).toEqual(coreValues.values.map((v) => v.id));
  });

  it("has the 3 messages in order, name and designation as separate fields (T2)", () => {
    expect(messagesContent.messages.map((m) => m.id)).toEqual([
      "director-academic-training",
      "director-administration-finance",
      "principal",
    ]);
    expect(messagesContent.messages[1].name).toBe("Ijaz Afzal");
    expect(messagesContent.messages[1].designation).toBe("Director Administration & Finance");
  });

  it("marks every section pending client approval", () => {
    for (const file of [page, story, vm, values, team, messages]) {
      expect(file.review.status).toBe("pending-client-approval");
    }
  });
});
