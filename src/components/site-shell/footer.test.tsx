import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./footer";
import { footerContent } from "@/content/site-shell";

// The reference bottom bar has no copyright year ("© Dar-e-Arqam Schools |
// All Rights Reserved | Crafted Excellence with ❤ by softLINKS", confirmed
// directly by the user against the live site and by
// research/tokens/home-1440.json's footerBottomBar sample), so this footer
// intentionally shows none.
describe("Footer", () => {
  it("links the brand name to the home page", () => {
    render(<Footer />);
    expect(
      screen.getByRole("link", { name: footerContent.bottomText })
    ).toHaveAttribute("href", "/");
  });

  it("renders the configured social links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
  });
});
