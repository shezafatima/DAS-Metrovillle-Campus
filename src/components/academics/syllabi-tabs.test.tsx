import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syllabiCopy } from "@/content/academics/dynamic-sections";
import { SyllabiTabs } from "./syllabi-tabs";

const levels = [
  { id: "1", name: "Play Group", slug: "play-group" },
  { id: "2", name: "Nursery", slug: "nursery" },
  { id: "3", name: "Class 4", slug: "class-4" },
  { id: "4", name: "Class 5", slug: "class-5" },
];

function renderTabs() {
  return render(
    <section id="syllabi">
      <SyllabiTabs levels={levels} panels={levels.map((level) => <p key={level.id}>{`Content of ${level.name}`}</p>)} copy={syllabiCopy} />
    </section>,
  );
}

const tab = (name: string) => screen.getByRole("tab", { name, hidden: true });
const panelOf = (name: string) => document.getElementById(`syllabi-${levels.find((l) => l.name === name)!.slug}-panel`)!;

beforeEach(() => {
  window.history.replaceState(null, "", "/academics");
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("SyllabiTabs (014b)", () => {
  it("has a tablist of one tab per level, the first selected, with roving tabindex and linked panels", () => {
    renderTabs();
    const list = screen.getByRole("tablist", { hidden: true });
    expect(list).toHaveAttribute("aria-label", "Class");
    const tabs = screen.getAllByRole("tab", { hidden: true });
    expect(tabs.map((t) => t.textContent)).toEqual(levels.map((l) => l.name));
    expect(tabs.map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false", "false", "false"]);
    expect(tabs.map((t) => t.getAttribute("tabindex"))).toEqual(["0", "-1", "-1", "-1"]);
    expect(tab("Nursery")).toHaveAttribute("aria-controls", "syllabi-nursery-panel");
    expect(panelOf("Nursery")).toHaveAttribute("aria-labelledby", "syllabi-nursery-tab");
    expect(panelOf("Nursery")).toHaveAttribute("role", "tabpanel");
  });

  it("shows only the selected level's panel; the others are hidden but in the page", () => {
    renderTabs();
    expect(panelOf("Play Group").hidden).toBe(false);
    expect(panelOf("Nursery").hidden).toBe(true);
    expect(screen.getByText("Content of Nursery")).toBeInTheDocument();
  });

  it("selecting a tab shows its panel and replaces the address without adding a history entry", () => {
    renderTabs();
    const before = window.history.length;
    fireEvent.click(tab("Class 4"));
    expect(tab("Class 4")).toHaveAttribute("aria-selected", "true");
    expect(panelOf("Class 4").hidden).toBe(false);
    expect(panelOf("Play Group").hidden).toBe(true);
    expect(window.location.hash).toBe("#syllabi-class-4");
    expect(window.history.length).toBe(before);
  });

  describe("keyboard", () => {
    it("ArrowRight and ArrowLeft move to the next and previous tab, select it and focus it, wrapping at the ends", () => {
      renderTabs();
      fireEvent.keyDown(tab("Play Group"), { key: "ArrowRight" });
      expect(tab("Nursery")).toHaveAttribute("aria-selected", "true");
      expect(document.activeElement).toBe(tab("Nursery"));
      fireEvent.keyDown(tab("Nursery"), { key: "ArrowLeft" });
      expect(tab("Play Group")).toHaveAttribute("aria-selected", "true");
      fireEvent.keyDown(tab("Play Group"), { key: "ArrowLeft" });
      expect(tab("Class 5")).toHaveAttribute("aria-selected", "true");
      fireEvent.keyDown(tab("Class 5"), { key: "ArrowRight" });
      expect(tab("Play Group")).toHaveAttribute("aria-selected", "true");
    });

    it("Home and End select the first and the last tab", () => {
      renderTabs();
      fireEvent.keyDown(tab("Play Group"), { key: "End" });
      expect(tab("Class 5")).toHaveAttribute("aria-selected", "true");
      fireEvent.keyDown(tab("Class 5"), { key: "Home" });
      expect(tab("Play Group")).toHaveAttribute("aria-selected", "true");
    });

    it("other keys do nothing", () => {
      renderTabs();
      fireEvent.keyDown(tab("Play Group"), { key: "a" });
      expect(tab("Play Group")).toHaveAttribute("aria-selected", "true");
      expect(window.location.hash).toBe("");
    });
  });

  describe("the address", () => {
    it("#syllabi selects the first level and scrolls the section into view", () => {
      window.history.replaceState(null, "", "/academics#syllabi");
      renderTabs();
      expect(tab("Play Group")).toHaveAttribute("aria-selected", "true");
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it("#syllabi-<slug> selects that level", () => {
      window.history.replaceState(null, "", "/academics#syllabi-class-4");
      renderTabs();
      expect(tab("Class 4")).toHaveAttribute("aria-selected", "true");
      expect(panelOf("Class 4").hidden).toBe(false);
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it("a slug that is not a level selects the first", () => {
      window.history.replaceState(null, "", "/academics#syllabi-class-99");
      renderTabs();
      expect(tab("Play Group")).toHaveAttribute("aria-selected", "true");
    });

    it("a hash that is not about syllabi changes nothing and does not scroll", () => {
      window.history.replaceState(null, "", "/academics#examination");
      renderTabs();
      expect(tab("Play Group")).toHaveAttribute("aria-selected", "true");
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    it("a later hashchange selects the level it names", () => {
      renderTabs();
      act(() => {
        window.history.replaceState(null, "", "/academics#syllabi-nursery");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(tab("Nursery")).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("the level picker (phones)", () => {
    it("is a labelled select with every level, reflecting the selection", () => {
      renderTabs();
      const select = screen.getByLabelText("Choose a class", { selector: "select" }) as HTMLSelectElement;
      expect(Array.from(select.options).map((o) => o.textContent)).toEqual(levels.map((l) => l.name));
      expect(select.value).toBe("0");
      fireEvent.click(tab("Class 5"));
      expect(select.value).toBe("3");
    });

    it("choosing a level shows its panel and replaces the address", () => {
      renderTabs();
      const select = screen.getByLabelText("Choose a class", { selector: "select" });
      fireEvent.change(select, { target: { value: "1" } });
      expect(panelOf("Nursery").hidden).toBe(false);
      expect(window.location.hash).toBe("#syllabi-nursery");
    });

    it("shows the tab row from tablet width and the picker below it", () => {
      renderTabs();
      expect(screen.getByRole("tablist", { hidden: true })).toHaveClass("hidden", "md:flex");
      expect(screen.getByTestId("syllabi-picker")).toHaveClass("md:hidden");
    });
  });
});
