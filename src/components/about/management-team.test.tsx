import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { teamPlaceholders } from "@/content/about";
import { ManagementTeamSection } from "./management-team";

const placeholders = teamPlaceholders.map((m) => ({ ...m, placeholder: true }));
const real = [{ id: "a-b", name: "Ali Khan", designation: "Head", description: "Leads.", photo: null, placeholder: false }];

describe("ManagementTeamSection", () => {
  it("labels placeholder cards and hides their silhouette", () => {
    const { container } = render(
      <ManagementTeamSection heading="Our Management Team" cards={placeholders} background="surface" />,
    );
    const cards = container.querySelectorAll('li[data-placeholder="true"]');
    expect(cards).toHaveLength(3);
    cards.forEach((c) => {
      expect(c.textContent).toContain("Placeholder");
      expect(c.textContent).toContain("Name");
      expect(c.textContent).toContain("Designation");
      expect(c.textContent).toContain("Short description");
      expect(c.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });
  });

  it("renders real members with name, designation, description and photo alt = name", () => {
    const withPhoto = [{ ...real[0], photo: { url: "/p.jpg", publicId: "p", width: 80, height: 100 } }];
    const { container } = render(<ManagementTeamSection heading="T" cards={withPhoto} background="surface" />);
    expect(container.querySelector("h3")?.textContent).toBe("Ali Khan");
    expect(container.textContent).toContain("Head");
    expect(container.textContent).toContain("Leads.");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("Ali Khan");
    expect(container.querySelector("[data-placeholder]")).toBeNull();
  });

  it("marks Urdu names and designations lang=ur dir=rtl", () => {
    const urdu = [{ ...real[0], name: "علی خان", designation: "پرنسپل" }];
    const { container } = render(<ManagementTeamSection heading="T" cards={urdu} background="surface" />);
    expect(container.querySelector("h3")?.getAttribute("dir")).toBe("rtl");
    expect(container.querySelector("li p")?.getAttribute("lang")).toBe("ur");
  });

  it("uses 1 / 2 / 3 / 4 columns", () => {
    const { container } = render(<ManagementTeamSection heading="T" cards={real} background="surface" />);
    expect(container.querySelector("ul")?.className).toMatch(/grid-cols-1.*md:grid-cols-2.*lg:grid-cols-3.*xl:grid-cols-4/);
  });
});
