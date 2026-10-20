import { randomInt } from "node:crypto";
import { REFERENCE_ALPHABET, REFERENCE_LENGTH } from "./rules";

/** A random reference for a registration (research §6). Random, so it reveals neither count nor order. */
export function newReference(): string {
  let reference = "";
  for (let i = 0; i < REFERENCE_LENGTH; i += 1) {
    reference += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }
  return reference;
}
