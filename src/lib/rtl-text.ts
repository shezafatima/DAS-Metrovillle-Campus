const ARABIC_SCRIPT_PATTERN = /[؀-ۿݐ-ݿ]/;

// Urdu is written in the Arabic script — detect it to swap in the Urdu
// fallback font (docs/architecture.md, FR-022) without hardcoding per label.
export function isRtlScript(text: string): boolean {
  return ARABIC_SCRIPT_PATTERN.test(text);
}
