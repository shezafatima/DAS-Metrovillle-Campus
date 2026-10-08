import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { homeContent } from "@/content/home";
import { SalientRing } from "./salient-ring";

const { items, logo } = homeContent.salientFeatures;

describe("SalientRing", () => {
  it("is a list of the four features in order, each heading an h3, with icon and heading only", () => {
    render(<SalientRing labelledBy="x" items={items} logo={logo} />);
    const list = screen.getAllByRole("listitem");
    expect(list).toHaveLength(4);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(items.map((i) => i.title));
    for (const li of list) expect(li.querySelector("p")).toBeNull(); // no description text
  });

  it("marks the school logo as decorative", () => {
    const { container } = render(<SalientRing labelledBy="x" items={items} logo={logo} />);
    expect(container.querySelector("img.salient-logo")).toHaveAttribute("alt", "");
  });

  it("pauses while the pointer is over it, while focus is inside it and while the tab is hidden", () => {
    render(<SalientRing labelledBy="x" items={items} logo={logo} />);
    const ring = screen.getByTestId("salient-ring");
    expect(ring).toHaveAttribute("data-paused", "false");
    fireEvent.pointerEnter(ring, { pointerType: "mouse" });
    expect(ring).toHaveAttribute("data-paused", "true");
    fireEvent.pointerLeave(ring, { pointerType: "mouse" });
    expect(ring).toHaveAttribute("data-paused", "false");
    fireEvent.focus(ring);
    expect(ring).toHaveAttribute("data-paused", "true");
    fireEvent.blur(ring);
    expect(ring).toHaveAttribute("data-paused", "false");
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(ring).toHaveAttribute("data-paused", "true");
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("places the items 90 degrees apart", () => {
    render(<SalientRing labelledBy="x" items={items} logo={logo} />);
    expect(screen.getAllByTestId("salient-item").map((li) => li.style.getPropertyValue("--a"))).toEqual(["0deg", "90deg", "180deg", "270deg"]);
  });
});
