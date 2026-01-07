import { Prisma, prisma } from "@repo/db";
import type {
  ApiUpcomingFixturesInclude,
  ApiUpcomingFixturesResponse,
} from "@repo/types";
import { toUnixSeconds } from "../../utils/dates";

type ApiUpcomingFixtureItem = ApiUpcomingFixturesResponse["data"][number];

function splitStageRound(value: string | null | undefined): {
  stage: string | null;
  round: string | null;
} {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return { stage: null, round: null };
  const parts = s
    .split(" - ")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2)
    return { stage: parts[0]!, round: parts.slice(1).join(" - ") };
  return { stage: s, round: null };
}

function maybeLeague(
  include: boolean,
  league:
    | { id: number; name: string; imagePath: string | null }
    | null
    | undefined
): ApiUpcomingFixtureItem["league"] | undefined {
  if (!include || !league) return undefined;
  return {
    id: league.id,
    name: league.name,
    imagePath: league.imagePath ?? null,
  };
}

function maybeTeam(
  include: boolean,
  team:
    | { id: number; name: string; imagePath: string | null }
    | null
    | undefined
): ApiUpcomingFixtureItem["homeTeam"] | undefined {
  if (!include || !team) return undefined;
  return { id: team.id, name: team.name, imagePath: team.imagePath ?? null };
}

export type GetUpcomingFixturesParams = {
  from: Date;
  to: Date;
  page: number;
  perPage: number;
  leagueIds?: number[];
  marketExternalIds?: bigint[];
  hasOdds?: boolean;
  include?: Set<ApiUpcomingFixturesInclude>;
};

export type MobileUpcomingFixturesResult = {
  data: ApiUpcomingFixturesResponse["data"];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number | null;
    totalPages: number | null;
  };
};

/**
 * Get upcoming fixtures (generic, used by both public and protected endpoints).
 * Supports all filters and includes.
 */
export async function getUpcomingFixtures(
  params: GetUpcomingFixturesParams
): Promise<MobileUpcomingFixturesResult> {
  const { from, to, page, perPage } = params;
  const leagueIds = params.leagueIds ?? [];
  const marketExternalIds = params.marketExternalIds ?? [];
  const hasOddsOnly = params.hasOdds === true; // default false
  const include = params.include ?? new Set<ApiUpcomingFixturesInclude>();

  const fromTs = toUnixSeconds(from);
  const toTs = toUnixSeconds(to);
  const skip = (page - 1) * perPage;
  const take = perPage;

  const where: Prisma.fixturesWhereInput = {
    startTs: { gte: fromTs, lte: toTs },
    state: "NS",
    ...(hasOddsOnly ? { hasOdds: true } : {}),
    ...(leagueIds.length ? { leagueId: { in: leagueIds } } : {}),
  };

  const includeLeague = include.has("league");
  const includeTeams = include.has("teams");
  const includeCountry = include.has("country");
  const includeOdds = include.has("odds");

  const totalItems = await prisma.fixtures.count({ where });

  // Fetch + map with strongly-typed payloads (avoid conditional-select union types)
  let data: ApiUpcomingFixturesResponse["data"];

  const rows = await prisma.fixtures.findMany({
    where,
    orderBy: { startTs: "asc" },
    skip,
    take,
    select: {
      id: true,
      name: true,
      startIso: true,
      startTs: true,
      state: true,
      stageRoundName: true,
      leagueId: true,
      homeTeamId: true,
      awayTeamId: true,
      // Always select league (+country) to keep the result type stable.
      // We still only *return* `league` / `country` when explicitly requested via `include`.
      league: {
        select: {
          id: true,
          name: true,
          imagePath: true,
          country: { select: { id: true, name: true, imagePath: true } },
        },
      },
      homeTeam: includeTeams
        ? { select: { id: true, name: true, imagePath: true } }
        : undefined,
      awayTeam: includeTeams
        ? { select: { id: true, name: true, imagePath: true } }
        : undefined,
      odds: includeOdds
        ? {
            take: 200,
            // Filter for marketExternalId = 1 if no specific marketExternalIds provided
            // Otherwise use the provided marketExternalIds
            where: marketExternalIds.length
              ? { marketExternalId: { in: marketExternalIds } }
              : { marketExternalId: 1n },
            // Sort by sortOrder for consistent ordering
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              value: true,
              label: true,
              marketName: true,
              probability: true,
              winning: true,
              name: true,
              handicap: true,
              total: true,
              sortOrder: true,
            },
          }
        : undefined,
    },
  });

  // Map the rows to the strongly-typed payloads
  data = rows.map((r) => {
    const country = includeCountry
      ? r.league?.country
        ? {
            id: r.league.country.id,
            name: r.league.country.name,
            imagePath: r.league.country.imagePath,
          }
        : null
      : undefined;

    const { stage, round } = splitStageRound(r.stageRoundName);

    return {
      id: r.id,
      name: r.name,
      kickoffAt: r.startIso,
      startTs: r.startTs,
      state: String(r.state),
      stage,
      round,
      league: maybeLeague(includeLeague, r.league),
      homeTeam: maybeTeam(includeTeams, r.homeTeam),
      awayTeam: maybeTeam(includeTeams, r.awayTeam),
      country,
      odds: includeOdds ? r.odds : undefined,
    };
  });

  return {
    data,
    pagination: {
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    },
  };
}

