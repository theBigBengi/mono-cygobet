import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (hoisted so vi.mock factories can access them) ---

const { mockUpsert, mockFindMany, mockAuditCreate } = vi.hoisted(() => ({
  mockUpsert: vi.fn(async () => ({ id: 1 })),
  mockFindMany: vi.fn(async () => [] as unknown[]),
  mockAuditCreate: vi.fn(async () => ({})),
}));

vi.mock("@repo/db", () => ({
  FixtureState: { NS: "NS", LIVE: "LIVE", FT: "FT" },
  RunStatus: { success: "success", failed: "failed", skipped: "skipped" },
  prisma: {
    fixtures: { findMany: mockFindMany, upsert: mockUpsert },
    leagues: { findMany: vi.fn(async () => [{ id: 10, externalId: BigInt(100) }]) },
    seasons: { findMany: vi.fn(async () => [{ id: 20, externalId: BigInt(200) }]) },
    teams: {
      findMany: vi.fn(async () => [
        { id: 30, externalId: BigInt(300) },
        { id: 31, externalId: BigInt(301) },
      ]),
    },
    fixtureAuditLog: { create: mockAuditCreate },
  },
}));

vi.mock("../../transform/fixtures.transform", () => ({
  transformFixtureDto: vi.fn((dto: Record<string, unknown>) => ({
    externalId: dto.externalId,
    name: dto.name,
    leagueExternalId: dto.leagueExternalId,
    seasonExternalId: dto.seasonExternalId,
    homeTeamExternalId: dto.homeTeamExternalId,
    awayTeamExternalId: dto.awayTeamExternalId,
    startIso: dto.startIso ?? "2026-01-01T00:00:00Z",
    startTs: dto.startTs ?? 1700000000,
    state: dto.state ?? "NS",
    liveMinute: dto.liveMinute ?? null,
    result: dto.result ?? null,
    homeScore90: dto.homeScore90 ?? null,
    awayScore90: dto.awayScore90 ?? null,
    homeScoreET: null,
    awayScoreET: null,
    penHome: null,
    penAway: null,
    stage: null,
    round: null,
    leg: null,
    aggregateId: null,
  })),
  isValidFixtureStateTransition: vi.fn(() => true),
}));

vi.mock("../../seeds/seed.utils", () => ({
  trackSeedItem: vi.fn(async () => {}),
}));

vi.mock("../../../logger", () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { syncFixtures } from "../sync.fixtures";

const makeFixture = (overrides: Record<string, unknown> = {}) => ({
  externalId: 999,
  name: "Team A vs Team B",
  leagueExternalId: 100,
  seasonExternalId: 200,
  homeTeamExternalId: 300,
  awayTeamExternalId: 301,
  startIso: "2026-01-01T00:00:00Z",
  startTs: 1700000000,
  state: "NS",
  liveMinute: null,
  result: null,
  homeScore: null,
  awayScore: null,
  stage: null,
  round: null,
  leg: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("syncFixtures — _bypassedValidation audit marker", () => {
  it("adds _bypassedValidation to audit log on INSERT when bypass is true", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await syncFixtures([makeFixture()] as never[], {
      bypassStateValidation: true,
      jobRunId: 1,
    });

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const changes = mockAuditCreate.mock.calls[0]![0].data.changes;
    expect(changes._bypassedValidation).toEqual({ old: "false", new: "true" });
  });

  it("does NOT add _bypassedValidation on INSERT when bypass is false/undefined", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await syncFixtures([makeFixture()] as never[], { jobRunId: 1 });

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const changes = mockAuditCreate.mock.calls[0]![0].data.changes;
    expect(changes._bypassedValidation).toBeUndefined();
  });

  it("adds _bypassedValidation to audit log on UPDATE when bypass is true", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        externalId: BigInt(999),
        name: "Team A vs Team B",
        leagueId: 10,
        seasonId: 20,
        homeTeamId: 30,
        awayTeamId: 31,
        startIso: "2026-01-01T00:00:00Z",
        startTs: 1700000000,
        state: "NS",
        liveMinute: null,
        result: null,
        homeScore90: null,
        awayScore90: null,
        homeScoreET: null,
        awayScoreET: null,
        penHome: null,
        penAway: null,
        stage: null,
        round: null,
        leg: null,
        aggregateId: null,
      },
    ]);

    await syncFixtures(
      [makeFixture({ state: "LIVE", liveMinute: 15 })] as never[],
      { bypassStateValidation: true, jobRunId: 1 }
    );

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const changes = mockAuditCreate.mock.calls[0]![0].data.changes;
    expect(changes._bypassedValidation).toEqual({ old: "false", new: "true" });
  });

  it("does NOT add _bypassedValidation on UPDATE when bypass is false/undefined", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        externalId: BigInt(999),
        name: "Team A vs Team B",
        leagueId: 10,
        seasonId: 20,
        homeTeamId: 30,
        awayTeamId: 31,
        startIso: "2026-01-01T00:00:00Z",
        startTs: 1700000000,
        state: "NS",
        liveMinute: null,
        result: null,
        homeScore90: null,
        awayScore90: null,
        homeScoreET: null,
        awayScoreET: null,
        penHome: null,
        penAway: null,
        stage: null,
        round: null,
        leg: null,
        aggregateId: null,
      },
    ]);

    await syncFixtures(
      [makeFixture({ state: "LIVE", liveMinute: 15 })] as never[],
      { jobRunId: 1 }
    );

    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const changes = mockAuditCreate.mock.calls[0]![0].data.changes;
    expect(changes._bypassedValidation).toBeUndefined();
  });
});
