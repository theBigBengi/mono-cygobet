import { Prisma, prisma } from "@repo/db";
import SportMonksAdapter from "@repo/sports-data/adapters/sportmonks";
import type { FixtureDTO } from "@repo/types/sport-data/common";

export type GetUpcomingFixturesParams = {
  from: Date;
  to: Date;
  page: number;
  perPage: number;
};

export type MobileUpcomingFixture = {
  id: string | number;
  kickoffAt: string;
  league: { id: string | number; name: string };
  homeTeam: { id: string | number; name: string };
  awayTeam: { id: string | number; name: string };
};

export type MobileUpcomingFixturesResult = {
  data: MobileUpcomingFixture[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number | null;
    totalPages: number | null;
  };
  source: "db" | "provider";
};

function toUnixSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

function mapProviderFixtureToMobile(fx: FixtureDTO): MobileUpcomingFixture | null {
  if (!fx?.externalId || !fx?.startTs) return null;
  const kickoffAt = new Date(fx.startTs * 1000).toISOString();

  return {
    id: String(fx.externalId),
    kickoffAt,
    league: {
      id: fx.leagueExternalId != null ? String(fx.leagueExternalId) : "unknown",
      name: fx.leagueName ?? "Unknown league",
    },
    homeTeam: {
      id: fx.homeTeamExternalId != null ? String(fx.homeTeamExternalId) : "unknown",
      name: fx.homeTeamName ?? "Unknown",
    },
    awayTeam: {
      id: fx.awayTeamExternalId != null ? String(fx.awayTeamExternalId) : "unknown",
      name: fx.awayTeamName ?? "Unknown",
    },
  };
}

export async function getUpcomingFixtures(
  params: GetUpcomingFixturesParams
): Promise<MobileUpcomingFixturesResult> {
  const { from, to, page, perPage } = params;

  const fromTs = toUnixSeconds(from);
  const toTs = toUnixSeconds(to);
  const skip = (page - 1) * perPage;
  const take = perPage;

  const where: Prisma.fixturesWhereInput = {
    startTs: { gte: fromTs, lte: toTs },
    state: "NS",
  };

  try {
    const [rows, totalItems] = await Promise.all([
      prisma.fixtures.findMany({
        where,
        orderBy: { startTs: "asc" },
        skip,
        take,
        select: {
          id: true,
          startIso: true,
          leagueId: true,
          homeTeamId: true,
          awayTeamId: true,
          league: { select: { id: true, name: true } },
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
        },
      }),
      prisma.fixtures.count({ where }),
    ]);

    const data: MobileUpcomingFixture[] = rows.map((r) => ({
      id: r.id,
      kickoffAt: r.startIso,
      league: r.league
        ? { id: r.league.id, name: r.league.name }
        : { id: r.leagueId ?? "unknown", name: "Unknown league" },
      homeTeam: { id: r.homeTeam.id, name: r.homeTeam.name },
      awayTeam: { id: r.awayTeam.id, name: r.awayTeam.name },
    }));

    return {
      source: "db",
      data,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
      },
    };
  } catch (e) {
    // DB not ready (connection/migrations/etc). Fallback to provider if configured.
    const token = process.env.SPORTMONKS_API_TOKEN;
    const footballBaseUrl = process.env.SPORTMONKS_FOOTBALL_BASE_URL;
    const coreBaseUrl = process.env.SPORTMONKS_CORE_BASE_URL;
    const authMode =
      (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query";

    if (!token || !footballBaseUrl || !coreBaseUrl) {
      throw e;
    }

    const adapter = new SportMonksAdapter({
      token,
      footballBaseUrl,
      coreBaseUrl,
      authMode,
    });

    const fixtures = await adapter.fetchFixturesBetween(from.toISOString(), to.toISOString(), {
      perPage,
      order: "asc",
      sortBy: "starting_at",
    });

    const upcoming = fixtures.filter((fx) => String(fx.state) === "NS");
    const mapped = upcoming
      .map(mapProviderFixtureToMobile)
      .filter((x): x is MobileUpcomingFixture => x != null)
      .slice(0, perPage);

    return {
      source: "provider",
      data: mapped,
      pagination: {
        page,
        perPage,
        totalItems: null,
        totalPages: null,
      },
    };
  }
}


