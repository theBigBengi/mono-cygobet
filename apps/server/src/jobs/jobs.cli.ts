/**
 * jobs.cli.ts
 * -----------
 * CLI runner for server jobs (similar to `groups-server/src/jobs/cli.job.ts`).
 *
 * Usage examples:
 * - List runnable jobs:
 *   tsx src/jobs/jobs.cli.ts --list
 *
 * - Run a job:
 *   tsx src/jobs/jobs.cli.ts --job=upcoming-fixtures --daysAhead=3
 *
 * - Dry-run:
 *   tsx src/jobs/jobs.cli.ts --job=upcoming-fixtures --dry-run
 */
import "dotenv/config";
import Fastify from "fastify";
import { JobTriggerBy, RunTrigger, prisma } from "@repo/db";
import type { JobRunOpts } from "../types/jobs";
import { RUNNABLE_JOBS } from "./jobs.registry";

type CliOpts = {
  job?: string;
  dryRun: boolean;
  // job-specific knobs (passed through to job runner as extra fields)
  daysAhead?: number;
  maxLiveAgeHours?: number;
  filters?: string;
  help: boolean;
  list: boolean;
};

function parseArgs(argv: string[]): CliOpts {
  const flags = new Set<string>();
  const kv: Record<string, string> = {};
  const positionals: string[] = [];

  for (const a of argv) {
    if (!a.startsWith("--")) {
      positionals.push(a);
      continue;
    }
    const s = a.slice(2);
    const eq = s.indexOf("=");
    if (eq === -1) flags.add(s);
    else kv[s.slice(0, eq)] = s.slice(eq + 1);
  }

  const job =
    kv["job"] ?? kv["j"] ?? (positionals.length ? positionals[0] : undefined);

  const daysAheadRaw = kv["daysAhead"] ?? kv["days-ahead"];
  const maxLiveAgeHoursRaw = kv["maxLiveAgeHours"] ?? kv["max-live-age-hours"];
  const filters = kv["filters"];

  const toNum = (v?: string): number | undefined => {
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    job,
    dryRun: flags.has("dry-run") || flags.has("dryRun"),
    daysAhead: toNum(daysAheadRaw),
    maxLiveAgeHours: toNum(maxLiveAgeHoursRaw),
    filters,
    help: flags.has("help") || flags.has("h"),
    list: flags.has("list") || flags.has("ls"),
  };
}

function printHelp() {
  const jobs = RUNNABLE_JOBS.map((j) => `- ${j.key}`).join("\n");
  // eslint-disable-next-line no-console
  console.log(
    `
Run server jobs from the CLI.

Usage:
  pnpm -F server jobs -- --list
  pnpm -F server jobs -- --job=<jobKey> [--dry-run] [--daysAhead=<n>] [--maxLiveAgeHours=<n>] [--filters=<s>]

Args:
  --list                       List runnable jobs
  --job / --j                  Job key to run (or pass as first positional)
  --dry-run                    Run in dry-run mode (job dependent)

Job-specific:
  --daysAhead=<n>              upcoming-fixtures, update-prematch-odds
  --maxLiveAgeHours=<n>        finished-fixtures
  --filters=<s>                update-prematch-odds (optional override)

Runnable jobs:
${jobs}
`.trim()
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // If invoked with no args, show help and exit 0 (friendly UX for `pnpm -F server jobs`)
  if (process.argv.slice(2).length === 0 || opts.help) {
    printHelp();
    return;
  }

  if (opts.list) {
    // eslint-disable-next-line no-console
    console.log(RUNNABLE_JOBS.map((j) => j.key).join("\n"));
    return;
  }

  if (!opts.job) {
    printHelp();
    return;
  }

  const fastify = Fastify({ logger: true });

  try {
    fastify.log.info(
      {
        job: opts.job,
        dryRun: opts.dryRun,
        daysAhead: opts.daysAhead,
        maxLiveAgeHours: opts.maxLiveAgeHours,
      },
      "Starting job via CLI"
    );

    const base: JobRunOpts = {
      dryRun: opts.dryRun,
      trigger: RunTrigger.manual,
      triggeredBy: JobTriggerBy.cli_command,
      meta: { source: "cli" },
    };

    const jobKey = opts.job;

    const res = await (async () => {
      switch (jobKey) {
        case "upsert-upcoming-fixtures": {
          const { runUpcomingFixturesJob } =
            await import("./upcoming-fixtures.job");
          const runOpts: JobRunOpts & { daysAhead?: number } = {
            ...base,
            ...(opts.daysAhead != null ? { daysAhead: opts.daysAhead } : {}),
          };
          return runUpcomingFixturesJob(fastify, runOpts);
        }
        case "upsert-live-fixtures": {
          const { runLiveFixturesJob } = await import("./live-fixtures.job");
          return runLiveFixturesJob(fastify, base);
        }
        case "finished-fixtures": {
          const { runFinishedFixturesJob } =
            await import("./finished-fixtures.job");
          const runOpts: JobRunOpts & { maxLiveAgeHours?: number } = {
            ...base,
            ...(opts.maxLiveAgeHours != null
              ? { maxLiveAgeHours: opts.maxLiveAgeHours }
              : {}),
          };
          return runFinishedFixturesJob(fastify, runOpts);
        }
        case "update-prematch-odds": {
          const { runUpdatePrematchOddsJob } =
            await import("./update-prematch-odds.job");
          const runOpts: JobRunOpts & { daysAhead?: number; filters?: string } =
            {
              ...base,
              ...(opts.daysAhead != null ? { daysAhead: opts.daysAhead } : {}),
              ...(opts.filters ? { filters: opts.filters } : {}),
            };
          return runUpdatePrematchOddsJob(fastify, runOpts);
        }
        default: {
          // eslint-disable-next-line no-console
          console.error(
            `Unknown/non-runnable job '${jobKey}'. Use --list to see available jobs.`
          );
          process.exitCode = 1;
          return null;
        }
      }
    })();

    fastify.log.info({ result: res }, "Job finished");
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error(err);
    fastify.log.error({ err }, "Job failed");
    process.exitCode = 1;
  } finally {
    try {
      await fastify.close();
    } finally {
      await prisma.$disconnect();
    }
  }
}

main();
