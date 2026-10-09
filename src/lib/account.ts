import { getAuth } from "@/lib/auth";

/**
 * When the admin's password was last set (010 FR-012): the credential
 * account's own `updatedAt`, which Better Auth stamps on every password
 * write — the Account page's change and the setup command's `--reset`
 * alike. At creation it equals the first-set time.
 *
 * Reads through the internal adapter, so it needs no live session: it
 * still works right after a password change has replaced every session
 * (research §5, /sp.analyze I2). Only the date leaves this function —
 * never the account object, which carries the password hash.
 */
export async function getPasswordChangedAt(userId: string): Promise<Date | null> {
  const auth = await getAuth();
  const ctx = await auth.$context;
  const account = await ctx.internalAdapter.findCredentialAccount(userId);
  const updatedAt = account?.updatedAt;
  return updatedAt ? new Date(updatedAt) : null;
}
