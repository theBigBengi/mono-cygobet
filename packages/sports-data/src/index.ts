export type {
  ISportsDataAdapter,
  FixtureFetchOptions,
  FixturesBySeasonOptions,
  OddsFetchOptions,
  ProviderCapabilities,
} from "./adapter.interface";
export { BaseSportsDataAdapter } from "./base-adapter";
export {
  createSportsDataAdapter,
  type AdapterConfig,
} from "./adapter.factory";
export {
  PROVIDER_CONFIG,
  type SportsDataProvider,
} from "./config/provider.config";
export {
  CircuitBreaker,
  type CircuitBreakerState,
  type CircuitBreakerOptions,
} from "./circuit-breaker";
export { Semaphore } from "./semaphore";
export {
  SportsDataError,
  type SportsDataErrorCode,
} from "./errors";
export { noopLogger, type SportsDataLogger } from "./logger";

// NOTE:
// This file is a library entrypoint. Do NOT run network calls at import time.
// Keep any quick manual checks behind an explicit CLI guard.
