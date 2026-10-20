import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Footer } from "./footer";
import { contactInfo, footerContent, type ContactInfo } from "@/content/site-shell";
import type { PublicPortalLink } from "@/lib/settings/public";

const portalLinks: PublicPortalLink[] = [
  { id: "a", label: "DAS Portal", url: "https://portal.example.org/", insecure: false },
  { id: "b", label: "Student Login", url: "http://203.0.113.5/login", insecure: true },
  { id: "c", label: "LMS App", url: "https://lms.example.org/", insecure: false },
];

describe("Footer", () => {
  it("is a white contentinfo landmark with no headings (the page's heading order is untouched)", () => {
    const { container } = render(<Footer contact={contactInfo} />);
    expect(screen.getByRole("contentinfo")).toHaveClass("bg-surface");
    expect(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).toHaveLength(0);
  });

  it("shows the logo and the description (pending client approval)", () => {
    render(<Footer contact={contactInfo} />);
    expect(screen.getByRole("img", { name: footerContent.logo.alt })).toHaveAttribute("src", expect.stringContaining("logo.svg"));
    expect(screen.getByText(footerContent.description)).toBeInTheDocument();
  });

  it("has Quick Links: the main pages and Careers, no Campuses, each group in a named nav", () => {
    render(<Footer contact={contactInfo} />);
    const nav = screen.getByRole("navigation", { name: "Quick Links" });
    expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["Home", "About", "Academics", "Admission", "Resources", "News", "Careers", "Contact"]);
    expect(within(nav).getByRole("link", { name: "Careers" })).toHaveAttribute("href", "/careers");
    expect(within(nav).queryByRole("link", { name: "Campuses" })).not.toBeInTheDocument();
  });

  describe("Portal Links (014b)", () => {
    const gridOf = (container: HTMLElement) => container.querySelector("footer > div")!;

    it("lists the links in order, each opening its external site in a new tab, safely", () => {
      render(<Footer contact={contactInfo} portalLinks={portalLinks} />);
      const nav = screen.getByRole("navigation", { name: "Portal Links" });
      const links = within(nav).getAllByRole("link");
      expect(links.map((a) => a.getAttribute("href"))).toEqual(portalLinks.map((link) => link.url));
      for (const a of links) {
        expect(a).toHaveAttribute("target", "_blank");
        expect(a).toHaveAttribute("rel", "noopener noreferrer");
      }
    });

    it("names each link as opening an external site in a new tab", () => {
      render(<Footer contact={contactInfo} portalLinks={portalLinks} />);
      const nav = screen.getByRole("navigation", { name: "Portal Links" });
      for (const link of portalLinks) {
        expect(within(nav).getByRole("link", { name: `${link.label} (opens external site in a new tab)` })).toHaveAttribute("href", link.url);
      }
    });

    it("has four columns at desktop width when there are links", () => {
      const { container } = render(<Footer contact={contactInfo} portalLinks={portalLinks} />);
      expect(gridOf(container)).toHaveClass("lg:grid-cols-4");
      expect(gridOf(container)).not.toHaveClass("lg:grid-cols-3");
    });

    it("with no links, the whole column and its heading are gone and the other columns reflow to three", () => {
      const { container } = render(<Footer contact={contactInfo} portalLinks={[]} />);
      expect(screen.queryByRole("navigation", { name: "Portal Links" })).not.toBeInTheDocument();
      expect(screen.queryByText("Portal Links")).not.toBeInTheDocument();
      expect(gridOf(container)).toHaveClass("lg:grid-cols-3");
      expect(gridOf(container).children).toHaveLength(3);
    });

    it("without the prop at all it behaves as having no links", () => {
      render(<Footer contact={contactInfo} />);
      expect(screen.queryByRole("navigation", { name: "Portal Links" })).not.toBeInTheDocument();
    });

    it("shows a label that contains markup as plain text", () => {
      render(<Footer contact={contactInfo} portalLinks={[{ id: "x", label: "<b>Portal</b>", url: "https://x.example.org/", insecure: false }]} />);
      expect(screen.getByText("<b>Portal</b>")).toBeInTheDocument();
    });

    it("is the footer landmark with the id the Portal links panel's View on site link targets", () => {
      render(<Footer contact={contactInfo} />);
      expect(screen.getByRole("contentinfo")).toHaveAttribute("id", "site-footer");
    });
  });

  it("shows the contact details from Settings: a tel: link, a mailto: link, the address, the timings, and Get directions", () => {
    const contact: ContactInfo = { ...contactInfo, phone: "+92-42-1112223", email: "hello@example.pk", address: "1 Example Road, Lahore", officeHours: "Mon to Sat, 8am to 2pm" };
    render(<Footer contact={contact} />);
    const group = screen.getByRole("group", { name: "Contact Us" });
    expect(within(group).getByRole("link", { name: "+92-42-1112223" })).toHaveAttribute("href", "tel:+92-42-1112223");
    expect(within(group).getByRole("link", { name: "hello@example.pk" })).toHaveAttribute("href", "mailto:hello@example.pk");
    expect(within(group).getByText("1 Example Road, Lahore")).toBeInTheDocument();
    expect(within(group).getByText("Mon to Sat, 8am to 2pm")).toBeInTheDocument();
    expect(within(group).getByRole("link", { name: "Get directions" })).toHaveAttribute("href", "/contact");
  });

  it("leaves out the timings line when Settings has none", () => {
    render(<Footer contact={{ ...contactInfo, officeHours: undefined }} />);
    expect(screen.queryByText(contactInfo.officeHours ?? "__none__")).not.toBeInTheDocument();
  });

  it("renders the configured social links, each opening in a new tab", () => {
    render(<Footer contact={contactInfo} />);
    const facebook = screen.getByRole("link", { name: "Facebook" });
    expect(facebook).toHaveAttribute("target", "_blank");
    expect(facebook).toHaveAttribute("rel", "noopener noreferrer");
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
    const labels = ["Facebook", "YouTube", "Instagram", "TikTok"];
    const found = screen.getAllByRole("link").filter((a) => labels.includes(a.textContent ?? "")).map((a) => a.textContent);
    expect(found).toEqual(labels);
  });

  it("generates the copyright year (never a fixed one) and keeps the developer credit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-06-15T00:00:00Z"));
    try {
      render(<Footer contact={contactInfo} />);
      expect(screen.getByText("© 2031 Dar-e-Arqam School, Metroville Campus. All rights reserved.")).toBeInTheDocument();
      const credit = screen.getByRole("link", { name: footerContent.credit.name });
      expect(credit).toHaveAttribute("href", footerContent.credit.href);
      expect(credit).toHaveAttribute("rel", "noopener noreferrer");
    } finally {
      vi.useRealTimers();
    }
  });
});
