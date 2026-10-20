/**
 * Placeholders show only in `next dev`, never in a build, unless the test
 * seam forces production. Shared by About (017) and Academics (018).
 */
export function showPlaceholders({
  nodeEnv,
  forceProduction,
}: {
  nodeEnv: string | undefined;
  forceProduction: boolean;
}): boolean {
  return nodeEnv === "development" && !forceProduction;
}
