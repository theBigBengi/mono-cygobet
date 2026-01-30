// src/etl/seeds/seed.cli.ts
import { adapter } from "../../utils/adapter";
import { seedBookmakers } from "./seed.bookmakers";
import { seedCountries } from "./seed.countries";
import { seedLeagues } from "./seed.leagues";
import { seedTeams } from "./seed.teams";
import { seedSeasons } from "./seed.seasons";
import { seedFixtures } from "./seed.fixtures";
import { seedOdds } from "./seed.odds";
import { seedJobsDefaults } from "./seed.jobs";
import { format, addDays } from "date-fns";
import { getLogger } from "../../logger";

const log = getLogger("SeedCLI");

/**
 * Seeding Order (based on foreign key dependencies):
 * 1. bookmakers - No dependencies (base entity)
 * 2. countries - No dependencies (base entity)
 * 3. leagues - Depends on: countries (countryId)
 * 4. teams - Depends on: countries (countryId, nullable)
 * 5. seasons - Depends on: leagues (leagueId)
 * 6. fixtures - Depends on: leagues (leagueId), seasons (seasonId), teams (homeTeamId, awayTeamId)
 *
 * Note: When running individual seeds, ensure dependencies are seeded first.
 * When using --all or no flags, seeds run in the correct order automatically.
 */

/**
 * seed.cli.ts
 * ----------
 * Purpose:
 * - A human-friendly CLI to seed the database.
 *
 * Why it exists:
 * - In dev/staging you often need to bootstrap DB quickly.
 * - In prod you may want one-off seeding/migrations from a worker container.
 *
 * Typical usage:
 * - Seed everything: `tsx src/etl/seeds/seed.cli.ts`
 * - Seed just jobs (infrastructure config): `tsx src/etl/seeds/seed.cli.ts --jobs`
 * - Dry-run: `tsx src/etl/seeds/seed.cli.ts --jobs --dry-run`
 */

// Simple CLI argument parsing
const args = process.argv.slice(2);

// Flags:
// - When no flags are provided, we run *all* seeds in dependency order.
// - When specific flags are provided, we still try to run in a safe order, but you are responsible
//   for ensuring dependencies exist (we print warnings below).
const dryRun = args.includes("--dry-run");
const hasBookmakers = args.includes("--bookmakers");
const hasCountries = args.includes("--countries");
const hasLeagues = args.includes("--leagues");
const hasTeams = args.includes("--teams");
const hasSeasons = args.includes("--seasons");
const hasFixtures = args.includes("--fixtures");
const hasOdds = args.includes("--odds");
const hasJobs = args.includes("--jobs");

// If no specific seed flags were provided, run everything.
const runAll =
  !hasBookmakers &&
  !hasCountries &&
  !hasLeagues &&
  !hasTeams &&
  !hasSeasons &&
  !hasFixtures &&
  !hasOdds &&
  !hasJobs;

// Parse fixtures-season argument if provided
const fixturesSeasonArg = args.find((arg) =>
  arg.startsWith("--fixtures-season=")
);
const fixturesSeasonId = fixturesSeasonArg
  ? (() => {
      const parsed = parseInt(fixturesSeasonArg.split("=")[1] || "", 10);
      return isNaN(parsed) ? undefined : parsed;
    })()
  : undefined;

// Parse fixtures-states argument if provided (e.g., --fixtures-states=1,2,3 or --fixtures-states=1)
// If not provided, fetches all states (undefined)
const fixturesStatesArg = args.find((arg) =>
  arg.startsWith("--fixtures-states=")
);
const fixtureStates = fixturesStatesArg
  ? fixturesStatesArg.split("=")[1]
  : undefined;

// Parse odds arguments if provided
const oddsFromArg = args.find((arg) => arg.startsWith("--odds-from="));
const oddsToArg = args.find((arg) => arg.startsWith("--odds-to="));
const oddsFiltersArg = args.find((arg) => arg.startsWith("--odds-filters="));
const oddsFrom: string = oddsFromArg
  ? oddsFromArg.split("=")[1]!
  : format(new Date(), "yyyy-MM-dd");
