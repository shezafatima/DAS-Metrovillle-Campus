import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserPanel, type UserPanelState } from "./user-panel";
import { usersCopy } from "@/content/admin";
import { PERMISSION_KEYS, PERMISSION_LABELS } from "@/lib/permissions";
import { GENERATED_PASSWORD_LENGTH } from "@/lib/generate-password";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/ui/toaster", () => ({ toast: vi.fn() }));

const copy = usersCopy.panel;
const actionMock = vi.fn<(prev: UserPanelState, fd: FormData) => Promise<UserPanelState>>();
let confirmSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  actionMock.mockReset();
  actionMock.mockResolvedValue({ status: "success" });
  refresh.mockReset();
  confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  confirmSpy.mockRestore();
});

async function openCreate() {
  render(<UserPanel mode="create" action={actionMock} triggerLabel={usersCopy.newUser} triggerVariant="default" />);
  fireEvent.click(screen.getByRole("button", { name: usersCopy.newUser }));
  return screen.findByRole("dialog");
}

const emailInput = () => screen.getByLabelText(copy.emailLabel) as HTMLInputElement;
const passwordInput = () => screen.getByLabelText(copy.passwordLabel, { selector: "input" }) as HTMLInputElement;

describe("UserPanel: add user", () => {
  it("opens over the list with a title, the email, the role, the sections and the password", async () => {
    const dialog = await openCreate();
    expect(dialog).toHaveTextContent(copy.createTitle);
    expect(emailInput()).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: usersCopy.roles.content_manager })).toBeChecked();
    expect(passwordInput()).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").map((b) => (b as HTMLInputElement).value)).toEqual([...PERMISSION_KEYS]);
  });

  it("offers exactly the five grantable sections, never Registrations or Users (FR-004)", async () => {
    const dialog = await openCreate();
    for (const key of PERMISSION_KEYS) {
      expect(screen.getByRole("checkbox", { name: PERMISSION_LABELS[key] })).toBeInTheDocument();
    }
    expect(dialog).not.toHaveTextContent(/registrations/i);
    expect(screen.queryByRole("checkbox", { name: /^users$/i })).toBeNull();
  });

  it("shows the section tickboxes only for a content manager; a main admin implicitly has everything", async () => {
    await openCreate();
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
    fireEvent.click(screen.getByRole("radio", { name: usersCopy.roles.main_admin }));
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryByText(copy.sectionsLabel)).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: usersCopy.roles.content_manager }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
  });

  it("the password is hidden by default and the eye reveals it to read out", async () => {
    await openCreate();
    fireEvent.change(passwordInput(), { target: { value: "typed-by-the-admin" } });
    expect(passwordInput()).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: copy.showPassword }));
    expect(passwordInput()).toHaveAttribute("type", "text");
    expect(passwordInput()).toHaveValue("typed-by-the-admin");
  });

  it("Generate fills a password of the right length and reveals it", async () => {
    await openCreate();
    fireEvent.click(screen.getByRole("button", { name: copy.generate }));
    expect(passwordInput().value).toHaveLength(GENERATED_PASSWORD_LENGTH);
    expect(passwordInput()).toHaveAttribute("type", "text");
    const first = passwordInput().value;
    fireEvent.click(screen.getByRole("button", { name: copy.generate }));
    expect(passwordInput().value).not.toBe(first);
  });

  it("a typed password under 12 characters is refused before anything is sent", async () => {
    await openCreate();
    fireEvent.change(emailInput(), { target: { value: "cm@example.test" } });
    fireEvent.change(passwordInput(), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: copy.create }));
    expect(await screen.findByText(usersCopy.errors.invalidPassword)).toBeInTheDocument();
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("submits the email, the role, each ticked section and the password", async () => {
    await openCreate();
    fireEvent.change(emailInput(), { target: { value: "cm@example.test" } });
    fireEvent.click(screen.getByRole("checkbox", { name: PERMISSION_LABELS.news }));
    fireEvent.click(screen.getByRole("checkbox", { name: PERMISSION_LABELS.messages }));
    fireEvent.change(passwordInput(), { target: { value: "a-perfectly-fine-one" } });
    fireEvent.click(screen.getByRole("button", { name: copy.create }));

    await waitFor(() => expect(actionMock).toHaveBeenCalledTimes(1));
    const formData = actionMock.mock.calls[0]![1];
    expect(formData.get("email")).toBe("cm@example.test");
    expect(formData.get("role")).toBe("content_manager");
    expect(formData.getAll("permissions")).toEqual(["news", "messages"]);
    expect(formData.get("password")).toBe("a-perfectly-fine-one");
  });

  it("a main admin is submitted with no section fields at all", async () => {
    await openCreate();
    fireEvent.change(emailInput(), { target: { value: "boss@example.test" } });
    fireEvent.click(screen.getByRole("radio", { name: usersCopy.roles.main_admin }));
    fireEvent.change(passwordInput(), { target: { value: "a-perfectly-fine-one" } });
    fireEvent.click(screen.getByRole("button", { name: copy.create }));
    await waitFor(() => expect(actionMock).toHaveBeenCalledTimes(1));
    const formData = actionMock.mock.calls[0]![1];
    expect(formData.get("role")).toBe("main_admin");
    expect(formData.getAll("permissions")).toEqual([]);
  });

  it("saving closes the panel and refreshes the list", async () => {
    await openCreate();
    fireEvent.change(emailInput(), { target: { value: "cm@example.test" } });
    fireEvent.change(passwordInput(), { target: { value: "a-perfectly-fine-one" } });
    fireEvent.click(screen.getByRole("button", { name: copy.create }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(refresh).toHaveBeenCalled();
    // Closing after a save never asks about unsaved changes.
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("shows server errors from copy keys: taken email under the email, other errors as an alert", async () => {
    actionMock.mockResolvedValue({ status: "error", error: "email_taken", field: "email" });
    await openCreate();
    fireEvent.change(emailInput(), { target: { value: "cm@example.test" } });
    fireEvent.change(passwordInput(), { target: { value: "a-perfectly-fine-one" } });
    fireEvent.click(screen.getByRole("button", { name: copy.create }));
    expect(await screen.findByText(usersCopy.errors.email_taken)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("the password is forgotten when the panel closes: reopening starts clean and hidden", async () => {
    await openCreate();
    fireEvent.change(passwordInput(), { target: { value: "will-be-forgotten-1" } });
    fireEvent.click(screen.getByRole("button", { name: copy.showPassword }));
    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: usersCopy.newUser }));
    await screen.findByRole("dialog");
    expect(passwordInput()).toHaveValue("");
    expect(passwordInput()).toHaveAttribute("type", "password");
    expect(screen.queryByDisplayValue("will-be-forgotten-1")).toBeNull();
  });
});

describe("UserPanel: closing warns before discarding typed input", () => {
  it("Cancel with nothing typed closes at once, without asking", async () => {
    await openCreate();
    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("Cancel after typing asks first; saying no keeps the panel and what was typed", async () => {
    confirmSpy.mockReturnValue(false);
    await openCreate();
    fireEvent.change(emailInput(), { target: { value: "half@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));

    expect(confirmSpy).toHaveBeenCalledWith(copy.discardPrompt);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(emailInput()).toHaveValue("half@example.test");
  });

  it("…and saying yes closes it", async () => {
    confirmSpy.mockReturnValue(true);
    await openCreate();
    fireEvent.change(emailInput(), { target: { value: "half@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it("the X and Escape ask too when something has been typed", async () => {
    confirmSpy.mockReturnValue(false);
    await openCreate();
    fireEvent.change(passwordInput(), { target: { value: "typed-something" } });

    fireEvent.click(screen.getByRole("button", { name: copy.close }));
    expect(confirmSpy).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(confirmSpy.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Escape with nothing typed closes without asking", async () => {
    await openCreate();
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("ticking a section counts as typed", async () => {
    confirmSpy.mockReturnValue(false);
    await openCreate();
    fireEvent.click(screen.getByRole("checkbox", { name: PERMISSION_LABELS.news }));
    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });
});

describe("UserPanel: edit user", () => {
  const editUser = { id: "u1", email: "cm@example.test", role: "content_manager" as const, permissions: ["settings" as const] };

  function openEdit() {
    render(
      <UserPanel
        mode="edit"
        action={actionMock}
        user={editUser}
        triggerLabel={usersCopy.actions.editAccess}
        triggerAriaLabel={`${usersCopy.actions.editAccess}: ${editUser.email}`}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: `${usersCopy.actions.editAccess}: ${editUser.email}` }));
    return screen.findByRole("dialog");
  }

  it("shows the email read-only, pre-ticks the user's sections, and starts clean (no confirm on cancel)", async () => {
    await openEdit();
    expect(screen.getByText("cm@example.test")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("checkbox", { name: PERMISSION_LABELS.settings })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: PERMISSION_LABELS.news })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("sends the targetId, the changed sections, and an empty password when none is set", async () => {
    await openEdit();
    fireEvent.click(screen.getByRole("checkbox", { name: PERMISSION_LABELS.news }));
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    await waitFor(() => expect(actionMock).toHaveBeenCalledTimes(1));
    const formData = actionMock.mock.calls[0]![1];
    expect(formData.get("targetId")).toBe("u1");
    expect(formData.getAll("permissions").sort()).toEqual(["news", "settings"]);
    expect(formData.get("password")).toBe("");
  });

  it("the password field is optional and labelled as a reset; a filled one is validated and sent", async () => {
    await openEdit();
    const field = screen.getByLabelText(copy.passwordEditLabel, { selector: "input" }) as HTMLInputElement;
    expect(field).not.toBeRequired();

    fireEvent.change(field, { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    expect(await screen.findByText(usersCopy.errors.invalidPassword)).toBeInTheDocument();
    expect(actionMock).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: "a-new-temporary-one" } });
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    await waitFor(() => expect(actionMock).toHaveBeenCalledTimes(1));
    expect(actionMock.mock.calls[0]![1].get("password")).toBe("a-new-temporary-one");
  });

  it("changing the role to main admin hides the sections and counts as a change", async () => {
    confirmSpy.mockReturnValue(false);
    await openEdit();
    fireEvent.click(screen.getByRole("radio", { name: usersCopy.roles.main_admin }));
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });
});
