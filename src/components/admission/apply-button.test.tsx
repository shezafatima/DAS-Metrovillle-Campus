import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApplyButton } from "./apply-button";

describe("ApplyButton (020 US6)", () => {
  it("is one link to the registration page in the primary button style", () => {
    render(<ApplyButton label="Apply Now" href="/admission/register" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Apply Now");
    expect(links[0]).toHaveAttribute("href", "/admission/register");
    expect(links[0].className).toContain("bg-cta-hover");
  });
});
