import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationPanel } from "./notification-panel";

const mockUseNotifications = vi.fn();
vi.mock("./notifications-provider", () => ({
  useNotifications: () => mockUseNotifications(),
}));

describe("NotificationPanel", () => {
  it("shows the empty state when nothing is new", () => {
    mockUseNotifications.mockReturnValue({ messagesNew: 0, signupsNew: 0, items: [], markAllRead: vi.fn() });
    render(<NotificationPanel />);
    expect(screen.getByText("You're all caught up — nothing new.")).toBeInTheDocument();
  });

  it("lists items newest first with title, description, relative time and a New mark", () => {
    const now = new Date();
    mockUseNotifications.mockReturnValue({
      messagesNew: 1,
      signupsNew: 1,
      items: [
        { kind: "message", id: "1", title: "Ali", description: "Enquiry", timestamp: now.toISOString(), href: "/admin/messages/1" },
        { kind: "signup", id: "2", title: "Sara", description: "sara@example.com", timestamp: new Date(now.getTime() - 60_000).toISOString(), href: "/admin/signups" },
      ],
      markAllRead: vi.fn(),
    });
    render(<NotificationPanel />);
    expect(screen.getByText("Ali")).toBeInTheDocument();
    expect(screen.getByText("Enquiry")).toBeInTheDocument();
    expect(screen.getByText("Sara")).toBeInTheDocument();
    expect(screen.getByText("sara@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("New")).toHaveLength(2);
    expect(screen.getByText("just now")).toBeInTheDocument();
    expect(screen.getByText("1 minute ago")).toBeInTheDocument();
  });

  it("always shows both footer links", () => {
    mockUseNotifications.mockReturnValue({ messagesNew: 0, signupsNew: 0, items: [], markAllRead: vi.fn() });
    render(<NotificationPanel />);
    expect(screen.getByRole("link", { name: "See all messages" })).toHaveAttribute("href", "/admin/messages");
    expect(screen.getByRole("link", { name: "See all signups" })).toHaveAttribute("href", "/admin/signups");
  });

  it("disables Mark all as read at zero and calls markAllRead when clicked otherwise", () => {
    const markAllRead = vi.fn();
    mockUseNotifications.mockReturnValue({
      messagesNew: 1,
      signupsNew: 0,
      items: [{ kind: "message", id: "1", title: "Ali", description: "Hi", timestamp: new Date().toISOString(), href: "/admin/messages/1" }],
      markAllRead,
    });
    render(<NotificationPanel />);
    const button = screen.getByRole("button", { name: "Mark all as read" });
    expect(button).not.toBeDisabled();
    button.click();
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  it("disables Mark all as read when nothing is new", () => {
    mockUseNotifications.mockReturnValue({ messagesNew: 0, signupsNew: 0, items: [], markAllRead: vi.fn() });
    render(<NotificationPanel />);
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
  });
});
