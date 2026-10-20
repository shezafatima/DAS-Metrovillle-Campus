import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClassesChecklist } from "./classes-checklist";

const LEVELS = [
  { id: "l1", name: "Playgroup" },
  { id: "l2", name: "Nursery" },
  { id: "l3", name: "Class 1" },
];
const item = (id: string, name: string, levelId = "") => ({ id, name, levelId });

function setup(classes: ReturnType<typeof item>[], { levels = LEVELS, readOnly = false } = {}) {
  const onChange = vi.fn();
  const clearError = vi.fn();
  render(<ClassesChecklist value={{ classes }} onChange={onChange} errors={{}} clearError={clearError} readOnly={readOnly} extra={{ levels }} />);
  const lastClasses = () => (onChange.mock.calls.at(-1)![0] as { classes: ReturnType<typeof item>[] }).classes;
  return { onChange, clearError, lastClasses };
}

describe("ClassesChecklist (014b)", () => {
  it("shows one checkbox per class level, in Class Levels order, checked when ticked", () => {
    setup([item("i1", "Class 1", "l3"), item("i2", "Playgroup", "l1")]);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.map((box) => box.parentElement!.textContent)).toEqual(["Playgroup", "Nursery", "Class 1"]);
    expect(boxes.map((box) => (box as HTMLInputElement).checked)).toEqual([true, false, true]);
  });

  it("ticking adds an item that points at the level, with its name", () => {
    const { lastClasses, clearError } = setup([]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Nursery" }));
    expect(lastClasses()).toHaveLength(1);
    expect(lastClasses()[0]).toMatchObject({ name: "Nursery", levelId: "l2" });
    expect(lastClasses()[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(clearError).toHaveBeenCalledWith("classes");
  });

  it("unticking removes the item for that level and keeps the others", () => {
    const { lastClasses } = setup([item("i1", "Playgroup", "l1"), item("i2", "Nursery", "l2"), item("i3", "Grade 9")]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Nursery" }));
    expect(lastClasses().map((entry) => entry.name)).toEqual(["Playgroup", "Grade 9"]);
  });

  it("lists names that are not linked, with a Link to select (only unticked levels) and Remove", () => {
    setup([item("i1", "Playgroup", "l1"), item("i2", "Grade 9")]);
    const section = screen.getByTestId("not-linked");
    expect(within(section).getByText("Grade 9")).toBeInTheDocument();
    const select = within(section).getByLabelText("Link Grade 9 to a class level");
    expect(Array.from(select.querySelectorAll("option")).map((option) => option.textContent)).toEqual(["Link to…", "Nursery", "Class 1"]);
    expect(within(section).getByRole("button", { name: "Remove Grade 9" })).toBeInTheDocument();
  });

  it("linking replaces the item's level and name, keeping its place", () => {
    const { lastClasses } = setup([item("i1", "grade one"), item("i2", "Grade 9")]);
    fireEvent.change(screen.getByLabelText("Link grade one to a class level"), { target: { value: "l3" } });
    expect(lastClasses()).toEqual([
      { id: "i1", name: "Class 1", levelId: "l3" },
      { id: "i2", name: "Grade 9", levelId: "" },
    ]);
  });

  it("removing a not-linked name removes that item only", () => {
    const { lastClasses } = setup([item("i1", "Grade 9"), item("i2", "Grade 10")]);
    fireEvent.click(screen.getByRole("button", { name: "Remove Grade 9" }));
    expect(lastClasses().map((entry) => entry.name)).toEqual(["Grade 10"]);
  });

  it("has no not-linked section when every item is ticked", () => {
    setup([item("i1", "Playgroup", "l1")]);
    expect(screen.queryByTestId("not-linked")).toBeNull();
  });

  it("warns, naming it, about a ticked level that was removed, and does not count it as ticked", () => {
    setup([item("i1", "Playgroup", "l1"), item("i2", "Class 9", "gone")]);
    const warning = screen.getByTestId("removed-levels-warning");
    expect(warning).toHaveTextContent('"Class 9" was removed from Class levels');
    expect(screen.getAllByRole("checkbox").map((box) => (box as HTMLInputElement).checked)).toEqual([true, false, false]);
  });

  it("names several removed levels", () => {
    setup([item("i1", "Class 8", "x"), item("i2", "Class 9", "y")]);
    expect(screen.getByTestId("removed-levels-warning")).toHaveTextContent('"Class 8", "Class 9" were removed');
  });

  it("Clear this warning drops the removed items and keeps the rest", () => {
    const { lastClasses } = setup([item("i1", "Playgroup", "l1"), item("i2", "Class 9", "gone"), item("i3", "Grade 9")]);
    fireEvent.click(screen.getByRole("button", { name: "Clear this warning" }));
    expect(lastClasses().map((entry) => entry.name)).toEqual(["Playgroup", "Grade 9"]);
  });

  it("without any class levels it points to the Class levels panel and offers no checkboxes", () => {
    setup([], { levels: [] });
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByTestId("no-levels")).toHaveTextContent("There are no class levels yet");
    expect(screen.getByRole("link", { name: "Go to Class levels" })).toHaveAttribute("href", "#class-levels");
  });

  it("read-only: every control is disabled", () => {
    setup([item("i1", "Playgroup", "l1"), item("i2", "Grade 9"), item("i3", "Class 9", "gone")], { readOnly: true });
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeDisabled();
    expect(screen.getByLabelText("Link Grade 9 to a class level")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove Grade 9" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear this warning" })).toBeDisabled();
  });

  it("shows a list error from the server", () => {
    const onChange = vi.fn();
    render(<ClassesChecklist value={{ classes: [] }} onChange={onChange} errors={{ classes: "Too many." }} clearError={() => undefined} readOnly={false} extra={{ levels: LEVELS }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Too many.");
  });
});
