import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";

const token = process.env.SPORTMONKS_API_TOKEN;
const footballBaseUrl = process.env.SPORTMONKS_FOOTBALL_BASE_URL;
const coreBaseUrl = process.env.SPORTMONKS_CORE_BASE_URL;
const authMode =
  (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query";

export const adapter = new SportMonksAdapter({
  token,
  footballBaseUrl,
  coreBaseUrl,
  authMode,
});
