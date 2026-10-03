import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopBar } from "./top-bar";
import type { ContactInfo, PortalLink } from "@/content/site-shell";

const baseContact: ContactInfo = {
  phone: "+92-42-1234567",
  email: "info@example.com",
  address: "123 Example Street",
  social: {},
};

const portalLinks: PortalLink[] = [
  { label: "DAS Portal", href: "/portal/das-portal" },
  { label: "Student Login", href: "/portal/student-login" },
];

describe("TopBar", () => {
  it("renders every configured portal link", () => {
    render(<TopBar portalLinks={portalLinks} contact={baseContact} />);
    expect(screen.getByRole("link", { name: "DAS Portal" })).toHaveAttribute(
      "href",
      "/portal/das-portal"
    );
    expect(
      screen.getByRole("link", { name: "Student Login" })
    ).toHaveAttribute("href", "/portal/student-login");
  });

  it("shows Careers as the first default link, pointing at /careers (012)", () => {
    render(<TopBar contact={baseContact} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("Careers");
    expect(links[0]).toHaveAttribute("href", "/careers");
  });

  it("omits a social platform entirely when it has no configured value", () => {
    render(<TopBar portalLinks={portalLinks} contact={baseContact} />);
    expect(screen.queryByText("Facebook")).not.toBeInTheDocument();
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
  });

  it("renders only the configured social links, opening in a new tab", () => {
    render(
      <TopBar
        portalLinks={portalLinks}
        contact={{
          ...baseContact,
          social: { facebook: "https://facebook.com/example" },
        }}
      />
    );
    const facebookLink = screen.getByRole("link", { name: "Facebook" });
    expect(facebookLink).toHaveAttribute("href", "https://facebook.com/example");
    expect(facebookLink).toHaveAttribute("target", "_blank");
    expect(facebookLink).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
  });

  it("does not render phone, email or address (contact details live in the footer only)", () => {
    render(<TopBar portalLinks={portalLinks} contact={baseContact} />);
    expect(screen.queryByText(baseContact.phone)).not.toBeInTheDocument();
    expect(screen.queryByText(baseContact.email)).not.toBeInTheDocument();
  });
});
