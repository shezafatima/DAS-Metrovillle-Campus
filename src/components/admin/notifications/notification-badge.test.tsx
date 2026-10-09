import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotificationBadge } from "./notification-badge";

describe("NotificationBadge", () => {
  it("renders nothing at zero", () => {
    const { container } = render(<NotificationBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the plain count", () => {
    render(<NotificationBadge count={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders 99+ above 99", () => {
    render(<NotificationBadge count={150} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("renders a dot instead of a number while pending and still zero", () => {
    const { container } = render(<NotificationBadge count={0} pending />);
    expect(container.querySelector("span[aria-hidden]")).toBeInTheDocument();
    expect(container.textContent).toBe("");
  });

  it("prefers the real count over the pending dot once known", () => {
    render(<NotificationBadge count={3} pending />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
