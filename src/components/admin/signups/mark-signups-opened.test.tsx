import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MarkSignupsOpened } from "./mark-signups-opened";

const refreshNow = vi.fn();
vi.mock("@/components/admin/notifications/notifications-provider", () => ({
  useNotifications: () => ({ refreshNow }),
}));

describe("MarkSignupsOpened", () => {
  beforeEach(() => {
    refreshNow.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ signupsNew: 0 }) }));
  });

  it("fires exactly one POST on mount, and calls refreshNow on success", async () => {
    render(<MarkSignupsOpened />);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/admin/signups/opened", { method: "POST" });
    await waitFor(() => expect(refreshNow).toHaveBeenCalledTimes(1));
  });

  it("fires exactly one POST under StrictMode's double effect", () => {
    render(
      <StrictMode>
        <MarkSignupsOpened />
      </StrictMode>,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the request rejects, and does not call refreshNow", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(() => render(<MarkSignupsOpened />)).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    expect(refreshNow).not.toHaveBeenCalled();
  });
});
