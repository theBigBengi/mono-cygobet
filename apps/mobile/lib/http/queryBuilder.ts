// lib/http/queryBuilder.ts
// Utility for building URL query strings from parameters.
// - Handles arrays by repeating keys (leagues=1&leagues=2, not leagues=1,2)
// - Ignores undefined/null values
// - Encodes values as strings

/**
 * Build query string with proper array encoding.
 * - Scalars: single key=value
 * - Arrays: repeated keys (leagues=1&leagues=2, not leagues=1,2)
 * - Never overwrites previously set values for the same key.
 * - Ignores undefined/null values
 * - Ignores empty strings (after trim)
 */
export function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // Arrays: append each element as a separate key (filter empty strings)
      for (const item of value) {
        const str = String(item);
        if (str.trim()) {
          search.append(key, str);
        }
      }
    } else {
      // Scalars: single key=value (skip empty strings after trim)
      const str = String(value);
      if (str.trim()) {
        search.set(key, str);
      }
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
