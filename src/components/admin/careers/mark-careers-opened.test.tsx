import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarkCareersOpened } from "./mark-careers-opened";

const refreshNow = vi.fn();
vi.mock("@/components/admin/notifications/notifications-provider", () => ({
  useNotifications: () => ({ refreshNow }),
}));

describe("MarkCareersOpened", () => {
  beforeEach(() => {
    refreshNow.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ openedAt: "2026-10-03T10:00:00.000Z" }) }));
  });

  it("fires exactly one POST on mount, and calls refreshNow on success", async () => {
    render(<MarkCareersOpened />);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/admin/careers/opened", { method: "POST" });
    await waitFor(() => expect(refreshNow).toHaveBeenCalledTimes(1));
  });

  it("fires exactly one POST under StrictMode's double effect", () => {
    render(
      <StrictMode>
        <MarkCareersOpened />
      </StrictMode>,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not call refreshNow when the server refuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<MarkCareersOpened />);
    await new Promise((r) => setTimeout(r, 10));
    expect(refreshNow).not.toHaveBeenCalled();
  });

  it("does not throw when the request rejects, and does not call refreshNow", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(() => render(<MarkCareersOpened />)).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    expect(refreshNow).not.toHaveBeenCalled();
  });
});
