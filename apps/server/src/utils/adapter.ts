import { createSportsDataAdapter } from "@repo/sports-data";

const token = process.env.SPORTMONKS_API_TOKEN;
const footballBaseUrl = process.env.SPORTMONKS_FOOTBALL_BASE_URL;
const coreBaseUrl = process.env.SPORTMONKS_CORE_BASE_URL;

if (!token || !footballBaseUrl || !coreBaseUrl) {
  // eslint-disable-next-line no-console
  console.warn(
    "[adapter] Missing SPORTMONKS env vars (SPORTMONKS_API_TOKEN, SPORTMONKS_FOOTBALL_BASE_URL, SPORTMONKS_CORE_BASE_URL). API calls will fail at runtime."
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
  },
});
