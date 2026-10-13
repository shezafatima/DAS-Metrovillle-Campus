import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mobileAppsCopy } from "@/content/resources/mobile-apps";
import type { MobileApp } from "@/lib/resources/schema";
import { AppCard } from "./app-card";

const DRIVE = "https://drive.google.com/file/d/15V_ogaFhGTmkaMHTggAcIFiLDDHevpxy/view?usp=sharing";
const english: MobileApp = { id: "scarlet-english", name: "Scarlet English", icon: "book-a", linkType: "direct-download", url: DRIVE };

const renderCard = (app: MobileApp) => render(<ul><AppCard app={app} copy={mobileAppsCopy} /></ul>);

describe("AppCard", () => {
  it("an available direct download has the button, the note and the accessible name", () => {
    const { container } = renderCard(english);
    const li = container.querySelector("li");
    expect(li?.getAttribute("data-testid")).toBe("app-card");
    expect(li?.getAttribute("data-app-id")).toBe("scarlet-english");
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Scarlet English");
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    const link = links[0];
    expect(link.getAttribute("href")).toBe(DRIVE);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.textContent).toContain("Download for Android");
    expect(link.getAttribute("aria-describedby")).toBe("scarlet-english-note");
    expect(container.querySelector("p#scarlet-english-note")?.textContent).toBe("Installs from outside the Play Store");
    expect(screen.getByRole("link", { name: "Download for Android: Scarlet English (opens in a new tab)" })).toBe(link);
    expect(container.querySelector("svg")?.closest("span")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("a Play Store app has its label and no note", () => {
    const { container } = renderCard({
      id: "lms-app",
      name: "LMS App",
      icon: "monitor-smartphone",
      linkType: "play-store",
      url: "https://play.google.com/store/apps/details?id=com.darearqam.daslms",
    });
    const link = screen.getByRole("link");
    expect(link.textContent).toContain("Get it on Google Play");
    expect(link.getAttribute("aria-describedby")).toBeNull();
    expect(container.querySelector("#lms-app-note")).toBeNull();
  });

  it("an App Store app has its label", () => {
    renderCard({ id: "x", name: "X", icon: "smartphone", linkType: "app-store", url: "https://apps.apple.com/pk/app/x/id1" });
    expect(screen.getByRole("link").textContent).toContain("Download on the App Store");
  });

  it("an unavailable app has no link at all, only the muted note", () => {
    const { container } = renderCard({ ...english, id: "scarlet-math", name: "Scarlet Math", url: "" });
    expect(container.querySelector("a")).toBeNull();
    const note = screen.getByText("Not available at the moment");
    expect(note.tagName).toBe("P");
    expect(note.className).toContain("text-text-muted");
  });

  it("shows a label only when there is one", () => {
    renderCard({ ...english, label: "For Playgroup" });
    expect(screen.getByText("For Playgroup")).toBeTruthy();
    const { container } = renderCard(english);
    expect(container.textContent).not.toContain("For Playgroup");
  });

  it("uses only motion-safe transitions", () => {
    const { container } = renderCard(english);
    const classes = [container.querySelector("li")!.className, container.querySelector("a")!.className].join(" ").split(/\s+/);
    for (const c of classes) {
      if (/(^|:)(transition|duration)/.test(c)) expect(c.startsWith("motion-safe:"), c).toBe(true);
      expect(c.includes("transition-[")).toBe(false);
    }
    expect(classes).not.toContain("transition");
  });
});
