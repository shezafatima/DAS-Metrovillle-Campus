import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./notification-bell";

const mockUseNotifications = vi.fn();
vi.mock("./notifications-provider", () => ({
  useNotifications: () => mockUseNotifications(),
}));

function baseState(overrides: Partial<ReturnType<typeof mockUseNotifications>> = {}) {
  return {
    messagesNew: 0,
    signupsNew: 0,
    items: [],
    loading: false,
    refresh: vi.fn(),
    refreshNow: vi.fn(),
    markAllRead: vi.fn(),
    ...overrides,
  };
}

describe("NotificationBell", () => {
  it("shows no dot when nothing is new", () => {
    mockUseNotifications.mockReturnValue(baseState());
    render(<NotificationBell />);
    expect(screen.queryByTestId("notification-bell-dot")).not.toBeInTheDocument();
  });

  it("shows a plain dot — never a number — when something is new", () => {
    mockUseNotifications.mockReturnValue(baseState({ messagesNew: 2, signupsNew: 1 }));
    render(<NotificationBell />);
    expect(screen.getByTestId("notification-bell-dot")).toBeInTheDocument();
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
  });

  it("shows the dot while the first fetch hasn't resolved yet, even at zero", () => {
    mockUseNotifications.mockReturnValue(baseState({ loading: true }));
    render(<NotificationBell />);
    expect(screen.getByTestId("notification-bell-dot")).toBeInTheDocument();
  });

  it("calls refresh when the popover opens", async () => {
    const refresh = vi.fn();
    mockUseNotifications.mockReturnValue(baseState({ refresh }));
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("closes the popover after choosing an item", async () => {
    mockUseNotifications.mockReturnValue(
      baseState({
        messagesNew: 1,
        items: [{ kind: "message", id: "1", title: "Ali", description: "Hi", timestamp: new Date().toISOString(), href: "/admin/messages/1" }],
      }),
    );
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    const link = await screen.findByRole("link", { name: /Ali/ });
    fireEvent.click(link);
    await waitFor(() => expect(screen.queryByRole("link", { name: /Ali/ })).not.toBeInTheDocument());
  });
});
