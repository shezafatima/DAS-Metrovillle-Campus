import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useRouter } from "next/navigation";
import { NewsEditor } from "./news-editor";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const push = vi.fn();
const refresh = vi.fn();

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({ push, refresh } as unknown as ReturnType<typeof useRouter>);
  push.mockClear();
  refresh.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("NewsEditor — create mode", () => {
  it("auto-fills the address from the title, and stops once the address is edited by hand", () => {
    render(<NewsEditor mode="create" />);

    const title = screen.getByLabelText("Title");
    fireEvent.change(title, { target: { value: "Annual Sports Day" } });
    expect(screen.getByLabelText("Address")).toHaveValue("annual-sports-day");

    const address = screen.getByLabelText("Address");
    fireEvent.change(address, { target: { value: "custom-address" } });
    fireEvent.change(title, { target: { value: "Annual Sports Day Updated" } });
    expect(screen.getByLabelText("Address")).toHaveValue("custom-address");
  });

  it("blocks submission and shows a message when the body is empty", async () => {
    render(<NewsEditor mode="create" />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "A Title" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "events" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByText("Body is required.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("registers a beforeunload handler only once a field has been edited", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<NewsEditor mode="create" />);

    const beforeUnloadCallsBeforeEdit = addSpy.mock.calls.filter((c) => c[0] === "beforeunload").length;
    expect(beforeUnloadCallsBeforeEdit).toBe(0);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "X" } });
    await waitFor(() => {
      const calls = addSpy.mock.calls.filter((c) => c[0] === "beforeunload").length;
      expect(calls).toBeGreaterThan(0);
    });
  });
});

describe("NewsEditor — 409 response", () => {
  it("maps a 409 slug conflict onto the address field and keeps the title text intact", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: "validation",
        fields: { slug: "This address is already in use." },
      }),
    } as Response);

    render(<NewsEditor mode="create" />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "A Title" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "events" } });

    // Body is a Tiptap/ProseMirror-managed contenteditable region.
    // ProseMirror reconciles any DOM mutation (not just synthetic key
    // events) via its own MutationObserver, so setting textContent
    // directly works — but the observer flushes asynchronously, so we
    // wait for the editor's onUpdate (→ bodyHtml state) to actually run
    // before submitting.
    const editable = document.querySelector('[contenteditable="true"]') as HTMLElement;
    editable.textContent = "Body text that must survive the conflict.";
    fireEvent.input(editable);
    await waitFor(() => {
      expect(editable.textContent).toContain("Body text that must survive the conflict.");
    });

    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByText("This address is already in use.")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("A Title");
  });
});
