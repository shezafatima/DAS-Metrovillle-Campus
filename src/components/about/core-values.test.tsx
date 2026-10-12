import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { coreValues } from "@/content/about";
import { CoreValuesSection } from "./core-values";

describe("CoreValuesSection", () => {
  it("renders the intro and a tile per value", () => {
    const { container } = render(<CoreValuesSection value={coreValues} background="muted" />);
    const items = container.querySelectorAll("ul > li");
    expect(items).toHaveLength(6);
    items.forEach((li, i) => {
      expect(li.querySelector("h3")?.textContent).toBe(coreValues.values[i].name);
      expect(li.textContent).toContain(coreValues.values[i].description);
      expect(li.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    });
    expect(container.textContent).toContain(coreValues.intro);
  });

  it("uses 3 columns for 6 values and 4 for 4 values", () => {
    const six = render(<CoreValuesSection value={coreValues} background="muted" />);
    expect(six.container.querySelector("ul")?.className).toContain("lg:grid-cols-3");
    const four = render(
      <CoreValuesSection value={{ ...coreValues, values: coreValues.values.slice(0, 4) }} background="muted" />,
    );
    expect(four.container.querySelector("ul")?.className).toContain("lg:grid-cols-4");
  });
});
