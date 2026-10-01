import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SignOutOthersCard } from "./sign-out-others-card";
import { accountCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";

const signOutOtherDevicesMock = vi.fn();
vi.mock("@/app/admin/(dashboard)/account/actions", () => ({
  signOutOtherDevices: (...args: unknown[]) => signOutOtherDevicesMock(...args),
  changePassword: vi.fn(),
}));

const copy = accountCopy.signOutOthers;
const ISO = "2026-09-28T10:00:00.000Z";

beforeEach(() => {
  signOutOtherDevicesMock.mockReset();
});

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: copy.button }));
  return screen.findByRole("alertdialog");
}

describe("SignOutOthersCard", () => {
  it("shows when the password was last changed, or Unavailable", () => {
    const { rerender } = render(<SignOutOthersCard lastChangedAt={ISO} />);
    expect(screen.getByTestId("password-last-changed")).toHaveTextContent(formatAdminDateTime(new Date(ISO)));

    rerender(<SignOutOthersCard lastChangedAt={null} />);
    expect(screen.getByTestId("password-last-changed")).toHaveTextContent(accountCopy.lastChangedUnavailable);
  });

  it("updates the date when the prop changes (no reload after a password change)", () => {
    const later = "2026-09-29T08:30:00.000Z";
    const { rerender } = render(<SignOutOthersCard lastChangedAt={ISO} />);
    rerender(<SignOutOthersCard lastChangedAt={later} />);
    expect(screen.getByTestId("password-last-changed")).toHaveTextContent(formatAdminDateTime(new Date(later)));
  });

  it("Cancel closes the dialog without signing anything out", async () => {
    render(<SignOutOthersCard lastChangedAt={ISO} />);
    const dialog = await openDialog();
    expect(dialog).toHaveTextContent(copy.dialogBody);
    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(signOutOtherDevicesMock).not.toHaveBeenCalled();
  });

  it("Confirm signs out other devices and announces it", async () => {
    signOutOtherDevicesMock.mockResolvedValue({ status: "success" });
    render(<SignOutOthersCard lastChangedAt={ISO} />);
    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: copy.confirm }));
    expect(await screen.findByRole("status")).toHaveTextContent(copy.success);
    expect(signOutOtherDevicesMock).toHaveBeenCalledTimes(1);
  });

  it("a failure shows the retry message", async () => {
    signOutOtherDevicesMock.mockResolvedValue({ status: "error", error: "unavailable" });
    render(<SignOutOthersCard lastChangedAt={ISO} />);
    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: copy.confirm }));
    expect(await screen.findByRole("status")).toHaveTextContent(copy.unavailable);
  });
});
