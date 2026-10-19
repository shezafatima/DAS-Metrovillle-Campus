import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePagesPanel, saveSettingsPanel } from "@/app/admin/(dashboard)/settings/actions";
import { SettingsPanelForm } from "./settings-panel-form";

vi.mock("@/app/admin/(dashboard)/settings/actions", () => ({ saveSettingsPanel: vi.fn(), savePagesPanel: vi.fn() }));
vi.mock("@/components/ui/toaster", () => ({ toast: vi.fn() }));

const FP = "a".repeat(32);
const windowInitial = { data: { opensOn: "2027-01-01", closesOn: "2027-03-31" }, fingerprint: FP, lastSaved: null };
const messagesInitial = { data: { announcement: "Open", closedMessage: "Soon" }, fingerprint: FP, lastSaved: null };

beforeEach(() => {
  vi.mocked(saveSettingsPanel).mockReset();
  vi.mocked(savePagesPanel).mockReset();
});

describe("SettingsPanelForm read-only (014 FR-018)", () => {
  it("renders a disabled fieldset, no Save button, and the permission it needs", () => {
    render(<SettingsPanelForm panel="admission-window" initial={windowInitial} readOnly />);
    expect(document.querySelector("fieldset")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.getByTestId("panel-read-only")).toHaveTextContent("You need the Settings permission to change this.");
  });

  it("names Page content for a Pages panel", () => {
    render(<SettingsPanelForm panel="admission-messages" initial={messagesInitial} readOnly />);
    expect(screen.getByTestId("panel-read-only")).toHaveTextContent("You need the Page content permission to change this.");
  });

  it("never calls a save action", () => {
    render(<SettingsPanelForm panel="admission-window" initial={windowInitial} readOnly />);
    fireEvent.submit(document.querySelector("form")!);
    expect(saveSettingsPanel).not.toHaveBeenCalled();
    expect(savePagesPanel).not.toHaveBeenCalled();
  });
});

describe("SettingsPanelForm saves through the action for its permission", () => {
  it("a Settings panel uses saveSettingsPanel with its fingerprint", async () => {
    vi.mocked(saveSettingsPanel).mockResolvedValue({ status: "error", error: "conflict" });
    render(<SettingsPanelForm panel="admission-window" initial={windowInitial} />);
    fireEvent.change(screen.getByLabelText(/Closes on/), { target: { value: "2027-04-30" } });
    fireEvent.submit(document.querySelector("form")!);
    await vi.waitFor(() => expect(saveSettingsPanel).toHaveBeenCalled());
    expect(saveSettingsPanel).toHaveBeenCalledWith({
      panel: "admission-window",
      expectedFingerprint: FP,
      data: { opensOn: "2027-01-01", closesOn: "2027-04-30" },
    });
    expect(savePagesPanel).not.toHaveBeenCalled();
  });

  it("a Pages panel uses savePagesPanel, and takes the new fingerprint after a success", async () => {
    vi.mocked(savePagesPanel)
      .mockResolvedValueOnce({ status: "success", version: 2, fingerprint: "b".repeat(32), data: { announcement: "New", closedMessage: "Soon" }, savedAt: new Date().toISOString(), updatedBy: "me@x.test" })
      .mockResolvedValueOnce({ status: "error", error: "conflict" });
    render(<SettingsPanelForm panel="admission-messages" initial={messagesInitial} />);
    fireEvent.change(screen.getByLabelText(/Announcement/), { target: { value: "New" } });
    fireEvent.submit(document.querySelector("form")!);
    await vi.waitFor(() => expect(savePagesPanel).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeDisabled());

    fireEvent.change(screen.getByLabelText(/Announcement/), { target: { value: "Newer" } });
    fireEvent.submit(document.querySelector("form")!);
    await vi.waitFor(() => expect(savePagesPanel).toHaveBeenCalledTimes(2));
    expect(vi.mocked(savePagesPanel).mock.calls[1][0]).toMatchObject({ expectedFingerprint: "b".repeat(32) });
  });
});
