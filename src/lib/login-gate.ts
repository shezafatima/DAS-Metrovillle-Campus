import { APIError } from "better-auth/api";

interface GateUser {
  disabledAt?: unknown;
  deletedAt?: unknown;
}

/**
 * Runs from Better Auth's `session.create.before` hook — i.e. only after
 * the password has been verified, for every sign-in path (the login
 * Server Action and the mounted HTTP route alike; 011 research §5).
 *
 * A disabled or deleted account gets the SAME 401 status, code and message
 * as a wrong password, so login never reveals an account's state (FR-028).
 * Being a 401, it also counts as a failed login.
 *
 * Throws instead of returning `false`: a `false` would yield a session-less
 * null that the sign-in route turns into a 500.
 */
export function assertMayLogIn(user: GateUser | null | undefined): void {
  if (!user) return;
  if (user.disabledAt || user.deletedAt) {
    throw new APIError("UNAUTHORIZED", {
      message: "Invalid email or password",
      code: "INVALID_EMAIL_OR_PASSWORD",
    });
  }
}
