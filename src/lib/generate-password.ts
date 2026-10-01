/**
 * The user panel's "Generate" button (011): fills the password field with a
 * strong password the admin can read out or paste. The admin may just as
 * well type their own. Either way the main admin controls it (Constitution
 * III): it is the user's password until a main admin changes it.
 *
 * 20 characters drawn uniformly, with rejection sampling so no character
 * is likelier than another, from letters and digits without the
 * look-alikes (0 O 1 l I L): easy to read out over the phone. About 116
 * bits of entropy. Uses Web Crypto, so this one module runs in the browser
 * (the Generate button) and on the server.
 *
 * The value exists only in the panel while it is open and in the request
 * that saves it: it is hashed by Better Auth's password hasher and never
 * stored readable, returned, logged or recorded (src/lib/users/mutations.ts).
 */
export const GENERATED_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export const GENERATED_PASSWORD_LENGTH = 20;

export function generatePassword(length: number = GENERATED_PASSWORD_LENGTH): string {
  const size = GENERATED_PASSWORD_ALPHABET.length;
  // Bytes at or above this would make the first characters likelier.
  const limit = 256 - (256 % size);
  let out = "";
  while (out.length < length) {
    const bytes = new Uint8Array(length * 2);
    globalThis.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= limit) continue;
      out += GENERATED_PASSWORD_ALPHABET[byte % size];
      if (out.length === length) break;
    }
  }
  return out;
}
