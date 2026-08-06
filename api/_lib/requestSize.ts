/** Bounds already-parsed JSON before an endpoint performs any downstream I/O. */
export function isJsonValueWithinLimit(value: unknown, maxChars: number): boolean {
  try {
    return JSON.stringify(value).length <= maxChars;
  } catch {
    return false;
  }
}

/** Parsed request bodies for JSON APIs must be objects, never arrays/primitives. */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
