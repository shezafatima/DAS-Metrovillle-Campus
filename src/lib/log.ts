/**
 * Structured security-event logging (FR-034). Every failed login, block,
 * successful login, logout, and admin password reset is written to the
 * application log as one JSON line — timestamp, event type, source
 * address, and outcome. Never a password, hash, or session identifier;
 * the type below has no field for any of those, so a caller literally
 * cannot pass one through.
 */

export type SecurityEventType =
  | "login_failed"
  | "login_blocked"
  | "login_success"
  | "logout"
  | "password_reset";

export interface SecurityEvent {
  type: SecurityEventType;
  ip?: string;
  email?: string;
  outcome?: string;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const line = {
    at: new Date().toISOString(),
    kind: "security",
    type: event.type,
    ip: event.ip ?? null,
    email: event.email ?? null,
    outcome: event.outcome ?? null,
  };
  console.info(JSON.stringify(line));
}
