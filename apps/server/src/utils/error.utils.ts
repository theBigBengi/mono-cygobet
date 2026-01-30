/**
 * Safely extract message from unknown error.
 */
export function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Safely extract error code (e.g. Prisma error codes like P2002).
 */
export function getErrorCode(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    return String((e as { code: unknown }).code);
  }
  return "UNKNOWN_ERROR";
}

/**
 * Safely extract a property from unknown error (e.g. status, statusCode).
 */
export function getErrorProp<T>(e: unknown, key: string): T | undefined {
  if (e && typeof e === "object" && key in e) {
    return (e as Record<string, unknown>)[key] as T;
  }
  return undefined;
}
