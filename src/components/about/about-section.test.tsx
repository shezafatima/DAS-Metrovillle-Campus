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

  it("puts the heading and children beside a second column, with `below` full width after the row", () => {
    const { container } = render(
      <AboutSection
        id="mobile-apps"
        background="muted"
        heading="Apps"
        beside={<figure data-testid="side">flyer</figure>}
        below={<ul data-testid="below" />}
      >
        <p data-testid="child">body</p>
      </AboutSection>,
    );
    const main = container.querySelector('[data-testid="about-section-main"]');
    const beside = container.querySelector('[data-testid="about-section-beside"]');
    expect(main?.querySelector("h2#mobile-apps-heading")).not.toBeNull();
    expect(main?.querySelector('[data-testid="child"]')).not.toBeNull();
    expect(beside?.querySelector('[data-testid="side"]')).not.toBeNull();
    expect(main?.contains(beside as Node)).toBe(false);
    const row = main?.parentElement as HTMLElement;
    const below = container.querySelector('[data-testid="below"]') as HTMLElement;
    expect(row.contains(below)).toBe(false);
    expect(row.compareDocumentPosition(below) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders `below` after the children when there is no `beside`", () => {
    const { container } = render(
      <AboutSection id="x" background="surface" heading="H" below={<ul data-testid="below" />}>
        <p data-testid="child">body</p>
      </AboutSection>,
    );
    expect(container.querySelector('[data-testid="about-section-main"]')).toBeNull();
    const child = container.querySelector('[data-testid="child"]') as HTMLElement;
    const below = container.querySelector('[data-testid="below"]') as HTMLElement;
    expect(child.compareDocumentPosition(below) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
