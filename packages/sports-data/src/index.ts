import dotenv from "dotenv";
dotenv.config();

export type {
  ISportsDataAdapter,
  FixtureFetchOptions,
  FixturesBySeasonOptions,
  OddsFetchOptions,
} from "./adapter.interface";
export {
  createSportsDataAdapter,
  type AdapterConfig,
} from "./adapter.factory";
export {
  SportsDataError,
  type SportsDataErrorCode,
} from "./errors";
export { noopLogger, type SportsDataLogger } from "./logger";

// NOTE:
// This file is a library entrypoint. Do NOT run network calls at import time.
// Keep any quick manual checks behind an explicit CLI guard.
