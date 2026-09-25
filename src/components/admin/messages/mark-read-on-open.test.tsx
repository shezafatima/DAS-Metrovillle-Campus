import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useRouter } from "next/navigation";
import { MarkReadOnOpen } from "@/components/admin/messages/mark-read-on-open";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

function mockFetchOnce(response: { ok: boolean; body?: unknown }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    json: async () => response.body ?? {},
  });
}

describe("MarkReadOnOpen", () => {
  let refresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    refresh = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>);
  });

  it("POSTs once and refreshes when mounted with status new and changed: true", async () => {
    const fetchMock = mockFetchOnce({ ok: true, body: { changed: true } });
    vi.stubGlobal("fetch", fetchMock);

    render(<MarkReadOnOpen id="1" status="new" />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/messages/1/read", { method: "POST" });
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));

    vi.unstubAllGlobals();
  });

  it("does not POST when mounted with status read or responded", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(<MarkReadOnOpen id="1" status="read" />);
    rerender(<MarkReadOnOpen id="1" status="responded" />);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("fires exactly one POST even if the status prop later changes back to new (same key/mount)", async () => {
    const fetchMock = mockFetchOnce({ ok: true, body: { changed: true } });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(<MarkReadOnOpen id="1" status="new" />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    rerender(<MarkReadOnOpen id="1" status="read" />);
    rerender(<MarkReadOnOpen id="1" status="new" />);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("fires exactly one POST under StrictMode", async () => {
    const fetchMock = mockFetchOnce({ ok: true, body: { changed: false } });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <React.StrictMode>
        <MarkReadOnOpen id="1" status="new" />
      </React.StrictMode>,
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    vi.unstubAllGlobals();
  });
});
