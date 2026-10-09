import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";

function Fixture() {
  return (
    <div>
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <p>Panel content</p>
        </PopoverContent>
      </Popover>
      <button type="button">Outside</button>
    </div>
  );
}

describe("Popover", () => {
  it("opens on trigger click", async () => {
    render(<Fixture />);
    expect(screen.queryByText("Panel content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByText("Panel content")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<Fixture />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByText("Panel content");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Panel content")).not.toBeInTheDocument());
  });

  it("closes on an outside click", async () => {
    render(<Fixture />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByText("Panel content");

    const outside = screen.getByRole("button", { name: "Outside" });
    fireEvent.pointerDown(outside);
    fireEvent.mouseDown(outside);
    fireEvent.pointerUp(outside);
    fireEvent.mouseUp(outside);
    fireEvent.click(outside);
    await waitFor(() => expect(screen.queryByText("Panel content")).not.toBeInTheDocument());
  });
});
