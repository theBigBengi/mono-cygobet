/**
 * Generic error type for sports-data layer.
 * No provider names are exposed to consumers.
 */

export type SportsDataErrorCode =
  | "RATE_LIMIT"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export class SportsDataError extends Error {
  readonly code: SportsDataErrorCode;
  readonly statusCode?: number;
  readonly cause?: unknown;

  constructor(
    code: SportsDataErrorCode,
    message: string,
    statusCode?: number,
    cause?: unknown
  ) {
    super(message);
    this.name = "SportsDataError";
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
    Object.setPrototypeOf(this, SportsDataError.prototype);
  }
}
