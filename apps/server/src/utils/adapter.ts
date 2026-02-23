import {
  createSportsDataAdapter,
  PROVIDER_CONFIG,
  type AdapterConfig,
  type SportsDataProvider,
  type SportsDataLogger,
  type SportMonksConfig,
  type ApiFootballConfig,
} from "@repo/sports-data";
import { getLogger } from "../logger";

const log = getLogger("SportsDataAdapter");

const logger: SportsDataLogger = {
  info: (message, meta) => log.info(meta ?? {}, message),
  warn: (message, meta) => log.warn(meta ?? {}, message),
  error: (message, meta) => log.error(meta ?? {}, message),
};

function getProviderConfig(
  provider: SportsDataProvider
): Partial<SportMonksConfig> | Partial<ApiFootballConfig> {
  switch (provider) {
    case "sportmonks":
      return {
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
        logger,
      };
    case "api-football":
      return {
        apiKey: process.env.API_FOOTBALL_KEY,
        baseUrl: process.env.API_FOOTBALL_BASE_URL,
        logger,
      };
    default:
      return { logger };
  }
}

const current = PROVIDER_CONFIG.current;
const config = getProviderConfig(current);

if (
  current === "sportmonks" &&
  (!("token" in config && config.token) ||
    !("footballBaseUrl" in config && config.footballBaseUrl) ||
    !("coreBaseUrl" in config && config.coreBaseUrl))
) {
  log.warn(
    "Missing SPORTMONKS env vars (SPORTMONKS_API_TOKEN, SPORTMONKS_FOOTBALL_BASE_URL, SPORTMONKS_CORE_BASE_URL). API calls will fail at runtime."
  );
} else if (
  current === "api-football" &&
  !("apiKey" in config && config.apiKey)
) {
  log.warn(
    "Missing API_FOOTBALL_KEY env var. API calls will fail at runtime."
  );
}

export const adapter = createSportsDataAdapter({
  provider: current,
  config,
} as AdapterConfig);

export const currentProvider = PROVIDER_CONFIG.current;
export const currentProviderLabel = PROVIDER_CONFIG.getLabel();
