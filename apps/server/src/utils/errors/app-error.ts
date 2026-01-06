// src/errors/app-error.ts
import { FastifyError } from "fastify";

export class AppError extends Error implements FastifyError {
  constructor(
    message: string,
    public status: number = 500,
    public code: string = "INTERNAL",
    public details?: unknown
  ) {
    super(message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}
export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}
export class UnprocessableError extends AppError {
  constructor(message = "Unprocessable", details?: unknown) {
    super(message, 422, "UNPROCESSABLE", details);
  }
}
