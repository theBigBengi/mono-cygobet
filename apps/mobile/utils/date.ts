// utils/date.ts
// Utility functions for date formatting and manipulation.

/**
 * Formats a date string to a readable format (e.g., "Jan 15, 2026").
 * @param dateString - ISO date string (e.g., "2026-01-15")
 * @returns Formatted date string (e.g., "Jan 15, 2026")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
