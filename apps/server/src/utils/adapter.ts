import { createSportsDataAdapter } from "@repo/sports-data";
import { getLogger } from "../logger";

const log = getLogger("SportsDataAdapter");

const token = process.env.SPORTMONKS_API_TOKEN;
const footballBaseUrl = process.env.SPORTMONKS_FOOTBALL_BASE_URL;
const coreBaseUrl = process.env.SPORTMONKS_CORE_BASE_URL;

if (!token || !footballBaseUrl || !coreBaseUrl) {
  log.warn(
    "Missing SPORTMONKS env vars (SPORTMONKS_API_TOKEN, SPORTMONKS_FOOTBALL_BASE_URL, SPORTMONKS_CORE_BASE_URL). API calls will fail at runtime."
  );
}

export const adapter = createSportsDataAdapter({
  provider: "sportmonks",
  config: {
    token,
    footballBaseUrl,
    coreBaseUrl,
    authMode:
      (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
    logger: {
      info: (message, meta) => log.info(meta ?? {}, message),
      warn: (message, meta) => log.warn(meta ?? {}, message),
      error: (message, meta) => log.error(meta ?? {}, message),
    },
  },
});
