import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorSummary } from "./error-summary";

afterEach(cleanup);

const ITEMS = [
  { field: "name", targetId: "f-name", message: "Enter your name." },
  { field: "email", targetId: "f-email", message: "Enter a valid email." },
];

function Harness({ signal, items = ITEMS }: { signal: number; items?: typeof ITEMS }) {
  return (
    <>
      <ErrorSummary items={items} focusSignal={signal} />
      <input id="f-name" aria-label="Name" />
      <input id="f-email" aria-label="Email" />
    </>
  );
}

describe("ErrorSummary", () => {
  it("renders nothing for no problems", () => {
    const { container } = render(<ErrorSummary items={[]} focusSignal={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is a named section listing each problem as a link to its field, in the order given", () => {
    render(<Harness signal={0} />);
    const summary = screen.getByTestId("error-summary");
    expect(summary).toHaveAccessibleName("Please fix the following");
    expect(summary).not.toHaveAttribute("role", "alert");
    const links = within(summary).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["Enter your name.", "Enter a valid email."]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["#f-name", "#f-email"]);
  });

  it("takes focus when the signal changes from zero, but not on first render with signal 0", () => {
    const { rerender } = render(<Harness signal={0} />);
    expect(screen.getByTestId("error-summary")).not.toHaveFocus();
    rerender(<Harness signal={1} />);
    expect(screen.getByTestId("error-summary")).toHaveFocus();
  });

  it("does not steal focus again while the list changes with the same signal", () => {
    const { rerender } = render(<Harness signal={1} />);
    screen.getByLabelText("Name").focus();
    rerender(<Harness signal={1} items={[ITEMS[1]]} />);
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("moves focus to the field when a link is clicked", () => {
    render(<Harness signal={1} />);
    fireEvent.click(screen.getByRole("link", { name: "Enter a valid email." }));
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });
});
