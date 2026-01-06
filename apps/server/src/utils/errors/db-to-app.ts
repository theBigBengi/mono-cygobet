// src/errors/db-to-app.ts
import type { DatabaseError } from "pg-protocol";
import { AppError, ConflictError, BadRequestError } from "./app-error";

export function mapPgError(err: any): AppError {
  // PG error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  const pg = err as Partial<DatabaseError> & { code?: string; detail?: string };

  switch (pg.code) {
    case "23505": // unique_violation
      return new ConflictError("Already exists", { detail: pg.detail });
    case "23503": // foreign_key_violation
      return new BadRequestError("Invalid reference", { detail: pg.detail });
    case "23514": // check_violation
      return new BadRequestError("Constraint failed", { detail: pg.detail });
    case "22P02": // invalid_text_representation (bad UUID/int, etc.)
      return new BadRequestError("Invalid input syntax", { detail: pg.detail });
    default:
      return new AppError("Database error", 500, "DB_ERROR", {
        code: pg.code,
        detail: pg.detail,
      });
  }
}
