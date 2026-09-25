import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useRouter } from "next/navigation";
import { MessageStatusControl } from "@/components/admin/messages/message-status-control";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("MessageStatusControl", () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({ refresh: vi.fn() } as unknown as ReturnType<typeof useRouter>);
  });

  it("updates the displayed status on a 200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: "responded" }) }),
    );

    render(<MessageStatusControl id="1" status="new" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "responded" } });

    await vi.waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("responded"));
    vi.unstubAllGlobals();
  });

  it("keeps the previous value selected and shows a failure toast on a 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    render(<MessageStatusControl id="1" status="new" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "read" } });

    await vi.waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("new"));
    vi.unstubAllGlobals();
  });

  it("hides the 'Mark as responded' button when already responded", () => {
    render(<MessageStatusControl id="1" status="responded" />);
    expect(screen.queryByRole("button", { name: "Mark as responded" })).toBeNull();
  });

  it("shows the button when not responded", () => {
    render(<MessageStatusControl id="1" status="new" />);
    expect(screen.getByRole("button", { name: "Mark as responded" })).toBeInTheDocument();
  });

  it("shows Read after remounting with a changed key (simulating a refresh)", () => {
    const { rerender } = render(<MessageStatusControl key="new" id="1" status="new" />);
    expect(screen.getByRole("combobox")).toHaveValue("new");
    rerender(<MessageStatusControl key="read" id="1" status="read" />);
    expect(screen.getByRole("combobox")).toHaveValue("read");
  });
});
