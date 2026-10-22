import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { examinationCopy } from "@/content/academics/dynamic-sections";
import { ExaminationSection } from "./examination-section";

const blocks = [
  { id: "a", heading: "Nursery, Prep", paragraphs: ["All assessments are informal."] },
  { id: "b", heading: "Grade 1–7", paragraphs: ["Formal mid-year examination.", "Term marks reflect progress."] },
];

function renderSection(overrides: Partial<React.ComponentProps<typeof ExaminationSection>> = {}) {
  return render(<ExaminationSection heading="Examination" blocks={blocks} copy={examinationCopy} background="surface" {...overrides} />);
}

describe("ExaminationSection (014b)", () => {
  it("is the #examination section with the section label as its h2", () => {
    const { container } = renderSection();
    expect(container.querySelector("section#examination")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Examination" })).toBeInTheDocument();
  });

  it("shows one card per block, in order, each with an h3 and one paragraph per paragraph", () => {
    renderSection();
    const cards = screen.getAllByTestId("examination-card");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByRole("heading", { level: 3 })).toHaveTextContent("Nursery, Prep");
    expect(within(cards[1]).getByRole("heading", { level: 3 })).toHaveTextContent("Grade 1–7");
    expect(within(cards[1]).getAllByText(/./, { selector: "p" }).map((p) => p.textContent)).toEqual(["Formal mid-year examination.", "Term marks reflect progress."]);
  });

  it("is a one-column grid on phones and two columns from tablet width", () => {
    renderSection();
    const grid = screen.getByTestId("examination-grid");
    expect(grid).toHaveClass("grid", "md:grid-cols-2");
    expect(grid.className).not.toMatch(/(^|\s)grid-cols-/);
  });

  it("names the grid for screen readers", () => {
    renderSection();
    expect(screen.getByRole("list", { name: "Examination policy by class" })).toBeInTheDocument();
  });

  it("shows markup typed into a block as plain text", () => {
    renderSection({ blocks: [{ id: "x", heading: "<i>Heading</i>", paragraphs: ["<script>alert(1)</script>"] }] });
    expect(screen.getByText("<i>Heading</i>")).toBeInTheDocument();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("carries the band it is given", () => {
    const { container } = renderSection({ background: "muted" });
    expect(container.querySelector("section#examination")).toHaveAttribute("data-background", "muted");
  });
});
