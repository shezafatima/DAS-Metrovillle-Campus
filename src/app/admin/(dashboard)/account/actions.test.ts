// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { APIError } from "better-auth/api";

// Distinctive values so any leak is easy to spot (FR-015, SC-005).
const CURRENT = "leak-check-current-A1";
const NEW = "leak-check-new-B2";
const USER_ID = "user-123";
const EMAIL = "admin@example.com";

const originalHeaders = new Headers({ cookie: "better-auth.session_token=OLD", "x-forwarded-for": "203.0.113.5" });
const authHeaders = new Headers({ cookie: "better-auth.session_token=CURRENT", "x-forwarded-for": "203.0.113.5" });

const requireAdminAccessMock = vi.fn();
const getPasswordChangedAtMock = vi.fn();
const clearKeysMock = vi.fn();
const logSecurityEventMock = vi.fn();
const changePasswordMock = vi.fn();
const revokeOtherSessionsMock = vi.fn();
const getSessionMock = vi.fn();
const findCredentialAccountMock = vi.fn();
const verifyMock = vi.fn();

vi.mock("next/headers", () => ({ headers: async () => originalHeaders }));
vi.mock("@/lib/dal", () => ({
  requireAdminAccess: (...args: unknown[]) => requireAdminAccessMock(...args),
  getAuthRequestHeaders: async () => authHeaders,
}));
vi.mock("@/lib/account", () => ({
  getPasswordChangedAt: (...args: unknown[]) => getPasswordChangedAtMock(...args),
}));
vi.mock("@/lib/rate-limit", () => ({
  PASSWORD_CHANGE_POLICY: { threshold: 5, windowSeconds: 900, blockSeconds: 900 },
  clearKeys: (...args: unknown[]) => clearKeysMock(...args),
  isBlocked: vi.fn(),
  recordFailure: vi.fn(),
}));
vi.mock("@/lib/log", () => ({
  logSecurityEvent: (...args: unknown[]) => logSecurityEventMock(...args),
}));
vi.mock("@/lib/auth", () => ({
  getAuth: async () => ({
    api: {
      changePassword: (...args: unknown[]) => changePasswordMock(...args),
      revokeOtherSessions: (...args: unknown[]) => revokeOtherSessionsMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
    $context: Promise.resolve({
      internalAdapter: { findCredentialAccount: (...args: unknown[]) => findCredentialAccountMock(...args) },
      password: { verify: (...args: unknown[]) => verifyMock(...args) },
    }),
  }),
}));

const CHANGED_AT = new Date("2026-09-28T10:00:00.000Z");

function form(fields: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) fd.set(key, value);
  return fd;
}

const validForm = () => form({ currentPassword: CURRENT, newPassword: NEW, confirmPassword: NEW });

async function runChange(fd: FormData = validForm()) {
  const { changePassword } = await import("./actions");
  return changePassword({ status: "idle" }, fd);
}

async function runSignOutOthers() {
  const { signOutOtherDevices } = await import("./actions");
  return signOutOtherDevices();
}

let consoleSpies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminAccessMock.mockResolvedValue({ ok: true, session: { userId: USER_ID, email: EMAIL, sessionId: "s1", role: "content_manager", permissions: [] } });
  getPasswordChangedAtMock.mockResolvedValue(CHANGED_AT);
  clearKeysMock.mockResolvedValue(undefined);
  changePasswordMock.mockResolvedValue({ token: "t", user: { id: USER_ID } });
  revokeOtherSessionsMock.mockResolvedValue({ status: true });
  consoleSpies = (["info", "warn", "error", "log"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => {}),
  );
});

afterEach(() => {
  for (const spy of consoleSpies) spy.mockRestore();
});

/** Everything logged or returned must be free of both passwords. */
function expectNoLeak(state: unknown) {
  const captured = [
    JSON.stringify(state),
    ...consoleSpies.flatMap((spy) => spy.mock.calls.map((call) => JSON.stringify(call, (_k, v) => (v instanceof Error ? `${v.name}:${v.message}` : v)))),
    ...logSecurityEventMock.mock.calls.map((call) => JSON.stringify(call)),
  ].join("\n");
  expect(captured).not.toContain(CURRENT);
  expect(captured).not.toContain(NEW);
}

