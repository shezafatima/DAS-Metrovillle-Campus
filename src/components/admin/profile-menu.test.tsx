import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ProfileMenu } from "./profile-menu";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { profileMenuCopy } from "@/content/admin";

const pathnameMock = vi.fn(() => "/admin");
vi.mock("next/navigation", () => ({ usePathname: () => pathnameMock() }));

const logoutMock = vi.fn();
vi.mock("@/app/admin/(dashboard)/actions", () => ({ logout: (...args: unknown[]) => logoutMock(...args) }));

const EMAIL = "sheza@example.com";

function trigger() {
  return screen.getByRole("button", { name: profileMenuCopy.triggerLabel });
}

async function openWithKey(key: "Enter" | " ") {
  const button = trigger();
  button.focus();
  fireEvent.keyDown(button, { key });
  // Base UI opens on the key and on the synthesized click for native buttons.
  fireEvent.click(button);
  return screen.findByRole("menu");
}

function Dirty() {
  useUnsavedChanges(true, "Leave?");
  return null;
}

beforeEach(() => {
  pathnameMock.mockReturnValue("/admin");
  logoutMock.mockReset();
  // jsdom lacks requestSubmit's validation, but has the method; keep it real.
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProfileMenu", () => {
  it("shows the upper-cased initial of the email on the trigger", () => {
    render(<ProfileMenu email={EMAIL} />);
    expect(trigger()).toHaveTextContent("S");
  });

  it("opens with Enter and with Space, showing the email (not a menu item), Account and Logout", async () => {
    for (const key of ["Enter", " "] as const) {
      const { unmount } = render(<ProfileMenu email={EMAIL} />);
      const menu = await openWithKey(key);
      expect(menu).toHaveTextContent(EMAIL);
      const items = screen.getAllByRole("menuitem");
      expect(items.map((item) => item.textContent)).toEqual([profileMenuCopy.account, profileMenuCopy.logout]);
      expect(items.some((item) => item.textContent === EMAIL)).toBe(false);
      unmount();
    }
  });

  it("ArrowDown moves between items; Escape closes and returns focus to the trigger", async () => {
    render(<ProfileMenu email={EMAIL} />);
    const menu = await openWithKey("Enter");
    const [account, logout] = screen.getAllByRole("menuitem");

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    await waitFor(() => expect([account, logout]).toContain(document.activeElement));
    const first = document.activeElement;
    fireEvent.keyDown(document.activeElement ?? menu, { key: "ArrowDown" });
    await waitFor(() => expect(document.activeElement).not.toBe(first));

    fireEvent.keyDown(document.activeElement ?? menu, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger()));
  });

  it("closes on an outside click", async () => {
    render(
      <>
        <ProfileMenu email={EMAIL} />
        <p>outside</p>
      </>,
    );
    await openWithKey("Enter");
    fireEvent.pointerDown(screen.getByText("outside"));
    fireEvent.mouseDown(screen.getByText("outside"));
    fireEvent.click(screen.getByText("outside"));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("Account links to the Account page, is marked current there, and choosing it closes the menu", async () => {
    pathnameMock.mockReturnValue("/admin/account");
    render(<ProfileMenu email={EMAIL} />);
    await openWithKey("Enter");
    const account = screen.getByRole("menuitem", { name: profileMenuCopy.account });
    expect(account).toHaveAttribute("href", "/admin/account");
    expect(account).toHaveAttribute("aria-current", "page");
    fireEvent.click(account);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("Logout submits the 002 logout action", async () => {
    render(<ProfileMenu email={EMAIL} />);
    await openWithKey("Enter");
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: profileMenuCopy.logout }));
    });
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
  });

  it("with unsaved input on the page, cancelling the prompt stops Logout", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <>
        <Dirty />
        <ProfileMenu email={EMAIL} />
      </>,
    );
    await openWithKey("Enter");
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: profileMenuCopy.logout }));
    });
    expect(confirmSpy).toHaveBeenCalledWith("Leave?");
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("with unsaved input on the page, confirming lets Logout go ahead", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <>
        <Dirty />
        <ProfileMenu email={EMAIL} />
      </>,
    );
    await openWithKey("Enter");
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: profileMenuCopy.logout }));
    });
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
  });
});
