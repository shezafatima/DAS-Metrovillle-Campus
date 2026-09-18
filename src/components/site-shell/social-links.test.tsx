import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SocialLinks } from "./social-links";

describe("SocialLinks", () => {
  it("renders nothing when no platform is configured", () => {
    const { container } = render(<SocialLinks social={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("omits a platform entirely when it has no configured value", () => {
    render(<SocialLinks social={{ facebook: "https://facebook.com/example" }} />);
    expect(screen.getByRole("link", { name: "Facebook" })).toBeInTheDocument();
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
    expect(screen.queryByText("YouTube")).not.toBeInTheDocument();
    expect(screen.queryByText("TikTok")).not.toBeInTheDocument();
  });

  it("renders every configured platform, opening in a new tab", () => {
    render(
      <SocialLinks
        social={{
          facebook: "https://facebook.com/example",
          youtube: "https://youtube.com/example",
          instagram: "https://instagram.com/example",
          tiktok: "https://tiktok.com/@example",
        }}
      />
    );

    for (const [name, href] of [
      ["Facebook", "https://facebook.com/example"],
      ["YouTube", "https://youtube.com/example"],
      ["Instagram", "https://instagram.com/example"],
      ["TikTok", "https://tiktok.com/@example"],
    ]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });

  it("defaults to the light (white badge) variant", () => {
    render(<SocialLinks social={{ facebook: "https://facebook.com/example" }} />);
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveClass("bg-surface");
  });

  it("switches to the dark (filled badge) variant", () => {
    render(
      <SocialLinks
        social={{ facebook: "https://facebook.com/example" }}
        variant="dark"
      />
    );
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveClass("bg-text");
  });
});
