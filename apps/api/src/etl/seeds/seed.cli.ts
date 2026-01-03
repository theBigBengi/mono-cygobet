// src/etl/seeds/seed.cli.ts
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import { seedBookmakers } from "./seed.bookmakers";
import { seedCountries } from "./seed.countries";
import { seedLeagues } from "./seed.leagues";
import { seedTeams } from "./seed.teams";
import { seedSeasons } from "./seed.seasons";
import { seedFixtures } from "./seed.fixtures";
import { seedOdds } from "./seed.odds";
import { seedDefaultJobs } from "./seed.jobs";
import { format, addDays } from "date-fns";

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

// Simple CLI argument parsing
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const hasBookmakers = args.includes("--bookmakers");
const hasCountries = args.includes("--countries");
const hasLeagues = args.includes("--leagues");
const hasTeams = args.includes("--teams");
const hasSeasons = args.includes("--seasons");
const hasFixtures = args.includes("--fixtures");
const hasOdds = args.includes("--odds");
const hasJobs = args.includes("--jobs");
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
    if (dryRun) {
      console.log("🧪 DRY RUN MODE: No database changes will be made");
    }

    const adapter = new SportMonksAdapter({
      token: process.env.SPORTMONKS_API_TOKEN,
      footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
      coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
      authMode: process.env.SPORTMONKS_AUTH_MODE as "query" | "header",
    });

    // Validate dependencies when running individual seeds
    if (!runAll) {
      if (hasLeagues && !hasCountries) {
        console.warn(
          "⚠️  WARNING: Leagues depend on countries. Make sure countries are seeded first."
        );
      }
      if (hasTeams && !hasCountries) {
        console.warn(
          "⚠️  WARNING: Teams depend on countries. Make sure countries are seeded first."
        );
      }
      if (hasSeasons && !hasLeagues) {
        console.warn(
          "⚠️  WARNING: Seasons depend on leagues. Make sure leagues are seeded first."
        );
      }
      if (hasFixtures && (!hasLeagues || !hasTeams || !hasSeasons)) {
        console.warn(
          "⚠️  WARNING: Fixtures depend on leagues, seasons, and teams. Make sure all are seeded first."
        );
      }
    }

    // Seed in dependency order (always, even for individual seeds)
    // This ensures correct order when using --all or when multiple flags are used

    if (runAll || hasBookmakers) {
      console.log("🚀 Starting bookmakers seeding...");
      const bookmakersDto = await adapter.fetchBookmakers();
      await seedBookmakers(bookmakersDto, { dryRun });
    }

    if (runAll || hasCountries) {
      console.log("🚀 Starting countries seeding...");
      const countriesDto = await adapter.fetchCountries();
      await seedCountries(countriesDto, { dryRun });
    }

    // Leagues and teams can run in parallel after countries (they both depend on countries)
    if (runAll || hasLeagues) {
      console.log("🚀 Starting leagues seeding...");
      const leaguesDto = await adapter.fetchLeagues();
      await seedLeagues(leaguesDto, { dryRun });
    }

    if (runAll || hasTeams) {
      console.log("🚀 Starting teams seeding...");
      const teamsDto = await adapter.fetchTeams();
      await seedTeams(teamsDto, { dryRun });
    }

    // Seasons must come after leagues
    if (runAll || hasSeasons) {
      console.log("🚀 Starting seasons seeding...");
      const seasonsDto = await adapter.fetchSeasons();
      await seedSeasons(seasonsDto, { dryRun });
    }

    // Fixtures must come after leagues, seasons, and teams
    if (runAll || hasFixtures) {
      console.log("🚀 Starting fixtures seeding...");
      if (fixtureStates) {
        console.log(`   📋 Fetching fixtures with states: ${fixtureStates}`);
      } else {
        console.log("   📋 Fetching all fixture states (NS, LIVE, FT, etc.)");
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
      console.log("🚀 Starting odds seeding...");
      const oddsDto = await adapter.fetchOddsBetween(oddsFrom, oddsTo, {
        filters: oddsFilters,
      });
      await seedOdds(oddsDto, { dryRun });
    }

    if (runAll || hasJobs) {
      console.log("🚀 Starting jobs seeding...");
      await seedDefaultJobs({ dryRun });
    }

    console.log("✅ Seeding completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();
