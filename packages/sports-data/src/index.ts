import { SportMonksAdapter } from "./adapters/sportmonks/sportmonks.adapter";
import dotenv from "dotenv";
dotenv.config();

// checking if the adapter is working
async function main() {
  const adapter = new SportMonksAdapter();
  const countries = await adapter.fetchCountries();
  console.log(countries);

  const teams = await adapter.fetchTeams();
  console.log(teams);

  const fixtures = await adapter.fetchFixturesBySeason(2024);
  console.log(fixtures);

  const odds = await adapter.fetchOddsBetween("2025-11-01", "2025-11-30");
  console.log(odds);

  const liveFixtures = await adapter.fetchFixturesBetween(
    "2025-11-01",
    "2025-11-30"
  );
  console.log(liveFixtures);
}

main();
