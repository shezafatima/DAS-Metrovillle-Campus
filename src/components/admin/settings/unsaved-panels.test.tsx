import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnsavedPanelsProvider, usePanelUnsaved, useReportUnsaved } from "./unsaved-panels";

function Reporter({ panel, dirty }: { panel: string; dirty: boolean }) {
  useReportUnsaved(panel, dirty);
  return null;
}

function Badge({ panel }: { panel: string }) {
  return <span data-testid={`badge-${panel}`}>{usePanelUnsaved(panel) ? "dirty" : "clean"}</span>;
}

function Tab({ a, b }: { a: boolean; b: boolean }) {
  return (
    <UnsavedPanelsProvider>
      <Reporter panel="a" dirty={a} />
      <Reporter panel="b" dirty={b} />
      <Badge panel="a" />
      <Badge panel="b" />
      <a href="/elsewhere">Leave</a>
    </UnsavedPanelsProvider>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("UnsavedPanelsProvider (014 research R8)", () => {
  it("tracks each panel on its own", () => {
    const { rerender } = render(<Tab a={false} b={false} />);
    expect(screen.getByTestId("badge-a")).toHaveTextContent("clean");
    rerender(<Tab a={true} b={false} />);
    expect(screen.getByTestId("badge-a")).toHaveTextContent("dirty");
    expect(screen.getByTestId("badge-b")).toHaveTextContent("clean");
    rerender(<Tab a={false} b={false} />);
    expect(screen.getByTestId("badge-a")).toHaveTextContent("clean");
  });

  it("asks once when leaving with two unsaved panels", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Tab a={true} b={true} />);
    fireEvent.click(screen.getByRole("link", { name: "Leave" }));
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("does not ask when every panel is clean", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Tab a={false} b={false} />);
    fireEvent.click(screen.getByRole("link", { name: "Leave" }));
    expect(confirm).not.toHaveBeenCalled();
  });

  it("forgets a panel that unmounts", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { rerender } = render(
      <UnsavedPanelsProvider>
        <Reporter panel="a" dirty />
        <a href="/elsewhere">Leave</a>
      </UnsavedPanelsProvider>,
    );
    rerender(
      <UnsavedPanelsProvider>
        <a href="/elsewhere">Leave</a>
      </UnsavedPanelsProvider>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Leave" }));
    expect(confirm).not.toHaveBeenCalled();
  });
});
