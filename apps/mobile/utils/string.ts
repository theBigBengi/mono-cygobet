// utils/string.ts
// Shared string utility functions.

/**
 * Extracts initials from a name or username.
 * For multi-word names, returns first letter of first two words.
 * For single words, returns first two characters.
 * Returns "?" for empty/null input.
 */
export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}
