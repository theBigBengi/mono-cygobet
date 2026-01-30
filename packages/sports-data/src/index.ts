import dotenv from "dotenv";
dotenv.config();

export { SportMonksAdapter } from "./adapters/sportmonks/sportmonks.adapter";
export {
  SportsDataError,
  type SportsDataErrorCode,
} from "./errors";
export { noopLogger, type SportsDataLogger } from "./logger";
export {
  SMHttp,
  type SMHttpOptions,
  type IncludeNode,
  mapSmShortToApp,
  pickScoreString,
  extractTeams,
  buildOdds,
  coerceEpochSeconds,
  buildFixtures,
} from "./adapters/sportmonks/helpers";

// NOTE:
// This file is a library entrypoint. Do NOT run network calls at import time.
// Keep any quick manual checks behind an explicit CLI guard.
