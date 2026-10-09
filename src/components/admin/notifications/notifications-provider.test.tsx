import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotificationsProvider, useNotifications } from "./notifications-provider";

function Consumer() {
  const { messagesNew, applicationsNew, items, markAllRead } = useNotifications();
  return (
    <div>
      <span data-testid="messages">{messagesNew}</span>
      <span data-testid="applications">{applicationsNew}</span>
      <span data-testid="items">{items.length}</span>
      <button type="button" onClick={() => markAllRead()}>
        Mark all as read
      </button>
    </div>
  );
}

describe("NotificationsProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the seeded initial counts immediately", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messagesNew: 0, applicationsNew: 0, items: [] }) }),
    );
    render(
      <NotificationsProvider initialMessagesNew={3} initialApplicationsNew={2}>
        <Consumer />
      </NotificationsProvider>,
    );
    expect(screen.getByTestId("messages")).toHaveTextContent("3");
    expect(screen.getByTestId("applications")).toHaveTextContent("2");
  });

  it("replaces state with the mount-triggered fetch's result once it resolves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messagesNew: 5, applicationsNew: 1, items: [{ kind: "message", id: "1", title: "Ali", description: "Hi", timestamp: new Date().toISOString(), href: "/admin/messages/1" }] }),
      }),
    );
    render(
      <NotificationsProvider initialMessagesNew={0} initialApplicationsNew={0}>
        <Consumer />
      </NotificationsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("messages")).toHaveTextContent("5"));
    expect(screen.getByTestId("applications")).toHaveTextContent("1");
    expect(screen.getByTestId("items")).toHaveTextContent("1");
  });

  it("leaves the previous state untouched when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    render(
      <NotificationsProvider initialMessagesNew={4} initialApplicationsNew={2}>
        <Consumer />
      </NotificationsProvider>,
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByTestId("messages")).toHaveTextContent("4");
    expect(screen.getByTestId("applications")).toHaveTextContent("2");
  });

  it("leaves the previous state untouched when the fetch returns a non-200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    render(
      <NotificationsProvider initialMessagesNew={7} initialApplicationsNew={0}>
        <Consumer />
      </NotificationsProvider>,
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByTestId("messages")).toHaveTextContent("7");
  });

  it("markAllRead optimistically zeroes state, then posts to the read endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messagesNew: 2, applicationsNew: 1, items: [] }) }) // mount refresh
      .mockResolvedValueOnce({ ok: true }); // markAllRead POST
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NotificationsProvider initialMessagesNew={2} initialApplicationsNew={1}>
        <Consumer />
      </NotificationsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("messages")).toHaveTextContent("2"));

    screen.getByRole("button", { name: "Mark all as read" }).click();
    await waitFor(() => expect(screen.getByTestId("messages")).toHaveTextContent("0"));
    expect(screen.getByTestId("applications")).toHaveTextContent("0");
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/notifications/read", { method: "POST" });
  });

  function setVisibility(value: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  it("polls again after the interval elapses while visible", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ messagesNew: 1, applicationsNew: 0, items: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    setVisibility("visible");

    render(
      <NotificationsProvider initialMessagesNew={0} initialApplicationsNew={0}>
        <Consumer />
      </NotificationsProvider>,
    );
    await vi.advanceTimersByTimeAsync(0); // flush the mount-triggered refresh
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("stops polling while hidden, and refreshes immediately on becoming visible again", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ messagesNew: 0, applicationsNew: 0, items: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    setVisibility("visible");

    render(
      <NotificationsProvider initialMessagesNew={0} initialApplicationsNew={0}>
        <Consumer />
      </NotificationsProvider>,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no polling while hidden

    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(0); // immediate refresh on return
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3); // interval resumed
    vi.useRealTimers();
  });
});
