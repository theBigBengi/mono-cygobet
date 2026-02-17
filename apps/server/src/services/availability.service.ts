import { prisma } from "@repo/db";
import { adapter, currentProviderLabel } from "../utils/adapter";
import type { AvailableSeason, AdminAvailabilityResponse } from "@repo/types";

const CACHE_KEY = "sync:availability";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  data: AdminAvailabilityResponse["data"];
  expiresAt: number;
  cacheKey: string;
}

let availabilityCache: CacheEntry | null = null;

export const availabilityService = {
  async getAvailability(opts?: {
    includeHistorical?: boolean;
  }): Promise<AdminAvailabilityResponse["data"]> {
    const includeHistorical = opts?.includeHistorical ?? false;
    const cacheKey = includeHistorical ? "full" : "recent";

    if (
      availabilityCache &&
      availabilityCache.expiresAt > Date.now() &&
      availabilityCache.cacheKey === cacheKey
    ) {
      return availabilityCache.data;
    }

    // By default, use fetchSeasons (current/future only) for faster response
    // Only fetch all historical seasons when explicitly requested
    const fetchSeasons = includeHistorical
      ? typeof adapter.fetchAllSeasons === "function"
        ? adapter.fetchAllSeasons.bind(adapter)
        : adapter.fetchSeasons.bind(adapter)
      : adapter.fetchSeasons.bind(adapter);
    const providerSeasons = await fetchSeasons();

    const dbSeasons = await prisma.seasons.findMany({
      include: {
        leagues: {
          include: { country: true },
        },
        _count: {
          select: { fixtures: true },
        },
      },
    });

    const dbSeasonMap = new Map(
      dbSeasons.map((s) => [s.externalId.toString(), s])
    );

    const seasons: AvailableSeason[] = providerSeasons.map((ps) => {
      const dbSeason = dbSeasonMap.get(String(ps.externalId));
      return {
        externalId: ps.externalId,
        name: ps.name,
        league: {
          externalId: Number(ps.leagueExternalId),
          name: ps.leagueName,
          country: ps.countryName ?? "",
        },
        startDate: ps.startDate,
        endDate: ps.endDate,
        isCurrent: ps.isCurrent,
        isFinished: ps.isFinished ?? false,
        isPending: ps.isPending ?? false,
        status: dbSeason ? "in_db" : "new",
        dbId: dbSeason?.id,
        fixturesCount: dbSeason?._count?.fixtures,
        lastSyncedAt: dbSeason?.updatedAt?.toISOString(),
      };
    });

    seasons.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "new" ? -1 : 1;
      }
      if (a.league.name !== b.league.name) {
        return a.league.name.localeCompare(b.league.name);
      }
      return b.name.localeCompare(a.name);
    });

    const seasonsNeedingCheck = seasons.filter(
      (s) =>
        s.status === "in_db" && (s.fixturesCount ?? 0) === 0 && !s.isFinished
    );
    for (const season of seasonsNeedingCheck) {
      const fixtures = await adapter.fetchFixturesBySeason(season.externalId);
      season.hasFixturesAvailable = fixtures.length > 0;
    }

    const isUpcoming = (s: AvailableSeason) =>
      s.isPending ||
      (s.startDate != null && new Date(s.startDate) > new Date());

    const activeSeasons = seasons.filter(
      (s) => s.status === "in_db" && !s.isFinished && !isUpcoming(s)
    );
    const upcomingSeasons = seasons.filter(
      (s) => s.status === "in_db" && isUpcoming(s)
    );
    const newSeasons = seasons.filter(
      (s) => s.status === "new" && !s.isFinished
    );
    const fixturesInActiveSeasons = activeSeasons.reduce(
      (sum, s) => sum + (s.fixturesCount ?? 0),
      0
    );
    const seasonsWithFixturesAvailable = seasons.filter(
      (s) =>
        s.status === "in_db" &&
        (s.fixturesCount ?? 0) === 0 &&
        s.hasFixturesAvailable === true
    ).length;

    const result: AdminAvailabilityResponse["data"] = {
      provider: currentProviderLabel,
      seasons,
      summary: {
        active: activeSeasons.length,
        upcoming: upcomingSeasons.length,
        new: newSeasons.length,
        fixtures: fixturesInActiveSeasons,
        seasonsWithFixturesAvailable,
      },
      lastChecked: new Date().toISOString(),
    };

    availabilityCache = {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
      cacheKey,
    };

    return result;
  },

  async invalidateCache(): Promise<void> {
    availabilityCache = null;
  },
};
