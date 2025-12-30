// src/etl/seeds/seed.cli.ts
import {
  runCountriesSeed,
  runLeaguesSeed,
  runTeamsSeed,
  runSeasonsSeed,
  runFixturesSeed,
  runOddsSeed,
  runJobsSeed,
} from "./seed.index";
import { format, addDays } from "date-fns";

/**
 * Seeding Order (based on foreign key dependencies):
 * 1. countries - No dependencies (base entity)
 * 2. leagues - Depends on: countries (countryId)
 * 3. teams - Depends on: countries (countryId, nullable)
 * 4. seasons - Depends on: leagues (leagueId)
 * 5. fixtures - Depends on: leagues (leagueId), seasons (seasonId), teams (homeTeamId, awayTeamId)
 *
 * Note: When running individual seeds, ensure dependencies are seeded first.
 * When using --all or no flags, seeds run in the correct order automatically.
 */

// Simple CLI argument parsing
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const hasCountries = args.includes("--countries");
const hasLeagues = args.includes("--leagues");
const hasTeams = args.includes("--teams");
const hasSeasons = args.includes("--seasons");
const hasFixtures = args.includes("--fixtures");
const hasOdds = args.includes("--odds");
const hasJobs = args.includes("--jobs");
const runAll =
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

    if (runAll || hasCountries) {
      console.log("🚀 Starting countries seeding...");
      await runCountriesSeed({ dryRun });
    }

    // Leagues and teams can run in parallel after countries (they both depend on countries)
    if (runAll || hasLeagues) {
      console.log("🚀 Starting leagues seeding...");
      await runLeaguesSeed({ dryRun });
    }

    if (runAll || hasTeams) {
      console.log("🚀 Starting teams seeding...");
      await runTeamsSeed({ dryRun });
    }

    // Seasons must come after leagues
    if (runAll || hasSeasons) {
      console.log("🚀 Starting seasons seeding...");
      await runSeasonsSeed({ dryRun });
    }

    // Fixtures must come after leagues, seasons, and teams
    if (runAll || hasFixtures) {
      console.log("🚀 Starting fixtures seeding...");
      await runFixturesSeed(fixturesSeasonId, { dryRun });
    }

    if (runAll || hasOdds) {
      console.log("🚀 Starting odds seeding...");
      await runOddsSeed(oddsFrom, oddsTo, {
        dryRun,
        filters: oddsFilters,
      });
    }

    if (runAll || hasJobs) {
      console.log("🚀 Starting jobs seeding...");
      await runJobsSeed({ dryRun });
    }

    console.log("✅ Seeding completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();
