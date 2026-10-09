import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessagesTable } from "@/components/admin/messages/messages-table";
import type { MessageRow } from "@/lib/messages/admin-queries";

// Each row renders a DeleteMessageDialog (→ AdminDeleteDialog), which
// reads useNotifications() (009) and useRouter().
vi.mock("@/components/admin/notifications/notifications-provider", () => ({
  useNotifications: () => ({ refreshNow: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const XSS_PAYLOAD = '<script>alert(1)</script><img src=x onerror="window.__xss=1">';

function row(overrides: Partial<MessageRow> = {}): MessageRow {
  return {
    id: "1",
    name: "Ali Khan",
    email: "ali@example.com",
    subject: "Admission",
    preview: "Preview text",
    status: "new",
    receivedAt: new Date("2026-09-24T09:00:00Z").toISOString(),
    ...overrides,
  };
}

describe("MessagesTable", () => {
  it("renders the XSS payload as literal text with no script/img elements", () => {
    const { container } = render(
      <MessagesTable
        rows={[row({ name: XSS_PAYLOAD, subject: XSS_PAYLOAD, preview: XSS_PAYLOAD })]}
        filtered={false}
        from=""
      />,
    );
    expect(screen.getAllByText(XSS_PAYLOAD).length).toBeGreaterThan(0);
    expect(container.querySelector("script, img")).toBeNull();
  });

  it("bolds a new row and does not bold a read row", () => {
    render(
      <MessagesTable
        rows={[row({ id: "1", status: "new", name: "New Row" }), row({ id: "2", status: "read", name: "Read Row" })]}
        filtered={false}
        from=""
      />,
    );
    expect(screen.getByText("New Row")).toHaveClass("font-bold");
    expect(screen.getByText("Read Row")).not.toHaveClass("font-bold");
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies dir=auto and the Urdu font class to an Urdu subject", () => {
    render(<MessagesTable rows={[row({ subject: "داخلہ" })]} filtered={false} from="" />);
    const link = screen.getByText("داخلہ");
    expect(link).toHaveAttribute("dir", "auto");
    expect(link).toHaveClass("font-body-urdu");
  });

  it("shows the empty state and the filtered empty state", () => {
    const { rerender } = render(<MessagesTable rows={[]} filtered={false} from="" />);
    expect(screen.getByText("No messages yet.")).toBeInTheDocument();
    rerender(<MessagesTable rows={[]} filtered={true} from="" />);
    expect(screen.getByText("No messages match your search or filter.")).toBeInTheDocument();
  });
});
