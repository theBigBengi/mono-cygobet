/**
 * Adapter factory—selects provider by config and returns ISportsDataAdapter.
 * Does NOT read process.env; caller passes config. Env fallback stays in validateConfig.
 */

import type { ISportsDataAdapter } from "./adapter.interface";
import type { SportMonksConfig } from "./adapters/sportmonks/sportmonks.config";
import { PROVIDER_CONFIG, type SportsDataProvider } from "./config/provider.config";

export type AdapterConfig = {
  provider?: SportsDataProvider;
  config?: unknown;
};

export function createSportsDataAdapter(
  opts?: AdapterConfig
): ISportsDataAdapter {
  const provider = opts?.provider ?? PROVIDER_CONFIG.current;

  switch (provider) {
    case "sportmonks": {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SportMonksAdapter } =
        require("./adapters/sportmonks/sportmonks.adapter");
      return new SportMonksAdapter(opts?.config);
    }
    // Future providers:
    // case "api-football": {
    //   const { ApiFootballAdapter } = require("./adapters/api-football/api-football.adapter");
    //   return new ApiFootballAdapter(opts?.config);
    // }
    default:
      throw new Error(
        `Unknown provider: ${provider}. Supported: sportmonks`
      );
  }
}
