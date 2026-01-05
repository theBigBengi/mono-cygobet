import { Prisma, prisma } from "@repo/db";

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
};

function toUnixSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
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
    id: String(r.id),
    kickoffAt: r.startIso,
    league: r.league
      ? { id: String(r.league.id), name: r.league.name }
      : {
          id: r.leagueId != null ? String(r.leagueId) : "unknown",
          name: "Unknown league",
        },
    homeTeam: r.homeTeam
      ? { id: String(r.homeTeam.id), name: r.homeTeam.name }
      : {
          id: r.homeTeamId != null ? String(r.homeTeamId) : "unknown",
          name: "Unknown",
        },
    awayTeam: r.awayTeam
      ? { id: String(r.awayTeam.id), name: r.awayTeam.name }
      : {
          id: r.awayTeamId != null ? String(r.awayTeamId) : "unknown",
          name: "Unknown",
        },
  }));

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
