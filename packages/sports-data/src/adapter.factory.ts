/**
 * Adapter factory—selects provider by config and returns ISportsDataAdapter.
 * Does NOT read process.env; caller passes config. Env fallback stays in validateConfig.
 */

import type { ISportsDataAdapter } from "./adapter.interface";
import type { SportMonksConfig } from "./adapters/sportmonks/sportmonks.config";

export type AdapterConfig =
  | { provider: "sportmonks"; config?: Partial<SportMonksConfig> }
  | { provider?: "sportmonks"; config?: Partial<SportMonksConfig> };

export function createSportsDataAdapter(
  opts?: AdapterConfig
): ISportsDataAdapter {
  const provider = opts?.provider ?? "sportmonks";
  if (provider === "sportmonks") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SportMonksAdapter } = require("./adapters/sportmonks/sportmonks.adapter");
    return new SportMonksAdapter(opts?.config);
  }
  throw new Error(`Unknown provider: ${provider}`);
}
