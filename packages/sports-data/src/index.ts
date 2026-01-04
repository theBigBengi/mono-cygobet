import { SportMonksAdapter } from "./adapters/sportmonks/sportmonks.adapter";
import dotenv from "dotenv";
dotenv.config();

// NOTE:
// This file is a library entrypoint. Do NOT run network calls at import time.
// Keep any quick manual checks behind an explicit CLI guard.
async function main() {
  const adapter = new SportMonksAdapter();
  const countries = await adapter.fetchCountries();
  // eslint-disable-next-line no-console
  console.log(countries);
}

// Only run when executed directly (e.g. `node dist/index.js`), never when imported.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _require: any = typeof require !== "undefined" ? require : null;
if (_require?.main === module) {
  // eslint-disable-next-line no-console
  main().catch((e: unknown) => console.error(e));
}