describe("which access each account action asks for (011)", () => {
  it("changePassword needs the main-admin role: only a main admin changes a password", async () => {
    await runChange();
    expect(requireAdminAccessMock).toHaveBeenCalledWith("main_admin");
  });

  it("changePassword returns the refusal untouched for a content manager, calling Better Auth never", async () => {
    requireAdminAccessMock.mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(await runChange()).toEqual({ status: "error", error: "forbidden" });
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("signing out other devices stays open to any signed-in role", async () => {
    await runSignOutOthers();
    expect(requireAdminAccessMock).toHaveBeenCalledWith("any");
  });
});

describe("changePassword — branch map (contracts/account-actions.md)", () => {
  it("no session → unauthorized, Better Auth never called", async () => {
    requireAdminAccessMock.mockResolvedValue({ ok: false, reason: "unauthorized" });
    const state = await runChange();
    expect(state).toEqual({ status: "error", error: "unauthorized" });
    expect(changePasswordMock).not.toHaveBeenCalled();
    expectNoLeak(state);
  });

  it.each([
    ["invalid", form({ currentPassword: CURRENT, newPassword: NEW })],
    ["too_short", form({ currentPassword: CURRENT, newPassword: "short", confirmPassword: "short" })],
    ["too_long", form({ currentPassword: CURRENT, newPassword: "a".repeat(129), confirmPassword: "a".repeat(129) })],
    ["mismatch", form({ currentPassword: CURRENT, newPassword: NEW, confirmPassword: `${NEW}-x` })],
    ["same_as_current", form({ currentPassword: CURRENT, newPassword: CURRENT, confirmPassword: CURRENT })],
  ])("validation %s → that key, Better Auth never called", async (key, fd) => {
    const state = await runChange(fd);
    expect(state).toEqual({ status: "error", error: key });
    expect(changePasswordMock).not.toHaveBeenCalled();
    expectNoLeak(state);
  });

  it.each([
    [new APIError("TOO_MANY_REQUESTS", { code: "PASSWORD_CHANGE_BLOCKED", message: "x" }), "blocked"],
    [new APIError("BAD_REQUEST", { code: "INVALID_PASSWORD", message: "Invalid password" }), "wrong_current"],
    [new APIError("UNAUTHORIZED", { code: "UNAUTHORIZED", message: "Unauthorized" }), "unauthorized"],
    [new APIError("BAD_REQUEST", { code: "PASSWORD_TOO_SHORT", message: "x" }), "too_short"],
    [new APIError("BAD_REQUEST", { code: "PASSWORD_TOO_LONG", message: "x" }), "too_long"],
  ])("Better Auth %s → %s", async (error, key) => {
    changePasswordMock.mockRejectedValue(error);
    const state = await runChange();
    expect(state).toEqual({ status: "error", error: key });
    expect(findCredentialAccountMock).not.toHaveBeenCalled(); // no saved-check for expected errors
    expectNoLeak(state);
  });

  it("success → ISO passwordChangedAt from the session-free helper; revokes other sessions; uses the rebuilt headers", async () => {
    const state = await runChange();
    expect(state).toEqual({ status: "success", passwordChangedAt: CHANGED_AT.toISOString() });
    expect(changePasswordMock).toHaveBeenCalledWith({
      body: { currentPassword: CURRENT, newPassword: NEW, revokeOtherSessions: true },
      headers: authHeaders,
    });
    expect(getPasswordChangedAtMock).toHaveBeenCalledWith(USER_ID);
    expect(logSecurityEventMock).toHaveBeenCalledWith(expect.objectContaining({ type: "password_changed", outcome: "ok" }));
    expectNoLeak(state);
  });

  it("the target account always comes from the session, never from the form", async () => {
    const fd = validForm();
    fd.set("userId", "someone-else");
    fd.set("email", "someone-else@example.com");
    await runChange(fd);
    expect(getPasswordChangedAtMock).toHaveBeenCalledWith(USER_ID);
    const body = changePasswordMock.mock.calls[0][0].body;
    expect(Object.keys(body).sort()).toEqual(["currentPassword", "newPassword", "revokeOtherSessions"]);
  });

  it("does not call revalidatePath (the cookie write already re-renders — research §13)", () => {
    const source = readFileSync(path.join(__dirname, "actions.ts"), "utf8");
    expect(source).not.toContain("next/cache");
    expect(source).not.toMatch(/revalidatePath\s*\(/);
  });
});

describe("changePassword — saved-check after an unexpected error (FR-011)", () => {
  beforeEach(() => {
    changePasswordMock.mockRejectedValue(new Error("connection reset"));
    findCredentialAccountMock.mockResolvedValue({ password: "stored-hash", updatedAt: CHANGED_AT });
  });

  it("not saved → unavailable", async () => {
    verifyMock.mockResolvedValue(false);
    const state = await runChange();
    expect(state).toEqual({ status: "error", error: "unavailable" });
    expect(verifyMock).toHaveBeenCalledWith({ hash: "stored-hash", password: NEW });
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(clearKeysMock).not.toHaveBeenCalled();
    expectNoLeak(state);
  });

  it("saved and this device still signed in → changed_others_remain", async () => {
    verifyMock.mockResolvedValue(true);
    getSessionMock.mockResolvedValue({ session: { id: "s1" }, user: { id: USER_ID } });
    const state = await runChange();
    expect(state).toEqual({ status: "changed_others_remain", passwordChangedAt: CHANGED_AT.toISOString() });
    expect(clearKeysMock).toHaveBeenCalledWith([`password-change:user:${USER_ID}`]);
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "password_changed", outcome: "sessions_not_revoked" }),
    );
    expectNoLeak(state);
  });

  it("saved and this device's session gone → changed_signed_out", async () => {
    verifyMock.mockResolvedValue(true);
    getSessionMock.mockResolvedValue(null);
    const state = await runChange();
    expect(state).toEqual({ status: "changed_signed_out" });
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "password_changed", outcome: "current_session_lost" }),
    );
    expectNoLeak(state);
  });

  it("probes the OLD session with the original raw headers, not the rebuilt ones", async () => {
    verifyMock.mockResolvedValue(true);
    getSessionMock.mockResolvedValue(null);
    await runChange();
    expect(getSessionMock.mock.calls[0][0].headers).toBe(originalHeaders);
  });

  it("saved but the session probe itself fails → changed_others_remain (true either way)", async () => {
    verifyMock.mockResolvedValue(true);
    getSessionMock.mockRejectedValue(new Error("db down"));
    const state = await runChange();
    expect(state).toEqual({ status: "changed_others_remain", passwordChangedAt: CHANGED_AT.toISOString() });
  });

  it("the check itself fails → unconfirmed, never 'nothing changed'", async () => {
    findCredentialAccountMock.mockRejectedValue(new Error("db down"));
    const state = await runChange();
    expect(state).toEqual({ status: "unconfirmed" });
    expect(logSecurityEventMock).toHaveBeenCalledWith(expect.objectContaining({ type: "password_change_unconfirmed" }));
    expectNoLeak(state);
  });

  it("a 5xx APIError also goes through the saved-check", async () => {
    changePasswordMock.mockRejectedValue(new APIError("INTERNAL_SERVER_ERROR", { code: "FAILED_TO_GET_SESSION", message: "x" }));
    verifyMock.mockResolvedValue(true);
    getSessionMock.mockResolvedValue(null);
    expect(await runChange()).toEqual({ status: "changed_signed_out" });
  });

  it("never returns unavailable when the new password verifies", async () => {
    verifyMock.mockResolvedValue(true);
    for (const probe of [() => getSessionMock.mockResolvedValue(null), () => getSessionMock.mockResolvedValue({ session: {} }), () => getSessionMock.mockRejectedValue(new Error("x"))]) {
      probe();
      const state = await runChange();
      expect(state).not.toEqual({ status: "error", error: "unavailable" });
    }
  });
});

describe("signOutOtherDevices (US2)", () => {
  it("no session → unauthorized, Better Auth never called", async () => {
    requireAdminAccessMock.mockResolvedValue({ ok: false, reason: "unauthorized" });
    expect(await runSignOutOthers()).toEqual({ status: "error", error: "unauthorized" });
    expect(revokeOtherSessionsMock).not.toHaveBeenCalled();
  });

  it("success → success, logged, called only with the rebuilt headers (it accepts no input at all)", async () => {
    const { signOutOtherDevices } = await import("./actions");
    expect(signOutOtherDevices.length).toBe(0);
    expect(await runSignOutOthers()).toEqual({ status: "success" });
    expect(revokeOtherSessionsMock).toHaveBeenCalledWith({ headers: authHeaders });
    expect(logSecurityEventMock).toHaveBeenCalledWith(expect.objectContaining({ type: "other_sessions_revoked" }));
  });

  it("failure → unavailable", async () => {
    revokeOtherSessionsMock.mockRejectedValue(new Error("db down"));
    expect(await runSignOutOthers()).toEqual({ status: "error", error: "unavailable" });
  });
});
