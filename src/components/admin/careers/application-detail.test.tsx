import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationDetail } from "./application-detail";
import type { CareerApplicationRow } from "@/lib/careers/admin-queries";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/admin/notifications/notifications-provider", () => ({
  useNotifications: () => ({ refreshNow: vi.fn() }),
}));

const application: CareerApplicationRow = {
  id: "507f1f77bcf86cd799439011",
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  phone: "+923001234567",
  phoneDisplay: "03001234567",
  qualification: "M.Ed",
  appliedAt: "2026-10-03T10:00:00.000Z",
};

afterEach(cleanup);

describe("ApplicationDetail", () => {
  it("shows every field of the application", () => {
    render(<ApplicationDetail application={application} canDelete />);

    expect(screen.getByRole("heading", { name: "Ayesha Khan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ayesha@example.com" })).toHaveAttribute("href", "mailto:ayesha@example.com");
    expect(screen.getByRole("link", { name: "03001234567" })).toHaveAttribute("href", "tel:+923001234567");
    expect(screen.getByText("M.Ed")).toBeInTheDocument();
    expect(screen.getByText("03 Oct 2026, 15:00")).toBeInTheDocument();
  });

  it("offers the CV only as a download link to the checked route", () => {
    render(<ApplicationDetail application={application} canDelete />);

    const link = screen.getByRole("link", { name: /Download CV/ });
    expect(link).toHaveAttribute("href", "/api/admin/careers/507f1f77bcf86cd799439011/cv");
    expect(link).toHaveAttribute("download");
  });

  it("never previews or embeds the CV: no iframe, embed, object, image or video anywhere", () => {
    const { container } = render(<ApplicationDetail application={application} canDelete />);
    expect(container.querySelector("iframe, embed, object, img, video, audio, canvas")).toBeNull();
    expect(container.innerHTML).not.toMatch(/<(iframe|embed|object)\b/i);
  });

  it("shows the delete control only when the viewer may delete", () => {
    const { rerender } = render(<ApplicationDetail application={application} canDelete />);
    expect(screen.getByRole("button", { name: "Delete application" })).toBeInTheDocument();

    rerender(<ApplicationDetail application={application} canDelete={false} />);
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    // Everything else is still there for a content manager.
    expect(screen.getByRole("link", { name: /Download CV/ })).toBeInTheDocument();
  });

  it("asks for confirmation before deleting, and explains what happens", async () => {
    render(<ApplicationDetail application={application} canDelete />);
    screen.getByRole("button", { name: "Delete application" }).click();

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete this application?")).toBeInTheDocument();
    expect(within(dialog).getByText(/CV file will be removed/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("shows an Urdu name right-to-left and in the Urdu font", () => {
    render(<ApplicationDetail application={{ ...application, name: "عائشہ خان", qualification: "ایم اے اردو" }} canDelete={false} />);
    const heading = screen.getByRole("heading", { name: "عائشہ خان" });
    expect(heading).toHaveAttribute("dir", "auto");
    expect(heading.className).toContain("font-body-urdu");
    expect(screen.getByText("ایم اے اردو")).toHaveAttribute("dir", "auto");
  });

  it("links back to the list", () => {
    render(<ApplicationDetail application={application} canDelete={false} />);
    expect(screen.getByRole("link", { name: "Back to applications" })).toHaveAttribute("href", "/admin/careers");
  });
});
