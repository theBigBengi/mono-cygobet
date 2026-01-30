/**
 * Shared ETL utilities. Used by both seeds and sync (no reverse dependency on seeds).
 */

/**
 * Safely converts a value to BigInt, preventing NaN → BigInt conversion errors.
 */
export function safeBigInt(value: number | string | bigint): bigint {
  if (typeof value === "bigint") return value;

  if (typeof value === "string") {
    const s = value.trim();
    if (s.length === 0)
      throw new Error("Invalid BigInt conversion: empty string");
    try {
      return BigInt(s);
    } catch {
      throw new Error(
        `Invalid BigInt conversion: cannot parse "${value}" as BigInt`
      );
    }
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid BigInt conversion: ${value} is not finite`);
    }
    if (!Number.isInteger(value)) {
      throw new Error(`Invalid BigInt conversion: ${value} is not an integer`);
    }
    if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      throw new Error(
        `Invalid BigInt conversion: ${value} exceeds MAX_SAFE_INTEGER; pass as string`
      );
    }
    return BigInt(value);
  }

  throw new Error(`Invalid BigInt conversion: unexpected type ${typeof value}`);
}

/**
 * Split an array into chunks of up to `size` elements.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
