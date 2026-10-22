import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { schoolApp } from "@/content/resources";
import { QrCode } from "./qr-code";
import { SchoolAppSection } from "./school-app-section";

describe("SchoolAppSection", () => {
  it("shows the eyebrow, heading, line and the four features with decorative icons", () => {
    const { container } = render(<SchoolAppSection />);
    const section = container.querySelector("section#mobile-apps")!;
    expect(section).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Dar-e-Arqam LMS" })).toBeInTheDocument();
    expect(screen.getByText("Our School App")).toBeInTheDocument();
    expect(screen.getByText("Stay connected with your child's learning.")).toBeInTheDocument();
    const items = within(section.querySelector("ul")!).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["Attendance & results", "Fee status", "School announcements", "Islamic studies resources"]);
    for (const li of items) expect(li.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  });

  it("has two buttons that open the Play Store and the web login in a new tab, safely, and say so", () => {
    render(<SchoolAppSection />);
    const play = screen.getByRole("link", { name: /Get it on Google Play/ });
    const web = screen.getByRole("link", { name: /Login on web/ });
    expect(play).toHaveAttribute("href", schoolApp.android.href);
    expect(web).toHaveAttribute("href", "https://kamboh.net/admin/pwv_login.php");
    for (const link of [play, web]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.textContent).toContain("(opens external site in a new tab)");
    }
    expect(screen.getByText("Using an iPhone? Use the web login.")).toBeInTheDocument();
  });

  it("draws the phone around the screenshot and shows the QR with its name and caption (hidden below 1024px by CSS)", () => {
    const { container } = render(<SchoolAppSection />);
    expect(screen.getByTestId("phone-mockup").querySelector("img")).not.toBeNull();
    const qr = screen.getByRole("img", { name: "QR code to download Dar-e-Arqam LMS on Google Play" });
    expect(qr.tagName.toLowerCase()).toBe("svg");
    const figure = container.querySelector("[data-testid='app-qr']")!;
    expect(figure.className).toMatch(/\bhidden\b.*\blg:flex\b/);
    expect(within(figure as HTMLElement).getByText("Scan to download")).toBeInTheDocument();
  });
});

describe("QrCode", () => {
  /** Rasterises the rendered SVG (white, quiet zone included) so a real decoder can read it. */
  function decode(url: string): string | null {
    const svg = renderToStaticMarkup(<QrCode value={url} label="x" />);
    const box = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)![1]);
    const scale = 8;
    const size = box * scale;
    const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
    for (const [, x, y] of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const at = ((Number(y) * scale + dy) * size + Number(x) * scale + dx) * 4;
          pixels[at] = 0x12;
          pixels[at + 1] = 0x12;
          pixels[at + 2] = 0x91;
        }
      }
    }
    return jsQR(pixels, size, size)?.data ?? null;
  }

  it("decodes to the Google Play URL", () => {
    expect(decode(schoolApp.android.href)).toBe(schoolApp.android.href);
  });

  it("is navy on white with a 4-module quiet zone and no external requests", () => {
    const svg = renderToStaticMarkup(<QrCode value={schoolApp.android.href} label="x" />);
    expect(svg).toContain('fill="#fff"');
    expect(svg).toContain("var(--color-primary)");
    expect(svg).not.toMatch(/<image|href="http|src="/);
    const coords = [...svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const box = Number(/viewBox="0 0 (\d+) \d+"/.exec(svg)![1]);
    expect(Math.min(...coords.flat())).toBe(4);
    expect(Math.max(...coords.flat())).toBe(box - 5);
  });
});
