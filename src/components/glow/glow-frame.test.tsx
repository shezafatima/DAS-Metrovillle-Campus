import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlowFrame } from "./glow-frame";

function setup() {
  const { container } = render(
    <GlowFrame>
      <input aria-label="Name" />
      <input aria-label="Email" />
    </GlowFrame>,
  );
  return container.firstElementChild as HTMLElement;
}

describe("GlowFrame", () => {
  it("renders the halo and ring layers around the content and runs by default", () => {
    const frame = setup();
    expect(frame.querySelectorAll(".about-glow-spin")).toHaveLength(2);
    expect(frame.querySelector(".about-value-card-face")).toContainElement(screen.getByLabelText("Name"));
    expect(frame).toHaveAttribute("data-glow-paused", "false");
  });

  it("pauses while a control has focus, and resumes when focus leaves the frame", () => {
    const frame = setup();
    fireEvent.focus(screen.getByLabelText("Name"));
    expect(frame).toHaveAttribute("data-glow-paused", "true");
    // Moving focus between two fields inside the frame does not resume it.
    fireEvent.blur(screen.getByLabelText("Name"), { relatedTarget: screen.getByLabelText("Email") });
    expect(frame).toHaveAttribute("data-glow-paused", "true");
    fireEvent.blur(screen.getByLabelText("Email"), { relatedTarget: null });
    expect(frame).toHaveAttribute("data-glow-paused", "false");
  });

  it("pauses while the pointer is over it", () => {
    const frame = setup();
    fireEvent.pointerEnter(frame);
    expect(frame).toHaveAttribute("data-glow-paused", "true");
    fireEvent.pointerLeave(frame);
    expect(frame).toHaveAttribute("data-glow-paused", "false");
  });
});
