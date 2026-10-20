import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AboutSection } from "./about-section";

describe("AboutSection", () => {
  it("renders an anchored, labelled section with its background hook", () => {
    const { container } = render(
      <AboutSection id="core-values" background="muted" heading="Our Core Values" line="Sub">
        <p>body</p>
      </AboutSection>,
    );
    const section = container.querySelector("section#core-values");
    expect(section).not.toBeNull();
    expect(section?.getAttribute("aria-labelledby")).toBe("core-values-heading");
    expect(section?.getAttribute("data-background")).toBe("muted");
    expect(section?.className).toContain("anchor-section");
    const h2 = container.querySelector("h2#core-values-heading");
    expect(h2?.textContent).toBe("Our Core Values");
  });

  it("uses the light heading on the navy band", () => {
    const { container } = render(
      <AboutSection id="vision-mission" background="navy" heading="H">
        <p>x</p>
      </AboutSection>,
    );
    expect(container.querySelector("section")?.className).toContain("bg-primary");
    expect(container.querySelector("h2")?.className).toContain("text-white");
  });
});
