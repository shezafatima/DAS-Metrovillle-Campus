import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProgressBar, ProgressList, completeText, type ProgressSection } from "./registration-progress";

afterEach(cleanup);

const SECTIONS: ProgressSection[] = [
  { id: "s1", title: "Student", optional: false, done: true },
  { id: "s2", title: "Parents", optional: false, done: false },
  { id: "s3", title: "Contact & address", optional: false, done: false },
  { id: "s4", title: "Health", optional: false, done: true },
  { id: "s5", title: "Reference", optional: true, done: true },
  { id: "s6", title: "Remarks", optional: true, done: false },
];

describe("completeText", () => {
  it("counts required sections only (an optional section that is done does not add to it)", () => {
    expect(completeText(SECTIONS)).toBe("2 of 4 sections complete");
  });
});

describe("ProgressList", () => {
  it("shows each section with its status, marks Optional, links to the card, and flags the current one", () => {
    render(<ProgressList sections={SECTIONS} current={1} />);
    const nav = screen.getByRole("navigation", { name: "Registration progress" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["#s1", "#s2", "#s3", "#s4", "#s5", "#s6"]);
    expect(links.map((a) => a.getAttribute("data-status"))).toEqual(["done", "current", "todo", "done", "done", "todo"]);
    expect(links[1]).toHaveAttribute("aria-current", "step");
    expect(links.filter((a) => a.getAttribute("aria-current") === "step")).toHaveLength(1);
    expect(within(nav).getAllByText("Optional")).toHaveLength(2);
    expect(links[0]).toHaveTextContent("complete");
    expect(links[1]).toHaveTextContent("current section");
    expect(links[2]).toHaveTextContent("not started");
  });

  it("is only for wide screens (hidden below 1024px by CSS)", () => {
    render(<ProgressList sections={SECTIONS} current={0} />);
    expect(screen.getByRole("navigation", { name: "Registration progress" }).className).toMatch(/\bhidden\b.*\blg:block\b/);
  });
});

describe("ProgressBar", () => {
  it("reads Section N of 6 and the title, with a matching progressbar", () => {
    render(<ProgressBar sections={SECTIONS} current={1} visible />);
    const bar = screen.getByTestId("progress-bar");
    expect(bar).toHaveTextContent("Section 2 of 6 · Parents");
    const meter = within(bar).getByRole("progressbar");
    expect(meter).toHaveAttribute("aria-valuenow", "2");
    expect(meter).toHaveAttribute("aria-valuemax", "6");
    expect(meter).toHaveAttribute("aria-valuetext", "Section 2 of 6 · Parents");
  });

  it("is hidden when the form is off screen and from 1024px up", () => {
    const { rerender } = render(<ProgressBar sections={SECTIONS} current={0} visible />);
    expect(screen.getByTestId("progress-bar").className).toContain("lg:hidden");
    expect(screen.getByTestId("progress-bar")).not.toHaveAttribute("hidden");
    rerender(<ProgressBar sections={SECTIONS} current={0} visible={false} />);
    expect(screen.getByTestId("progress-bar")).toHaveAttribute("hidden");
  });
});
