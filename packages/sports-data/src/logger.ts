/**
 * Logger abstraction for sports-data package.
 * No direct pino dependency; consumers can inject a pino-backed implementation.
 */

export type SportsDataLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

const noop = (_message: string, _meta?: Record<string, unknown>): void => {};

export const noopLogger: SportsDataLogger = {
  info: noop,
  warn: noop,
  error: noop,
};
