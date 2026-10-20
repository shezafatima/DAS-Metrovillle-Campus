import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Paragraphs } from "./paragraphs";

describe("Paragraphs", () => {
  it("renders one p per paragraph, text unchanged", () => {
    const text = 'First "quoted" one.\n\nSecond — two.\n\nThird.';
    const { container } = render(<Paragraphs text={text} />);
    const ps = container.querySelectorAll("p");
    expect(ps).toHaveLength(3);
    expect(ps[0].textContent).toBe('First "quoted" one.');
    expect(ps[1].textContent).toBe("Second — two.");
  });
});
