import { createSportsDataAdapter } from "@repo/sports-data";

export const adapter = createSportsDataAdapter({
  provider: "sportmonks",
  config: {
    token: process.env.SPORTMONKS_API_TOKEN,
    footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
    coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
    authMode:
      (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
  },
});
