import pino from "pino";

// Determine log level from environment
// Default: 'info' for production, 'debug' for development
const getLogLevel = (): string => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
};

// Create base logger configuration
const loggerOptions: pino.LoggerOptions = {
  level: getLogLevel(),
};

// Add pino-pretty transport only in development
// Use worker thread transport (required for pino v7+)
if (process.env.NODE_ENV !== "production") {
  loggerOptions.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss.l",
      ignore: "pid,hostname",
    },
  };
}

// Create base logger instance
const logger = pino(loggerOptions);

/**
 * Get a logger instance with a specific scope.
 * Each call returns a child logger with the scope in the context.
 *
 * @param scope - The scope/context for this logger (e.g., "Service", "Job", "Auth")
 * @returns A Pino logger instance with the scope in its context
 *
 * @example
 * ```ts
 * const logger = getLogger("UserService");
 * logger.info("User created");
 * // Output: {"level":30,"time":...,"scope":"UserService","msg":"User created"}
 * ```
 */
export function getLogger(scope: string): pino.Logger {
  return logger.child({ scope });
}

// Export the base logger instance for direct use (e.g., in server.ts)
export { logger };
