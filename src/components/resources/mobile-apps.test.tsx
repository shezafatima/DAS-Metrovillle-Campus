import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mobileApps, mobileAppsCopy } from "@/content/resources";
import { MobileAppsSection } from "./mobile-apps";

describe("MobileAppsSection", () => {
  it("renders the anchored muted section with one h2, the body, the flyer and four cards", () => {
    const { container } = render(<MobileAppsSection value={mobileApps} copy={mobileAppsCopy} />);
    const section = container.querySelector("section#mobile-apps");
    expect(section?.getAttribute("aria-labelledby")).toBe("mobile-apps-heading");
    expect(section?.getAttribute("data-background")).toBe("muted");
    expect(section?.className).toContain("anchor-section");
    const h2s = container.querySelectorAll("h2");
    expect(h2s).toHaveLength(1);
    expect(h2s[0].id).toBe("mobile-apps-heading");
    expect(h2s[0].textContent).toBe(mobileApps.heading);
    expect(container.textContent).toContain(mobileApps.body);

    const img = container.querySelector("figure img");
    expect(img?.getAttribute("alt")).toBe(mobileApps.imageAlt);
    expect(decodeURIComponent(img?.getAttribute("src") ?? "")).toContain("/images/resources/");

    const cards = container.querySelectorAll("ul > li[data-testid=app-card]");
    expect([...cards].map((c) => c.getAttribute("data-app-id"))).toEqual(["scarlet-english", "scarlet-math", "scarlet-urdu", "lms-app"]);
  });

  it("gives the flyer frame a size of its own, so it does not depend on the image loading", () => {
    const { container } = render(<MobileAppsSection value={mobileApps} copy={mobileAppsCopy} />);
    const figure = container.querySelector("figure") as HTMLElement;
    expect(figure.style.aspectRatio.replace(/\s/g, "")).toBe("744/1280");
    expect(figure.getAttribute("style")).toContain("--size-resources-flyer-max-h");
  });

  it("renders no figure without an image", () => {
    const { container } = render(<MobileAppsSection value={{ ...mobileApps, image: null, imageAlt: "" }} copy={mobileAppsCopy} />);
    expect(container.querySelector("figure")).toBeNull();
    expect(container.querySelectorAll("li[data-testid=app-card]")).toHaveLength(4);
  });
});
