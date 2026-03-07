// utils/short-code.ts
// Generate a 3-letter short code from a team/league name when one is not available from the data provider.

/**
 * Generate a short code from a name.
 *
 * Rules:
 * - 1 word  → first 3 characters (Liverpool → LIV)
 * - 2 words → first char of word 1 + first 2 chars of word 2 (Real Madrid → RMA, Manchester United → MUN)
 * - 3+ words → first char of each word up to 3 (West Ham United → WHU)
 */
export function generateShortCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "???";

  if (words.length === 1) {
    return words[0]!.substring(0, 3).toUpperCase();
  }

  if (words.length === 2) {
    return (words[0]!.charAt(0) + words[1]!.substring(0, 2)).toUpperCase();
  }

  // 3+ words: first letter of first 3 words
  return words
    .slice(0, 3)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

/**
 * Return the existing shortCode if available, otherwise generate one from the name.
 */
export function resolveShortCode(
  shortCode: string | null | undefined,
  name: string
): string {
  if (shortCode) return shortCode;
  return generateShortCode(name);
}
