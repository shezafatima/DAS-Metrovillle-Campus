import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonPhoto } from "./person-photo";

describe("PersonPhoto", () => {
  it("uses the person's name as alt for a real photo", () => {
    const { container } = render(
      <PersonPhoto photo={{ url: "/x.jpg", publicId: "x", width: 80, height: 100 }} name="Faiza Zeeshan" />,
    );
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("Faiza Zeeshan");
    expect(container.firstElementChild?.className).toContain("aspect-about-person");
  });

  it("draws an aria-hidden placeholder with no img when there is no photo", () => {
    const { container } = render(<PersonPhoto photo={null} name="Name" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(container.firstElementChild?.className).toContain("aspect-about-person");
  });
});
