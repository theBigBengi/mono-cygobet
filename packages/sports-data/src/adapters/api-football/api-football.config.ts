import { SportsDataError } from "../../errors";
import { noopLogger } from "../../logger";
import type { SportsDataLogger } from "../../logger";

/**
 * Full configuration for API-Football adapter.
 * All fields are required; optional fields have defaults applied in validateConfig.
 */
export interface ApiFootballConfig {
  apiKey: string;
  baseUrl: string;
  defaultRetries: number;
  retryDelayMs: number;
  maxConcurrency: number;
  logger: SportsDataLogger;
}

/**
 * Validates and normalizes partial config into a full ApiFootballConfig.
 * Fills missing required fields from process.env; applies defaults for optional fields.
 * This is the only place in the adapter layer that reads process.env.
 */
export function validateConfig(
  opts: Partial<ApiFootballConfig> = {}
): ApiFootballConfig {
  const apiKey =
    opts.apiKey ?? (process.env.API_FOOTBALL_KEY as string | undefined);
  if (!apiKey)
    throw new SportsDataError("UNKNOWN", "API_FOOTBALL_KEY is required");

  const baseUrl =
    opts.baseUrl ??
    (process.env.API_FOOTBALL_BASE_URL as string | undefined) ??
    "https://v3.football.api-sports.io";

  return {
    apiKey,
    baseUrl,
    defaultRetries: opts.defaultRetries ?? 3,
    retryDelayMs: opts.retryDelayMs ?? 1000,
    maxConcurrency: opts.maxConcurrency ?? 2,
    logger: opts.logger ?? noopLogger,
  };
}
