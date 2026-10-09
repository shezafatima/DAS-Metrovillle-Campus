import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useRouter } from "next/navigation";
import type { ChangePasswordState } from "@/app/admin/(dashboard)/account/actions";
import { ChangePasswordForm } from "./change-password-form";
import { accountCopy } from "@/content/admin";

vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));

const changePasswordMock = vi.fn();
vi.mock("@/app/admin/(dashboard)/account/actions", () => ({
  changePassword: (...args: unknown[]) => changePasswordMock(...args),
  signOutOtherDevices: vi.fn(async () => ({ status: "idle" })),
}));

const replace = vi.fn();
const EMAIL = "admin@example.com";
const CURRENT = "current-password-1";
const NEW = "brand-new-password";

function fill(current = CURRENT, next = NEW, confirm = NEW) {
  fireEvent.change(screen.getByLabelText(accountCopy.changePassword.currentLabel), { target: { value: current } });
  fireEvent.change(screen.getByLabelText(accountCopy.changePassword.newLabel), { target: { value: next } });
  fireEvent.change(screen.getByLabelText(accountCopy.changePassword.confirmLabel), { target: { value: confirm } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: accountCopy.changePassword.submit }));
}

function fields() {
  return {
    current: screen.getByLabelText(accountCopy.changePassword.currentLabel) as HTMLInputElement,
    next: screen.getByLabelText(accountCopy.changePassword.newLabel) as HTMLInputElement,
    confirm: screen.getByLabelText(accountCopy.changePassword.confirmLabel) as HTMLInputElement,
  };
}

function resolveWith(state: ChangePasswordState) {
  changePasswordMock.mockResolvedValue(state);
}

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
  replace.mockClear();
  changePasswordMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChangePasswordForm", () => {
  it("starts empty, with password-manager-friendly fields and the email as the hidden username", () => {
    render(<ChangePasswordForm email={EMAIL} />);
    const { current, next, confirm } = fields();
    for (const input of [current, next, confirm]) {
      expect(input).toHaveValue("");
      expect(input).toHaveAttribute("type", "password");
    }
    expect(current).toHaveAttribute("autocomplete", "current-password");
    expect(next).toHaveAttribute("autocomplete", "new-password");
    expect(confirm).toHaveAttribute("autocomplete", "new-password");

    const username = document.querySelector('input[name="username"]') as HTMLInputElement;
    expect(username).toHaveValue(EMAIL);
    expect(username).toHaveAttribute("autocomplete", "username");
  });

  it("shows a client-side message instantly and does not call the action for a mismatch", async () => {
    render(<ChangePasswordForm email={EMAIL} />);
    fill(CURRENT, NEW, `${NEW}-x`);
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(accountCopy.errors.mismatch);
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("disables submit while pending, and a double click submits once", async () => {
    let finish: (s: ChangePasswordState) => void = () => {};
    changePasswordMock.mockImplementation(() => new Promise<ChangePasswordState>((r) => (finish = r)));
    render(<ChangePasswordForm email={EMAIL} />);
    fill();
    // Keep the element: its label changes to "Changing…" once pending.
    const button = screen.getByRole("button", { name: accountCopy.changePassword.submit });
    try {
      fireEvent.click(button);
      fireEvent.click(button);
      await waitFor(() => expect(button).toBeDisabled());
      expect(button).toHaveTextContent(accountCopy.changePassword.submitting);
    } finally {
      // Always settle the action: React 19 entangles later transitions
      // with an unfinished async action, which would stall other tests.
      finish({ status: "success", passwordChangedAt: "2026-09-28T10:00:00.000Z" });
    }
    await screen.findByText(accountCopy.success);
    expect(changePasswordMock).toHaveBeenCalledTimes(1);
  });

  it("success → clears every field, announces it, and reports the new date", async () => {
    const onPasswordChanged = vi.fn();
    resolveWith({ status: "success", passwordChangedAt: "2026-09-28T10:00:00.000Z" });
    render(<ChangePasswordForm email={EMAIL} onPasswordChanged={onPasswordChanged} />);
    fill();
    submit();
    expect(await screen.findByRole("status")).toHaveTextContent(accountCopy.success);
    await waitFor(() => {
      const { current, next, confirm } = fields();
      expect([current.value, next.value, confirm.value]).toEqual(["", "", ""]);
    });
    expect(onPasswordChanged).toHaveBeenCalledWith("2026-09-28T10:00:00.000Z");
  });

  it("wrong_current → clears and focuses only the current field", async () => {
    resolveWith({ status: "error", error: "wrong_current" });
    render(<ChangePasswordForm email={EMAIL} />);
    fill();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(accountCopy.errors.wrong_current);
    await waitFor(() => {
      const { current } = fields();
      expect(current.value).toBe("");
      expect(document.activeElement).toBe(current);
    });
    const { next, confirm } = fields();
    expect([next.value, confirm.value]).toEqual([NEW, NEW]);
  });

  it("unavailable → keeps what was typed", async () => {
    resolveWith({ status: "error", error: "unavailable" });
    render(<ChangePasswordForm email={EMAIL} />);
    fill();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(accountCopy.errors.unavailable);
    const { current, next, confirm } = fields();
    expect([current.value, next.value, confirm.value]).toEqual([CURRENT, NEW, NEW]);
  });

  it("changed_others_remain → cleared, a status (not an error) and an inline Sign out other devices button", async () => {
    const onPasswordChanged = vi.fn();
    resolveWith({ status: "changed_others_remain", passwordChangedAt: "2026-09-28T10:00:00.000Z" });
    render(<ChangePasswordForm email={EMAIL} onPasswordChanged={onPasswordChanged} />);
    fill();
    submit();
    expect(await screen.findByRole("status")).toHaveTextContent(accountCopy.changedOthersRemain);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: accountCopy.signOutOthers.button })).toBeInTheDocument();
    await waitFor(() => expect(fields().current.value).toBe(""));
    expect(onPasswordChanged).toHaveBeenCalledWith("2026-09-28T10:00:00.000Z");
  });

  it("changed_signed_out → the log-in-again message and link", async () => {
    resolveWith({ status: "changed_signed_out" });
    render(<ChangePasswordForm email={EMAIL} />);
    fill();
    submit();
    expect(await screen.findByRole("status")).toHaveTextContent("Sign out other devices");
    expect(screen.getByRole("link", { name: accountCopy.loginAgainLink })).toHaveAttribute(
      "href",
      "/admin/login?next=%2Fadmin%2Faccount",
    );
    await waitFor(() => expect(fields().current.value).toBe(""));
  });

  it("unconfirmed → cleared, with the could-not-confirm message", async () => {
    resolveWith({ status: "unconfirmed" });
    render(<ChangePasswordForm email={EMAIL} />);
    fill();
    submit();
    expect(await screen.findByText(accountCopy.unconfirmed)).toBeInTheDocument();
    await waitFor(() => expect(fields().next.value).toBe(""));
  });

  it("unauthorized → sends the browser to login, returning to the Account page", async () => {
    resolveWith({ status: "error", error: "unauthorized" });
    render(<ChangePasswordForm email={EMAIL} />);
    fill();
    submit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login?next=%2Fadmin%2Faccount"));
  });

  it("registers a beforeunload warning only once a field has text", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<ChangePasswordForm email={EMAIL} />);
    expect(addSpy.mock.calls.filter((c) => c[0] === "beforeunload")).toHaveLength(0);
    fireEvent.change(fields().current, { target: { value: "x" } });
    await waitFor(() => expect(addSpy.mock.calls.filter((c) => c[0] === "beforeunload").length).toBeGreaterThan(0));
  });
});
