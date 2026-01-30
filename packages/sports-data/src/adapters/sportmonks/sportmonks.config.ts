import { SportsDataError } from "../../errors";
import { noopLogger } from "../../logger";
import type { SportsDataLogger } from "../../logger";

/**
 * Full configuration for SportMonks adapter.
 * All fields are required; optional fields have defaults applied in validateConfig.
 */
export interface SportMonksConfig {
  token: string;
  footballBaseUrl: string;
  coreBaseUrl: string;
  authMode: "query" | "header";
  defaultRetries: number;
  defaultPerPage: number;
  retryDelayMs: number;
  logger: SportsDataLogger;
  maxConcurrency: number;
}

/**
 * Validates and normalizes partial config into a full SportMonksConfig.
 * Fills missing required fields from process.env; applies defaults for optional fields.
 * This is the only place in the adapter layer that reads process.env.
 */
export function validateConfig(
  opts: Partial<SportMonksConfig> = {}
): SportMonksConfig {
  const token =
    opts.token ?? (process.env.SPORTMONKS_API_TOKEN as string | undefined);
  if (!token) throw new SportsDataError("UNKNOWN", "API token is required");

  const footballBaseUrl =
    opts.footballBaseUrl ??
    (process.env.SPORTMONKS_FOOTBALL_BASE_URL as string | undefined);
  if (!footballBaseUrl)
    throw new SportsDataError("UNKNOWN", "Football base URL is required");

  const coreBaseUrl =
    opts.coreBaseUrl ??
    (process.env.SPORTMONKS_CORE_BASE_URL as string | undefined);
  if (!coreBaseUrl)
    throw new SportsDataError("UNKNOWN", "Core base URL is required");

  const authMode =
    opts.authMode ??
    (process.env.SPORTMONKS_AUTH_MODE as "query" | "header" | undefined);
  if (!authMode)
    throw new SportsDataError("UNKNOWN", "Auth mode is required");
  if (authMode !== "query" && authMode !== "header")
    throw new SportsDataError("UNKNOWN", "Auth mode is required");

  return {
    token,
    footballBaseUrl,
    coreBaseUrl,
    authMode,
    defaultRetries: opts.defaultRetries ?? 3,
    defaultPerPage: opts.defaultPerPage ?? 50,
    retryDelayMs: opts.retryDelayMs ?? 1000,
    logger: opts.logger ?? noopLogger,
    maxConcurrency: opts.maxConcurrency ?? 6,
  };
}
