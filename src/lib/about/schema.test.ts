import { describe, expect, it } from "vitest";
import {
  coreValuesSchema,
  ICON_KEYS,
  managementTeamSchema,
  messagesSchema,
  ourStorySchema,
  visionMissionSchema,
} from "./schema";

const story = { heading: "Our Story", subheading: "Sub", body: "One.\n\nTwo.", image: null };
const values = {
  heading: "V",
  subheading: "S",
  intro: "Intro.",
  values: [{ id: "leadership", name: "Leadership", icon: "compass" }],
};

describe("about schemas", () => {
  it("accepts a valid story with image null or an ImageRef", () => {
    expect(ourStorySchema.safeParse(story).success).toBe(true);
    const ref = { url: "https://res.cloudinary.com/x.jpg", publicId: "x", width: 10, height: 10 };
    expect(ourStorySchema.safeParse({ ...story, image: ref }).success).toBe(true);
  });

  it("rejects an empty heading and over-long text", () => {
    expect(ourStorySchema.safeParse({ ...story, heading: "  " }).success).toBe(false);
    expect(ourStorySchema.safeParse({ ...story, heading: "x".repeat(81) }).success).toBe(false);
  });

  it("rejects longText with outer whitespace or 3+ newlines", () => {
    expect(ourStorySchema.safeParse({ ...story, body: " padded" }).success).toBe(false);
    expect(ourStorySchema.safeParse({ ...story, body: "padded\n" }).success).toBe(false);
    expect(ourStorySchema.safeParse({ ...story, body: "a\n\n\nb" }).success).toBe(false);
  });

  it("accepts the optional urdu blocks, including the ar tagline", () => {
    expect(
      ourStorySchema.safeParse({ ...story, urdu: { lang: "ur", heading: "ا", subheading: "ب", body: "ج" } }).success,
    ).toBe(true);
    const vm = {
      heading: "H",
      subheading: "S",
      vision: { heading: "Vision", tagline: "T", body: "B" },
      mission: { heading: "Mission", body: "B" },
      urdu: {
        lang: "ur",
        vision: { heading: "ا", tagline: { lang: "ar", text: "ب" }, body: "ج" },
        mission: { heading: "د", body: "ه" },
      },
    };
    expect(visionMissionSchema.safeParse(vm).success).toBe(true);
    expect(visionMissionSchema.safeParse({ ...vm, urdu: { ...vm.urdu, lang: "en" } }).success).toBe(false);
  });

  it("rejects duplicate ids, bad ids and an unknown icon", () => {
    const v = values.values[0];
    expect(coreValuesSchema.safeParse({ ...values, values: [v, v] }).success).toBe(false);
    expect(coreValuesSchema.safeParse({ ...values, values: [{ ...v, id: "Not Valid" }] }).success).toBe(false);
    expect(coreValuesSchema.safeParse({ ...values, values: [{ ...v, icon: "rocket" }] }).success).toBe(false);
    expect(coreValuesSchema.safeParse(values).success).toBe(true);
    expect(ICON_KEYS).toContain("compass");
  });

  it("accepts an empty members list and an empty messages list", () => {
    expect(managementTeamSchema.safeParse({ heading: "Team", members: [] }).success).toBe(true);
    expect(managementTeamSchema.safeParse({ heading: "Team", members: [{ id: "a-b", name: "Ali", designation: "Head", photo: null }] }).success).toBe(true);
    expect(messagesSchema.safeParse({ heading: "Messages", messages: [] }).success).toBe(true);
  });
});
