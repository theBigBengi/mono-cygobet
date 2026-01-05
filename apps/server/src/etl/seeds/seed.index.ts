import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import { seedBookmakers } from "./seed.bookmakers";
import { seedCountries } from "./seed.countries";
import { seedLeagues } from "./seed.leagues";
import { seedTeams } from "./seed.teams";
import { seedSeasons } from "./seed.seasons";
import { seedFixtures } from "./seed.fixtures";
import { seedOdds } from "./seed.odds";
import { seedJobsDefaults } from "./seed.jobs";

/**
 * seed.index.ts
 * ------------
 * Purpose:
 * - Provides small “programmatic” helpers around the seed functions.
 * - Used by scripts/tests/tools that want to seed without invoking the CLI parser.
 *
 * Why this exists:
 * - `seed.cli.ts` is for command line UX.
 * - This file is for importing and calling seed routines from code.
 */

/**
 * createAdapter()
 * ---------------
 * Creates a SportMonks adapter using env vars.
 *
 * Why a function instead of a shared singleton:
 * - Keeps seeds easy to reuse in other contexts (tests, one-off scripts).
 * - Avoids creating the adapter when you only run DB-only seeds.
 */
function createAdapter() {
  // One adapter instance per call so callers can reuse helpers in other scripts.
  return new SportMonksAdapter({
    token: process.env.SPORTMONKS_API_TOKEN,
    footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
    coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
    authMode: process.env.SPORTMONKS_AUTH_MODE as "query" | "header",
  });
}

/**
 * runBookmakersSeed()
 * ------------------
 * Fetches bookmakers from provider and persists them to DB.
 */
export async function runBookmakersSeed(opts?: { dryRun?: boolean }) {
  const adapter = createAdapter();

  console.log("🎰 Fetching bookmakers from SportMonks...");
  const bookmakersDto = await adapter.fetchBookmakers();

  console.log(`📦 Found ${bookmakersDto.length} bookmakers to seed`);
  const result = await seedBookmakers(bookmakersDto, opts);

  console.log("✅ Bookmakers seeding finished");
  return result;
}

/**
 * runCountriesSeed()
 * -----------------
 * Fetches countries from provider and persists them to DB.
 */
export async function runCountriesSeed(opts?: { dryRun?: boolean }) {
  const adapter = createAdapter();

  console.log("🌍 Fetching countries from SportMonks...");
  const countriesDto = await adapter.fetchCountries();

  console.log(`📦 Found ${countriesDto.length} countries to seed`);
  const result = await seedCountries(countriesDto, opts);

  console.log("✅ Countries seeding finished");
  return result;
}

/**
 * runLeaguesSeed()
 * ---------------
 * Fetches leagues from provider and persists them to DB.
 *
 * Dependency:
 * - countries should be seeded first (FK).
 */
export async function runLeaguesSeed(opts?: { dryRun?: boolean }) {
  const adapter = createAdapter();

  console.log("🏆 Fetching leagues from SportMonks...");
  const leaguesDto = await adapter.fetchLeagues();

  console.log(`📦 Found ${leaguesDto.length} leagues to seed`);
  const result = await seedLeagues(leaguesDto, opts);

  console.log("✅ Leagues seeding finished");
  return result;
}

/**
 * runTeamsSeed()
 * -------------
 * Fetches teams from provider and persists them to DB.
 *
 * Dependency:
 * - countries should be seeded first (FK, nullable).
 */
export async function runTeamsSeed(opts?: { dryRun?: boolean }) {
  const adapter = createAdapter();

  console.log("⚽ Fetching teams from SportMonks...");
  const teamsDto = await adapter.fetchTeams();

  console.log(`📦 Found ${teamsDto.length} teams to seed`);
  await seedTeams(teamsDto, opts);

  console.log("✅ Teams seeding finished");
}

/**
 * runSeasonsSeed()
 * ---------------
 * Fetches seasons from provider and persists them to DB.
 *
 * Dependency:
 * - leagues should be seeded first (FK).
 */
export async function runSeasonsSeed(opts?: { dryRun?: boolean }) {
  const adapter = createAdapter();

  console.log("📅 Fetching seasons from SportMonks...");
  const seasonsDto = await adapter.fetchSeasons();

  console.log(`📦 Found ${seasonsDto.length} seasons to seed`);
  await seedSeasons(seasonsDto, opts);

  console.log("✅ Seasons seeding finished");
}

/**
 * runFixturesSeed()
 * ----------------
 * Fetches fixtures and persists them to DB.
 *
 * Dependencies:
 * - leagues, seasons, teams must exist first (FKs).
 *
 * Behavior:
 * - When `seasonExternalId` is provided, it fetches fixtures for just that season.
 * - Otherwise, it fetches all seasons and then fixtures for each season.
 */
export async function runFixturesSeed(
  seasonExternalId?: number,
  opts?: { dryRun?: boolean }
) {
  const adapter = createAdapter();

  if (seasonExternalId) {
    console.log(
      `⚽ Fetching fixtures for season ${seasonExternalId} from SportMonks...`
    );
    const fixturesDto = await adapter.fetchFixturesBySeason(seasonExternalId);
    console.log(`📦 Found ${fixturesDto.length} fixtures to seed`);
    await seedFixtures(fixturesDto, opts);
  } else {
    // Fetch all seasons and then fixtures for each
    console.log("📅 Fetching seasons first...");
    const seasonsDto = await adapter.fetchSeasons();

    for (const season of seasonsDto) {
      console.log(
        `⚽ Fetching fixtures for season ${season.externalId} (${season.name})...`
      );
      const fixturesDto = await adapter.fetchFixturesBySeason(
        Number(season.externalId)
      );
      if (fixturesDto.length > 0) {
        console.log(`📦 Found ${fixturesDto.length} fixtures to seed`);
        await seedFixtures(fixturesDto, opts);
      }
    }
  }

  console.log("✅ Fixtures seeding finished");
}

/**
 * runOddsSeed()
 * ------------
 * Fetches odds between two dates and persists them to DB.
 *
 * Dependencies:
 * - fixtures (and often markets/bookmakers tables depending on your schema/seeders).
 *
 * Note:
 * - `filters` is a SportMonks query string like `bookmakers:2;markets:1,57;...`
 */
export async function runOddsSeed(
  startIso: string,
  endIso: string,
  opts?: {
    dryRun?: boolean;
    filters?: string;
  }
) {
  const adapter = createAdapter();

  console.log(
    `🎲 Fetching odds from SportMonks between ${startIso} and ${endIso}...`
  );
  const oddsDto = await adapter.fetchOddsBetween(startIso, endIso, {
    filters: opts?.filters,
  });

  console.log(`📦 Found ${oddsDto.length} odds to seed`);
  const result = await seedOdds(oddsDto, opts);

  console.log("✅ Odds seeding finished");
  return result;
}

/**
 * runJobsSeed()
 * ------------
 * Seeds “infrastructure” job rows into the `jobs` table (create-only).
 *
 * This MUST run at least once per environment, otherwise:
 * - scheduler cannot read schedules
 * - job runners will throw because config row is missing
 */
export async function runJobsSeed(opts?: { dryRun?: boolean }) {
  // Jobs are “infrastructure config” for the scheduler and admin UI.
  // This seed is create-only and must not overwrite admin edits in DB.
  console.log("🔧 Seeding jobs defaults (create-only)...");
  const result = await seedJobsDefaults(opts);

  console.log("✅ Jobs seeding finished");
  return result;
}
