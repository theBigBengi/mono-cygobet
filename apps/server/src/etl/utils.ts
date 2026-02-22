/**
 * Shared ETL utilities. Used by both seeds and sync (no reverse dependency on seeds).
 */

/**
 * Split an array into chunks of up to `size` elements.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