const oddsTo: string = oddsToArg
  ? oddsToArg.split("=")[1]!
  : format(addDays(new Date(), 7), "yyyy-MM-dd");
const oddsFilters: string = oddsFiltersArg
  ? oddsFiltersArg.split("=")[1]!
  : "bookmakers:1;markets:1,57;fixtureStates:1";

(async () => {
  try {
    // Dry-run allows you to validate inputs and provider connectivity without touching DB.
    if (dryRun) {
      log.info({}, "Dry run mode; no database changes will be made");
    }

    // Validate dependencies when running individual seeds
    if (!runAll) {
      if (hasLeagues && !hasCountries) {
        log.warn({}, "Leagues depend on countries. Make sure countries are seeded first.");
      }
      if (hasTeams && !hasCountries) {
        log.warn({}, "Teams depend on countries. Make sure countries are seeded first.");
      }
      if (hasSeasons && !hasLeagues) {
        log.warn({}, "Seasons depend on leagues. Make sure leagues are seeded first.");
      }
      if (hasFixtures && (!hasLeagues || !hasTeams || !hasSeasons)) {
        log.warn({}, "Fixtures depend on leagues, seasons, and teams. Make sure all are seeded first.");
      }
    }

    // Seed in dependency order (always, even for individual seeds)
    // This ensures correct order when using --all or when multiple flags are used

    if (runAll || hasBookmakers) {
      log.info({}, "Starting bookmakers seeding");
      const bookmakersDto = await adapter.fetchBookmakers();
      await seedBookmakers(bookmakersDto, { dryRun });
    }

    if (runAll || hasCountries) {
      log.info({}, "Starting countries seeding");
      const countriesDto = await adapter.fetchCountries();
      await seedCountries(countriesDto, { dryRun });
    }

    // Leagues and teams can run in parallel after countries (they both depend on countries)
    if (runAll || hasLeagues) {
      log.info({}, "Starting leagues seeding");
      const leaguesDto = await adapter.fetchLeagues();
      await seedLeagues(leaguesDto, { dryRun });
    }

    if (runAll || hasTeams) {
      log.info({}, "Starting teams seeding");
      const teamsDto = await adapter.fetchTeams();
      await seedTeams(teamsDto, { dryRun });
    }

    // Seasons must come after leagues
    if (runAll || hasSeasons) {
      log.info({}, "Starting seasons seeding");
      const seasonsDto = await adapter.fetchSeasons();
      await seedSeasons(seasonsDto, { dryRun });
    }

    // Fixtures must come after leagues, seasons, and teams
    if (runAll || hasFixtures) {
      log.info({}, "Starting fixtures seeding");
      if (fixtureStates) {
        log.info({ fixtureStates }, "Fetching fixtures with states");
      } else {
        log.info({}, "Fetching all fixture states");
      }
      if (fixturesSeasonId) {
        const fixturesDto = await adapter.fetchFixturesBySeason(
          fixturesSeasonId,
          {
            fixtureStates: fixtureStates,
          }
        );
        await seedFixtures(fixturesDto, { dryRun });
      } else {
        // Fetch current and future seasons
        const seasonsDto = await adapter.fetchSeasons();
        for (const season of seasonsDto) {
          const fixturesDto = await adapter.fetchFixturesBySeason(
            Number(season.externalId),
            {
              fixtureStates: fixtureStates,
            }
          );
          if (fixturesDto.length > 0) {
            await seedFixtures(fixturesDto, { dryRun });
          }
        }
      }
    }

    if (runAll || hasOdds) {
      log.info({}, "Starting odds seeding");
      const oddsDto = await adapter.fetchOddsBetween(oddsFrom, oddsTo, {
        filters: oddsFilters,
      });
      await seedOdds(oddsDto, { dryRun });
    }

    if (runAll || hasJobs) {
      log.info({}, "Starting jobs seeding");
      // Jobs seeding is create-only: it guarantees required `jobs` rows exist without overwriting admin edits.
      await seedJobsDefaults({ dryRun });
    }

    log.info({}, "Seeding completed successfully");
    process.exit(0);
  } catch (err) {
    log.error({ err }, "Seeding failed");
    process.exit(1);
  }
})();
