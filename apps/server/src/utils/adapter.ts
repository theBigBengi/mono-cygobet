import {
  createSportsDataAdapter,
  PROVIDER_CONFIG,
} from "@repo/sports-data";
import { getLogger } from "../logger";

const log = getLogger("SportsDataAdapter");

const providerConfigs: Record<
  string,
  {
    token?: string;
    footballBaseUrl?: string;
    coreBaseUrl?: string;
    authMode?: "query" | "header";
    logger: { info: (m: string, meta?: unknown) => void; warn: (m: string, meta?: unknown) => void; error: (m: string, meta?: unknown) => void };
  }
> = {
  sportmonks: {
    token: process.env.SPORTMONKS_API_TOKEN,
    footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
    coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
    authMode:
      (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
    logger: {
      info: (message, meta) => log.info(meta ?? {}, message),
      warn: (message, meta) => log.warn(meta ?? {}, message),
      error: (message, meta) => log.error(meta ?? {}, message),
    },
  },
  // Future:
  // "api-football": {
  //   apiKey: process.env.API_FOOTBALL_KEY,
  //   baseUrl: process.env.API_FOOTBALL_BASE_URL,
  // },
};

const current = PROVIDER_CONFIG.current;
const config = providerConfigs[current];

if (current === "sportmonks" && (!config?.token || !config?.footballBaseUrl || !config?.coreBaseUrl)) {
  log.warn(
    "Missing SPORTMONKS env vars (SPORTMONKS_API_TOKEN, SPORTMONKS_FOOTBALL_BASE_URL, SPORTMONKS_CORE_BASE_URL). API calls will fail at runtime."
  );
}

export const adapter = createSportsDataAdapter({
  provider: PROVIDER_CONFIG.current,
  config: providerConfigs[current],
});

export const currentProvider = PROVIDER_CONFIG.current;
export const currentProviderLabel = PROVIDER_CONFIG.getLabel();