/**
 * Get public upcoming fixtures (minimal, no user-aware logic).
 * - No userId
 * - No user-specific filters
 * - Always includes league, teams, country (hardcoded for public)
 */
export async function getPublicUpcomingFixtures(params: {
  from: Date;
  to: Date;
  page: number;
  perPage: number;
}): Promise<MobileUpcomingFixturesResult> {
  const { from, to, page, perPage } = params;

  const fromTs = toUnixSeconds(from);
  const toTs = toUnixSeconds(to);
  const skip = (page - 1) * perPage;
  const take = perPage;

  const where: Prisma.fixturesWhereInput = {
    startTs: { gte: fromTs, lte: toTs },
    state: "NS",
  };

  const totalItems = await prisma.fixtures.count({ where });

  const rows = await prisma.fixtures.findMany({
    where,
    orderBy: { startTs: "asc" },
    skip,
    take,
    select: {
      id: true,
      name: true,
      startIso: true,
      startTs: true,
      state: true,
      stageRoundName: true,
      leagueId: true,
      homeTeamId: true,
      awayTeamId: true,
      // Public endpoint always includes league, teams, country
      league: {
        select: {
          id: true,
          name: true,
          imagePath: true,
          country: { select: { id: true, name: true, imagePath: true } },
        },
      },
      homeTeam: {
        select: { id: true, name: true, imagePath: true },
      },
      awayTeam: {
        select: { id: true, name: true, imagePath: true },
      },
      // Include odds for marketExternalId = 1, sorted by sortOrder
      odds: {
        where: { marketExternalId: 1n },
        orderBy: { sortOrder: "asc" },
        take: 200,
        select: {
          id: true,
          value: true,
          label: true,
          marketName: true,
          probability: true,
          winning: true,
          name: true,
          handicap: true,
          total: true,
          sortOrder: true,
        },
      },
    },
  });

  const data: ApiUpcomingFixturesResponse["data"] = rows.map((r) => {
    const country = r.league?.country
      ? {
          id: r.league.country.id,
          name: r.league.country.name,
          imagePath: r.league.country.imagePath,
        }
      : null;

    const { stage, round } = splitStageRound(r.stageRoundName);

    return {
      id: r.id,
      name: r.name,
      kickoffAt: r.startIso,
      startTs: r.startTs,
      state: String(r.state),
      stage,
      round,
      league: r.league
        ? {
            id: r.league.id,
            name: r.league.name,
            imagePath: r.league.imagePath ?? null,
          }
        : undefined,
      homeTeam: r.homeTeam
        ? {
            id: r.homeTeam.id,
            name: r.homeTeam.name,
            imagePath: r.homeTeam.imagePath ?? null,
          }
        : undefined,
      awayTeam: r.awayTeam
        ? {
            id: r.awayTeam.id,
            name: r.awayTeam.name,
            imagePath: r.awayTeam.imagePath ?? null,
          }
        : undefined,
      country,
      odds:
        r.odds && r.odds.length > 0
          ? r.odds.map((o) => ({
              id: o.id,
              value: o.value,
              label: o.label,
              marketName: o.marketName ?? null,
              probability: o.probability ?? null,
              winning: o.winning,
              name: o.name ?? null,
              handicap: o.handicap ?? null,
              total: o.total ?? null,
              sortOrder: o.sortOrder,
            }))
          : undefined,
    };
  });

  return {
    data,
    pagination: {
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    },
  };
}
