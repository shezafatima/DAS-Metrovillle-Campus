import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { visionMission } from "@/content/about";
import { VisionMissionSection } from "./vision-mission";

describe("VisionMissionSection", () => {
  it("renders Vision and Mission panels on the highlight colour", () => {
    const { container } = render(<VisionMissionSection value={visionMission} />);
    const h3s = [...container.querySelectorAll("h3")].map((h) => h.textContent);
    expect(h3s).toEqual(["Vision", "Mission"]);
    const panels = container.querySelectorAll("article");
    expect(panels).toHaveLength(2);
    panels.forEach((p) => expect(p.className).toContain("bg-about-panel"));
    expect(container.textContent).toContain(visionMission.vision.tagline);
  });

  it("hides the icons and renders no Urdu or Arabic", () => {
    const { container } = render(<VisionMissionSection value={visionMission} />);
    container.querySelectorAll("svg").forEach((svg) => expect(svg.getAttribute("aria-hidden")).toBe("true"));
    expect(container.querySelector("[lang='ur'], [lang='ar']")).toBeNull();
  });
});
