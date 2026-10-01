import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./footer";
import { contactInfo, footerContent, type ContactInfo } from "@/content/site-shell";

// The reference bottom bar has no copyright year ("© Dar-e-Arqam Schools |
// All Rights Reserved | Crafted Excellence with ❤ by softLINKS", confirmed
// directly by the user against the live site and by
// research/tokens/home-1440.json's footerBottomBar sample), so this footer
// intentionally shows none.
describe("Footer", () => {
  it("links the brand name to the home page", () => {
    render(<Footer contact={contactInfo} />);
    expect(
      screen.getByRole("link", { name: footerContent.bottomText })
    ).toHaveAttribute("href", "/");
  });

  it("renders the configured social links", () => {
    render(<Footer contact={contactInfo} />);
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
  });

  it("shows exactly the social links it is given: a cleared platform has no icon (005 FR-011)", () => {
    const contact: ContactInfo = { ...contactInfo, social: { facebook: "https://fb.example/x", youtube: "https://yt.example/y" } };
    render(<Footer contact={contact} />);
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", "https://fb.example/x");
    expect(screen.getByRole("link", { name: "YouTube" })).toHaveAttribute("href", "https://yt.example/y");
    expect(screen.queryByRole("link", { name: "TikTok" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Instagram" })).not.toBeInTheDocument();
  });

  it("keeps the icon order fixed whatever order the values arrive in", () => {
    const contact: ContactInfo = {
      ...contactInfo,
      social: { tiktok: "https://t.example", facebook: "https://f.example", youtube: "https://y.example", instagram: "https://i.example" },
    };
    render(<Footer contact={contact} />);
    const names = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("aria-label") ?? link.textContent ?? "")
      .filter((name) => ["Facebook", "YouTube", "Instagram", "TikTok"].includes(name));
    expect(names).toEqual(["Facebook", "YouTube", "Instagram", "TikTok"]);
  });
});
