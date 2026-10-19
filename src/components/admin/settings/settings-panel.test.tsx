import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "./settings-panel";
import { SettingsPanelForm } from "./settings-panel-form";
import { UnsavedPanelsProvider } from "./unsaved-panels";

vi.mock("@/app/admin/(dashboard)/settings/actions", () => ({ saveSettingsPanel: vi.fn(), savePagesPanel: vi.fn() }));
vi.mock("@/components/ui/toaster", () => ({ toast: vi.fn() }));

const FP = "0".repeat(32);

function panel(children: React.ReactNode = <input aria-label="Typed value" />) {
  return (
    <UnsavedPanelsProvider>
      <SettingsPanel panel="stats" title="Progress dashboard" anchor="stats" viewOnSite="/#progress-dashboard">
        {children}
      </SettingsPanel>
    </UnsavedPanelsProvider>
  );
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("SettingsPanel (014)", () => {
  it("toggles with its button, reporting aria-expanded and hiding the body", () => {
    render(panel());
    const toggle = screen.getByRole("button", { name: "Progress dashboard" });
    const body = document.getElementById("stats-body")!;
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "stats-body");
    expect(body.hidden).toBe(false);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(body.hidden).toBe(true);

    fireEvent.click(toggle);
    expect(body.hidden).toBe(false);
  });

  it("keeps typed values while collapsed", () => {
    render(panel());
    const input = screen.getByLabelText("Typed value") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "kept" } });
    fireEvent.click(screen.getByRole("button", { name: "Progress dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: "Progress dashboard" }));
    expect((screen.getByLabelText("Typed value") as HTMLInputElement).value).toBe("kept");
  });

  it("opens when the address names its anchor", () => {
    render(panel());
    fireEvent.click(screen.getByRole("button", { name: "Progress dashboard" }));
    expect(document.getElementById("stats-body")!.hidden).toBe(true);
    act(() => {
      window.history.replaceState(null, "", "/#stats");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(document.getElementById("stats-body")!.hidden).toBe(false);
  });

  it("puts the View on site link beside the toggle, not inside it", () => {
    render(panel());
    const link = screen.getByRole("link", { name: /View on site/ });
    expect(link).toHaveAttribute("href", "/#progress-dashboard");
    expect(screen.getByRole("button", { name: "Progress dashboard" }).contains(link)).toBe(false);
  });
});

describe("SettingsPanelForm inside a panel (014)", () => {
  const initial = { data: { students: 1, books: 2, teachers: 3, campuses: 4 }, fingerprint: FP, lastSaved: null };

  function form(props: Partial<React.ComponentProps<typeof SettingsPanelForm>> = {}) {
    return panel(<SettingsPanelForm key="stats" panel="stats" initial={initial} {...props} />);
  }

  it("shows the Unsaved changes badge while edited, also when collapsed", () => {
    render(form());
    expect(screen.queryByTestId("panel-unsaved")).toBeNull();
    fireEvent.change(screen.getByLabelText(/Students/), { target: { value: "9" } });
    expect(screen.getByTestId("panel-unsaved")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Progress dashboard" }));
    expect(screen.getByTestId("panel-unsaved")).toBeInTheDocument();
  });

  it("keeps its edits and dirty state when re-rendered with new initial props (the refresh after a sibling save)", () => {
    const { rerender } = render(form());
    fireEvent.change(screen.getByLabelText(/Students/), { target: { value: "9" } });
    rerender(form({ initial: { data: { students: 500, books: 2, teachers: 3, campuses: 4 }, fingerprint: "f".repeat(32), lastSaved: null } }));
    expect((screen.getByLabelText(/Students/) as HTMLInputElement).value).toBe("9");
    expect(screen.getByTestId("panel-unsaved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});
