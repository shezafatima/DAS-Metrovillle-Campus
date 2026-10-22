import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "./settings-panel";
import { SettingsPanelForm } from "./settings-panel-form";
import { UnsavedPanelsProvider } from "./unsaved-panels";

const confirmSettingsPanel = vi.hoisted(() => vi.fn());
const confirmPagesPanel = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/app/admin/(dashboard)/settings/actions", () => ({ saveSettingsPanel: vi.fn(), savePagesPanel: vi.fn(), confirmSettingsPanel, confirmPagesPanel }));
vi.mock("@/components/ui/toaster", () => ({ toast }));

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
  const initial = { data: { students: 1, books: 2, teachers: 3, campuses: 4 }, fingerprint: FP, lastSaved: null, pending: null };

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
    rerender(form({ initial: { data: { students: 500, books: 2, teachers: 3, campuses: 4 }, fingerprint: "f".repeat(32), lastSaved: null, pending: null } }));
    expect((screen.getByLabelText(/Students/) as HTMLInputElement).value).toBe("9");
    expect(screen.getByTestId("panel-unsaved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});

describe("the pending client confirmation notice (014b)", () => {
  const pending = { source: "das.edu.pk /academics/syllabi/", seededAt: "2026-10-19T10:00:00.000Z" };

  function seeded(key: "syllabi" | "portal-links", props: { canConfirm?: boolean; pending?: typeof pending | null } = {}) {
    return render(
      <UnsavedPanelsProvider>
        <SettingsPanel panel={key} title="Seeded section" anchor={key} viewOnSite="/x" pending={"pending" in props ? props.pending : pending} canConfirm={props.canConfirm}>
          <p>body</p>
        </SettingsPanel>
      </UnsavedPanelsProvider>,
    );
  }

  afterEach(() => {
    confirmSettingsPanel.mockReset();
    confirmPagesPanel.mockReset();
    toast.mockReset();
  });

  it("shows where the content was copied from and when, and says saving does not clear it", () => {
    seeded("syllabi", { canConfirm: true });
    const notice = screen.getByTestId("pending-notice");
    expect(notice).toHaveTextContent("Copied from das.edu.pk /academics/syllabi/");
    expect(notice).toHaveTextContent("awaits the client's confirmation");
    expect(notice).toHaveTextContent("Saving changes does not clear this notice");
  });

  it("shows nothing when nothing is pending", () => {
    seeded("syllabi", { canConfirm: true, pending: null });
    expect(screen.queryByTestId("pending-notice")).toBeNull();
  });

  it("without permission to change the panel it shows the notice but no button", () => {
    seeded("syllabi", { canConfirm: false });
    expect(screen.getByTestId("pending-notice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as confirmed by client" })).toBeNull();
  });

  it("asks first; cancelling changes nothing", async () => {
    seeded("syllabi", { canConfirm: true });
    fireEvent.click(screen.getByRole("button", { name: "Mark as confirmed by client" }));
    expect(await screen.findByText("Mark this section as confirmed by the client?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText("Mark this section as confirmed by the client?")).toBeNull());
    expect(confirmPagesPanel).not.toHaveBeenCalled();
    expect(screen.getByTestId("pending-notice")).toBeInTheDocument();
  });

  it("confirming a Pages panel calls the Pages action, removes the notice and says so", async () => {
    confirmPagesPanel.mockResolvedValue({ status: "success", changed: true });
    seeded("syllabi", { canConfirm: true });
    fireEvent.click(screen.getByRole("button", { name: "Mark as confirmed by client" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mark as confirmed" }));
    await waitFor(() => expect(screen.queryByTestId("pending-notice")).toBeNull());
    expect(confirmPagesPanel).toHaveBeenCalledWith({ panel: "syllabi" });
    expect(confirmSettingsPanel).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({ title: "Seeded section marked as confirmed by the client", type: "success" });
  });

  it("confirming a Settings panel (Portal links) calls the Settings action", async () => {
    confirmSettingsPanel.mockResolvedValue({ status: "success", changed: true });
    seeded("portal-links", { canConfirm: true });
    fireEvent.click(screen.getByRole("button", { name: "Mark as confirmed by client" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mark as confirmed" }));
    await waitFor(() => expect(confirmSettingsPanel).toHaveBeenCalledWith({ panel: "portal-links" }));
    expect(confirmPagesPanel).not.toHaveBeenCalled();
  });

  it("a refusal keeps the notice and shows an error", async () => {
    confirmPagesPanel.mockResolvedValue({ status: "error", error: "forbidden" });
    seeded("syllabi", { canConfirm: true });
    fireEvent.click(screen.getByRole("button", { name: "Mark as confirmed by client" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mark as confirmed" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "You don't have access to that section.", type: "error" }));
    expect(screen.getByTestId("pending-notice")).toBeInTheDocument();
  });

  it("a failed request keeps the notice and shows an error", async () => {
    confirmPagesPanel.mockRejectedValue(new Error("network"));
    seeded("syllabi", { canConfirm: true });
    fireEvent.click(screen.getByRole("button", { name: "Mark as confirmed by client" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mark as confirmed" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Couldn't mark it as confirmed. Please try again.", type: "error" }));
    expect(screen.getByTestId("pending-notice")).toBeInTheDocument();
  });
});
