import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { contactInfo } from "@/content/site-shell";

const findById = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }),
  unstable_rethrow: () => undefined,
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/db", () => ({ connectDb: async () => undefined }));
vi.mock("@/lib/log", () => ({ logSecurityEvent: () => undefined }));
vi.mock("@/models/settings", () => ({
  Settings: { findById: (...args: unknown[]) => ({ lean: () => findById(...args) }) },
}));

async function renderShell() {
  vi.resetModules();
  const { PublicShell } = await import("./public-shell");
  // PublicShell is an async Server Component: resolve it, then render what it returns.
  const tree = await PublicShell({ children: <p>page body</p> });
  return render(tree);
}

beforeEach(() => {
  findById.mockReset();
});

describe("PublicShell reads the contact details from Settings (005)", () => {
  it("shows the saved social links in the footer only (no header icons), and no icon for a cleared one", async () => {
    findById.mockResolvedValue({
      version: 2,
      updatedBy: "x@y.pk",
      data: { ...contactInfo, social: { facebook: "https://fb.example/new", youtube: "", instagram: "", tiktok: "" } },
    });
    await renderShell();

    const header = screen.getByRole("banner");
    const footer = screen.getByRole("contentinfo");
    expect(within(header).queryByRole("link", { name: "Facebook" })).not.toBeInTheDocument();
    expect(within(footer).getByRole("link", { name: "Facebook" })).toHaveAttribute("href", "https://fb.example/new");
    expect(within(header).queryByRole("link", { name: "TikTok" })).not.toBeInTheDocument();
    expect(within(footer).queryByRole("link", { name: "TikTok" })).not.toBeInTheDocument();
    expect(screen.getByText("page body")).toBeInTheDocument();
  });

  it("nothing saved: the site shows the content-file social links, exactly as before", async () => {
    findById.mockResolvedValue(null);
    await renderShell();
    const footer = screen.getByRole("contentinfo");
    for (const [platform, label] of [
      ["facebook", "Facebook"],
      ["youtube", "YouTube"],
      ["instagram", "Instagram"],
      ["tiktok", "TikTok"],
    ] as const) {
      expect(within(footer).getByRole("link", { name: label })).toHaveAttribute("href", contactInfo.social[platform]!);
    }
  });

  it("FR-032: when settings cannot be read the shell still renders, with the starting values", async () => {
    findById.mockRejectedValue(new Error("database unreachable"));
    await renderShell();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText("page body")).toBeInTheDocument();
    expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: "Facebook" })).toHaveAttribute(
      "href",
      contactInfo.social.facebook!,
    );
  });
});
