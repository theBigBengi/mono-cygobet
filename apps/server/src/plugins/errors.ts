// src/plugins/errors.ts
import fp from "fastify-plugin";
import { AppError, mapPgError } from "../utils/errors";
import { getErrorMessage, getErrorProp } from "../utils/error.utils";
import { getLogger } from "../logger";

const log = getLogger("Errors");

const PG_CODE_RE = /^\d{5}$/; // SQLSTATE is always 5 digits

function isPgError(e: unknown): e is Record<string, any> {
  if (!e || typeof e !== "object") return false;
  const any = e as Record<string, any>;
  // Must have a 5-digit SQLSTATE code and at least one PG-specific field
  return (
    typeof any.code === "string" &&
    PG_CODE_RE.test(any.code) &&
    ("routine" in any ||
      "schema" in any ||
      "table" in any ||
      "constraint" in any)
  );
}

export default fp(async function errors(fastify) {
  fastify.setErrorHandler((err, req, reply) => {
    log.error({ err, reqId: req.id }, "request error");

    let e: unknown = err;

    // Map ONLY Postgres errors
    if (isPgError(e)) {
      e = mapPgError(e);
    }

    // Status
    const status =
      getErrorProp<number>(e, "status") ??
      getErrorProp<number>(e, "statusCode") ??
      (e instanceof AppError ? e.status : 500);

    // Body
    const body = {
      status: "error",
      code:
        getErrorProp<string>(e, "code") ??
        (e instanceof AppError ? e.code : "INTERNAL"),
      message:
        e instanceof AppError
          ? e.message
          : (getErrorMessage(e) || "Internal Server Error"),
      details:
        process.env.NODE_ENV !== "production"
          ? getErrorProp(e, "details")
          : undefined,
    };

    reply.status(status).send(body);
  });
});
