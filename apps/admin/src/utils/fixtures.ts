// Normalize result string - convert ":" to "-" for consistent comparison
export function normalizeResult(result: string | null | undefined): string {
  if (!result) return "";
  return result.trim().replace(/:/g, "-");
}
