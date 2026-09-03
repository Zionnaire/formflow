const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses the same "15m" / "30d" style strings jose's setExpirationTime() accepts, into milliseconds. */
export function parseDurationMs(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(input.trim());
  if (!match?.[1] || !match[2]) throw new Error(`Invalid duration string: "${input}" (expected e.g. "15m", "30d")`);
  return Number(match[1]) * UNIT_MS[match[2]]!;
}
