/**
 * Structured security-event logging (FR-034). Every failed login, block,
 * successful login, logout, and admin password reset is written to the
 * application log as one JSON line — timestamp, event type, source
 * address, and outcome. Never a password, hash, or session identifier;
 * the type below has no field for any of those, so a caller literally
 * cannot pass one through.
 *
 * 010 adds the Account page's events: a panel password change (outcome
 * `ok` | `sessions_not_revoked` | `current_session_lost`), a wrong
 * current password, its block, an unconfirmable change, and signing out
 * other devices (010 FR-016).
 *
 * 011 adds the roles events (FR-033): access refused for a missing
 * permission, and account lifecycle changes made by a main admin
 * (`email` is the actor, `target` the account acted on). Still no field
 * that could carry a password (one the admin set included) or a
 * session identifier.
 */

export type SecurityEventType =
  | "login_failed"
  | "login_blocked"
  | "login_success"
  | "logout"
  | "password_reset"
  | "password_changed"
  | "password_change_failed"
  | "password_change_blocked"
  | "password_change_unconfirmed"
  | "other_sessions_revoked"
  | "access_denied"
  | "user_created"
  | "user_access_changed"
  | "user_disabled"
  | "user_enabled"
  | "user_deleted"
  | "password_set"
  | "settings_saved"
  | "settings_read_failed"
  | "gallery_changed"
  | "gallery_migrated"
  | "gallery_read_failed"
  // 012 careers: `target` carries the application id only, never a name, file key or URL.
  | "career_cv_missing"
  | "career_cv_delete_failed"
  | "careers_sweep_failed";

export interface SecurityEvent {
  type: SecurityEventType;
  ip?: string;
  email?: string;
  outcome?: string;
  /** The account acted on, for events one admin performs on another (011). */
  target?: string;
  /** The access key that was required, for `access_denied` (011). */
  access?: string;
  /** The Settings group key, for `settings_saved` / `settings_read_failed` (005). Never field values. */
  group?: string;
  /** The gallery action name, for `gallery_changed` (007). Never captions or descriptions; `target` carries the album title. */
  action?: string;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const line = {
    at: new Date().toISOString(),
    kind: "security",
    type: event.type,
    ip: event.ip ?? null,
    email: event.email ?? null,
    outcome: event.outcome ?? null,
    target: event.target ?? null,
    access: event.access ?? null,
    group: event.group ?? null,
    action: event.action ?? null,
  };
  console.info(JSON.stringify(line));
}
