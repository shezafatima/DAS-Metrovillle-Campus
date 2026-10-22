import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { admissionPage } from "@/content/admission";
import { ClassLevelsSection } from "./class-levels-section";

const levels = [
  { id: "a", name: "Playgroup", ageRule: "2½ to 3½ years" },
  { id: "b", name: "Class 1", ageRule: "5½ to 6½ years" },
];

function renderSection(overrides: Partial<React.ComponentProps<typeof ClassLevelsSection>> = {}) {
  return render(<ClassLevelsSection heading="Class Levels" ageHeader="31 July" levels={levels} copy={admissionPage.classLevels} {...overrides} />);
}

describe("ClassLevelsSection (014b)", () => {
  it("is the #class-levels section with the section label as its h2", () => {
    const { container } = renderSection();
    expect(container.querySelector("section#class-levels")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Class Levels" })).toBeInTheDocument();
  });

  it("has a table with column headers, the age column naming the reference date, and one row per level", () => {
    renderSection();
    const table = screen.getByTestId("class-levels-table").querySelector("table")!;
    const headers = within(table).getAllByRole("columnheader", { hidden: true });
    expect(headers.map((th) => th.textContent)).toEqual(["Class level", "Age on 31 July"]);
    for (const th of headers) expect(th).toHaveAttribute("scope", "col");
    const rows = within(table).getAllByRole("row", { hidden: true }).slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell", { hidden: true }).map((cell) => cell.textContent))).toEqual([
      ["Playgroup", "2½ to 3½ years"],
      ["Class 1", "5½ to 6½ years"],
    ]);
    expect(table.querySelector("caption")).toHaveTextContent("Class levels and the age a child must be");
  });

  it("changes the age header with the reference date", () => {
    renderSection({ ageHeader: "1 April" });
    expect(screen.getAllByText("Age on 1 April").length).toBeGreaterThan(0);
    expect(screen.queryByText("Age on 31 July")).not.toBeInTheDocument();
  });

  it("shows the table from tablet width and the stacked list below it, never both", () => {
    renderSection();
    expect(screen.getByTestId("class-levels-table")).toHaveClass("hidden", "md:block");
    expect(screen.getByTestId("class-levels-list")).toHaveClass("md:hidden");
  });

  it("the phone list shows each level as a label/value pair per field", () => {
    renderSection();
    const items = within(screen.getByTestId("class-levels-list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Class level").nextElementSibling).toHaveTextContent("Playgroup");
    expect(within(items[0]).getByText("Age on 31 July").nextElementSibling).toHaveTextContent("2½ to 3½ years");
  });

  it("shows markup typed into a name as plain text", () => {
    renderSection({ levels: [{ id: "x", name: "<b>Bold</b>", ageRule: "<script>alert(1)</script>" }] });
    expect(screen.getAllByText("<b>Bold</b>").length).toBeGreaterThan(0);
    expect(document.querySelector("script")).toBeNull();
  });
});
