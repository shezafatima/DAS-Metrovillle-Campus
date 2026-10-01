import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PageTitleBadge } from "./page-title-badge";

const mockUseNotifications = vi.fn();
vi.mock("./notifications-provider", () => ({
  useNotifications: () => mockUseNotifications(),
}));

describe("PageTitleBadge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("leaves the title unprefixed when nothing is new", () => {
    mockUseNotifications.mockReturnValue({ messagesNew: 0, signupsNew: 0 });
    document.title = "Overview";
    render(<PageTitleBadge />);
    vi.runAllTimers();
    expect(document.title).toBe("Overview");
  });

  it("prefixes the title with the combined count", () => {
    mockUseNotifications.mockReturnValue({ messagesNew: 2, signupsNew: 1 });
    document.title = "Overview";
    render(<PageTitleBadge />);
    vi.runAllTimers();
    expect(document.title).toBe("(3) Overview");
  });

  it("removes the prefix again once the count returns to zero", () => {
    mockUseNotifications.mockReturnValue({ messagesNew: 1, signupsNew: 0 });
    document.title = "Overview";
    const { rerender } = render(<PageTitleBadge />);
    vi.runAllTimers();
    expect(document.title).toBe("(1) Overview");

    mockUseNotifications.mockReturnValue({ messagesNew: 0, signupsNew: 0 });
    rerender(<PageTitleBadge />);
    vi.runAllTimers();
    expect(document.title).toBe("Overview");
  });

  it("re-prefixes the new page's own title once it settles after a multi-step external change", async () => {
    mockUseNotifications.mockReturnValue({ messagesNew: 1, signupsNew: 0 });
    document.title = "Overview";
    render(<PageTitleBadge />);
    vi.runAllTimers();
    expect(document.title).toBe("(1) Overview");

    // Simulate a client-side navigation that (like Next's App Router was
    // observed to) sets the title in more than one step, including an
    // intermediate empty string, before settling. The MutationObserver
    // callback is a real microtask even under fake timers, so each
    // mutation needs a tick to be observed before the next one lands.
    document.title = "";
    await Promise.resolve();
    vi.advanceTimersByTime(10);
    document.title = "News";
    await Promise.resolve();
    vi.runAllTimers();
    expect(document.title).toBe("(1) News");
  });
});
