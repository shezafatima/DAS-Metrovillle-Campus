import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { homeContent } from "@/content/home";
import { CareersCta } from "./careers-cta";

describe("CareersCta (006 US4)", () => {
  it("uses the signup band's heading and line, with Join Now to /careers instead of the form", () => {
    const { container } = render(<CareersCta />);
    expect(screen.getByRole("heading", { name: /Join Over 300,000 Students/ })).toBeInTheDocument();
    expect(screen.getByText(homeContent.careersCta.supporting.text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join Now" })).toHaveAttribute("href", "/careers");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(container.querySelector("section")).toHaveAttribute("id", "signup");
  });

  it("shows the career banner picture behind the text, as a decorative image", () => {
    const { container } = render(<CareersCta />);
    const picture = container.querySelector("section img");
    expect(picture).not.toBeNull();
    expect(decodeURIComponent(picture!.getAttribute("src") ?? "")).toContain("/images/home/carrer.jpg");
    expect(picture).toHaveAttribute("alt", ""); // decorative: the heading carries the meaning
    // The text sits in a layer above the picture.
    expect(screen.getByRole("link", { name: "Join Now" }).closest("div")?.className).toContain("relative");
  });
});
