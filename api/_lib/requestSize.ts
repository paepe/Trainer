/** Bounds already-parsed JSON before an endpoint performs any downstream I/O. */
export function isJsonValueWithinLimit(value: unknown, maxChars: number): boolean {
  try {
    return JSON.stringify(value).length <= maxChars;
  } catch {
    return false;
  }
}
