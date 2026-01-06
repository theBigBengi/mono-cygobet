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
            orderBy: { startingAtTimestamp: "asc" },
            ...(marketExternalIds.length
              ? { where: { marketExternalId: { in: marketExternalIds } } }
              : {}),
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
