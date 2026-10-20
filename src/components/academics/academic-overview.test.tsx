import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { academicOverview } from "@/content/academics";
import { AcademicOverviewSection } from "./academic-overview";

describe("AcademicOverviewSection", () => {
  it("renders the surface section with heading, subheading and 3 paragraphs", () => {
    const { container } = render(<AcademicOverviewSection value={academicOverview} />);
    const section = container.querySelector("section#academic-overview");
    expect(section?.getAttribute("data-background")).toBe("surface");
    expect(container.querySelector("h2")?.textContent).toBe("Academic Excellence");
    expect(container.textContent).toContain(academicOverview.subheading);
    expect(container.querySelector(".grid")!.querySelectorAll("p")).toHaveLength(3);
    const band = container.querySelector("[data-testid=heading-band]")!;
    expect(band.className).toContain("bg-topbar");
    expect(band.contains(container.querySelector("h2"))).toBe(true);
    const line = [...band.querySelectorAll("p")].find((p) => p.textContent === academicOverview.subheading)!;
    expect(line.className).toContain("font-bold");
  });

  it("shows the emblem as decorative in an aspect-academics-overview panel without a photo", () => {
    const { container } = render(<AcademicOverviewSection value={academicOverview} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toContain("logo-emblem");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.parentElement?.className).toContain("aspect-academics-overview");
  });

  it("shows the photo with its alt text when there is one", () => {
    const value = {
      ...academicOverview,
      image: { url: "/images/co-curricular.svg", publicId: "", width: 400, height: 300 },
      imageAlt: "Students in a classroom",
    };
    const { container } = render(<AcademicOverviewSection value={value} />);
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("Students in a classroom");
  });

  it("puts the text column before the media column", () => {
    const { container } = render(<AcademicOverviewSection value={academicOverview} />);
    const grid = container.querySelector(".grid")!;
    expect(grid.children[0].querySelector("p")).not.toBeNull();
    expect(grid.children[1].tagName).toBe("FIGURE");
  });
});
