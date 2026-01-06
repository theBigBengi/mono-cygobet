// lib/http/apiError.ts
/**
 * Typed API error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message?: string,
    public details?: unknown
  ) {
    super(message || `API Error: ${status}`);
    this.name = "ApiError";
  }

  static fromResponse(status: number, body: unknown): ApiError {
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      "code" in body
    ) {
      return new ApiError(
        status,
        body.code as string,
        body.message as string,
        body
      );
    }

    return new ApiError(
      status,
      undefined,
      `Request failed with status ${status}`,
      body
    );
  }
}
