import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageDetail } from "@/components/admin/messages/message-detail";
import type { MessageDetail as MessageDetailData } from "@/lib/messages/admin-queries";

const XSS_PAYLOAD = '<script>alert(1)</script><img src=x onerror="window.__xss=1">';

function detail(overrides: Partial<MessageDetailData> = {}): MessageDetailData {
  return {
    id: "1",
    name: "Ali Khan",
    email: "ali@example.com",
    phone: null,
    phoneDisplay: null,
    subject: "Admission",
    body: "Body text.",
    status: "new",
    receivedAt: new Date("2026-09-24T09:00:00Z").toISOString(),
    statusChangedAt: null,
    ...overrides,
  };
}

describe("MessageDetail", () => {
  it("renders the XSS payload as literal text with no script/img elements", () => {
    const { container } = render(
      <MessageDetail
        message={detail({ name: XSS_PAYLOAD, subject: XSS_PAYLOAD, body: XSS_PAYLOAD })}
        backHref="/admin/messages"
      />,
    );
    expect(screen.getAllByText(XSS_PAYLOAD, { exact: false }).length).toBeGreaterThan(0);
    expect(container.querySelector("script, img")).toBeNull();
  });

  it("shows 'Not provided' and no tel/wa.me link when there is no phone", () => {
    render(<MessageDetail message={detail({ phone: null, phoneDisplay: null })} backHref="/admin/messages" />);
    expect(screen.getByText("Not provided")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^\+?\d/ })).toBeNull();
    expect(screen.queryByText("WhatsApp")).toBeNull();
  });

  it("builds exact tel, WhatsApp and mailto hrefs when a phone is present", () => {
    render(
      <MessageDetail
        message={detail({ phone: "+923001234567", phoneDisplay: "03001234567", email: "ali@example.com", subject: "Fees" })}
        backHref="/admin/messages"
      />,
    );
    expect(screen.getByRole("link", { name: "03001234567" })).toHaveAttribute("href", "tel:+923001234567");
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/923001234567");
    expect(screen.getByRole("link", { name: "ali@example.com" })).toHaveAttribute(
      "href",
      "mailto:ali@example.com?subject=Re%3A%20Fees",
    );
  });

  it("marks an Urdu subject dir=auto with the Urdu font class", () => {
    render(<MessageDetail message={detail({ subject: "داخلہ" })} backHref="/admin/messages" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveAttribute("dir", "auto");
    expect(heading).toHaveClass("font-body-urdu");
  });

  it("renders a body with blank lines inside the whitespace-pre-wrap element", () => {
    const { container } = render(<MessageDetail message={detail({ body: "line one\n\nline two" })} backHref="/admin/messages" />);
    const bodyEl = container.querySelector(".whitespace-pre-wrap");
    expect(bodyEl?.textContent).toBe("line one\n\nline two");
  });
});
