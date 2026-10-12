import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { teachersTraining } from "@/content/academics";
import { TeachersTrainingSection } from "./teachers-training";

describe("TeachersTrainingSection", () => {
  it("renders the muted section, a bold intro and the 8 points in order, each with an icon", () => {
    const { container } = render(<TeachersTrainingSection value={teachersTraining} />);
    const section = container.querySelector("section#teachers-training");
    expect(section?.getAttribute("data-background")).toBe("muted");
    expect(container.querySelector("h2")?.textContent).toBe("Teachers' Training");
    const intro = container.querySelector("p")!;
    expect(intro.textContent).toBe(teachersTraining.intro);
    expect(intro.className).toContain("font-bold");
    const lis = [...container.querySelectorAll("ul > li")];
    expect(lis.map((li) => li.textContent)).toEqual(teachersTraining.items.map((i) => i.text));
    expect(lis).toHaveLength(8);
    for (const li of lis) expect(li.querySelector("span[aria-hidden=true] svg")).not.toBeNull();
  });

  it("draws no photo or video block when none is passed", () => {
    const { container } = render(<TeachersTrainingSection value={teachersTraining} />);
    expect(container.querySelector("[data-testid=training-photos]")).toBeNull();
    expect(container.querySelector("[data-testid=training-video]")).toBeNull();
  });

  it("puts the video beside the text and the photos in a row below", () => {
    const { container } = render(
      <TeachersTrainingSection
        value={teachersTraining}
        photos={<div data-testid="training-photos" />}
        video={<div data-testid="inner-video" />}
      />,
    );
    const grid = container.querySelector('[class*="md:grid-cols-12"]')!;
    expect(grid.children[0].querySelector("ul")).not.toBeNull();
    expect(grid.children[1].querySelector("[data-testid=training-video] [data-testid=inner-video]")).not.toBeNull();
    const photos = container.querySelector("[data-testid=training-photos]")!;
    expect(grid.contains(photos)).toBe(false);
    expect(grid.compareDocumentPosition(photos) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts the photos below the text when there is no video", () => {
    const { container } = render(<TeachersTrainingSection value={teachersTraining} photos={<div data-testid="training-photos" />} />);
    expect(container.querySelector('[class*="md:grid-cols-12"]')).toBeNull();
    const ul = container.querySelector("ul")!;
    const photos = container.querySelector("[data-testid=training-photos]")!;
    expect(ul.compareDocumentPosition(photos) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
