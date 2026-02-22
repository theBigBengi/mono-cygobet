import type { ExternalId } from "@repo/types/sport-data/common";
import { adapter } from "../../utils/adapter";
import { getLogger } from "../../logger";
import { seedBookmakers } from "./seed.bookmakers";
import { seedCountries } from "./seed.countries";
import { seedLeagues } from "./seed.leagues";
import { seedTeams } from "./seed.teams";
import { seedSeasons } from "./seed.seasons";
import { seedFixtures } from "./seed.fixtures";
import { seedOdds } from "./seed.odds";
import { seedJobsDefaults } from "./seed.jobs";

const log = getLogger("SeedOrchestrator");

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
 * runBookmakersSeed()
 * ------------------
 * Fetches bookmakers from provider and persists them to DB.
 */
export async function runBookmakersSeed(opts?: { dryRun?: boolean }) {
  log.info({}, "Fetching bookmakers from provider");
  const bookmakersDto = await adapter.fetchBookmakers();

  log.info({ count: bookmakersDto.length }, "Found bookmakers to seed");
  const result = await seedBookmakers(bookmakersDto, opts);

  log.info({}, "Bookmakers seeding finished");
  return result;
}

/**
 * runCountriesSeed()
 * -----------------
 * Fetches countries from provider and persists them to DB.
 */
export async function runCountriesSeed(opts?: { dryRun?: boolean }) {
  log.info({}, "Fetching countries from provider");
  const countriesDto = await adapter.fetchCountries();

  log.info({ count: countriesDto.length }, "Found countries to seed");
  const result = await seedCountries(countriesDto, opts);

  log.info({}, "Countries seeding finished");
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
  log.info({}, "Fetching leagues from provider");
  const leaguesDto = await adapter.fetchLeagues();

  log.info({ count: leaguesDto.length }, "Found leagues to seed");
  const result = await seedLeagues(leaguesDto, opts);

  log.info({}, "Leagues seeding finished");
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
  log.info({}, "Fetching teams from provider");
  const teamsDto = await adapter.fetchTeams();

  log.info({ count: teamsDto.length }, "Found teams to seed");
  const result = await seedTeams(teamsDto, opts);

  log.info({}, "Teams seeding finished");
  return result;
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
  log.info({}, "Fetching seasons from provider");
  const seasonsDto = await adapter.fetchSeasons();

  log.info({ count: seasonsDto.length }, "Found seasons to seed");
  const result = await seedSeasons(seasonsDto, opts);

  log.info({}, "Seasons seeding finished");
  return result;
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
  seasonExternalId?: ExternalId,
  opts?: { dryRun?: boolean }
) {
  if (seasonExternalId) {
    log.info(
      { seasonExternalId },
      "Fetching fixtures for season from provider"
    );
    const fixturesDto = await adapter.fetchFixturesBySeason(seasonExternalId);
    log.info({ count: fixturesDto.length }, "Found fixtures to seed");
    await seedFixtures(fixturesDto, opts);
  } else {
    // Fetch all seasons and then fixtures for each
    log.info({}, "Fetching seasons first");
    const seasonsDto = await adapter.fetchSeasons();

    for (const season of seasonsDto) {
      log.info(
        { seasonExternalId: season.externalId, seasonName: season.name },
        "Fetching fixtures for season"
      );
      const fixturesDto = await adapter.fetchFixturesBySeason(
        season.externalId
      );
      if (fixturesDto.length > 0) {
        log.info({ count: fixturesDto.length }, "Found fixtures to seed");
        await seedFixtures(fixturesDto, opts);
      }
    }
  }

  log.info({}, "Fixtures seeding finished");
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
 * - `filters` is a provider query string like `bookmakers:2;markets:1,57;...`
 */
export async function runOddsSeed(
  startIso: string,
  endIso: string,
  opts?: {
    dryRun?: boolean;
  }
) {
  log.info(
    { startIso, endIso },
    "Fetching odds from provider"
  );
  const oddsDto = await adapter.fetchOddsBetween(startIso, endIso);

  log.info({ count: oddsDto.length }, "Found odds to seed");
  const result = await seedOdds(oddsDto, opts);

  log.info({}, "Odds seeding finished");
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
  log.info({}, "Seeding jobs defaults (create-only)");
  const result = await seedJobsDefaults(opts);

  log.info({}, "Jobs seeding finished");
  return result;
}
