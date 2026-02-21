import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (hoisted so vi.mock factories can access them) ---

const {
  mockFixturesCount,
  mockFixturesFindMany,
  mockGroupPredictionsFindMany,
  mockGroupPredictionsCount,
  mockGroupFixturesFindMany,
  mockAdminAlertsFindMany,
  mockAdminAlertsFindUnique,
  mockAdminAlertsCreate,
  mockAdminAlertsUpdate,
  mockJobsFindMany,
  mockJobRunsFindMany,
} = vi.hoisted(() => ({
  mockFixturesCount: vi.fn(async () => 0),
  mockFixturesFindMany: vi.fn(async () => [] as unknown[]),
  mockGroupPredictionsFindMany: vi.fn(async () => [] as unknown[]),
  mockGroupPredictionsCount: vi.fn(async () => 0),
  mockGroupFixturesFindMany: vi.fn(async () => [] as unknown[]),
  mockAdminAlertsFindMany: vi.fn(async () => [] as unknown[]),
  mockAdminAlertsFindUnique: vi.fn(async () => null as unknown),
  mockAdminAlertsCreate: vi.fn(async (args: { data: Record<string, unknown> }) => ({
    id: Math.floor(Math.random() * 1000),
    ...args.data,
    createdAt: new Date(),
    resolvedAt: null,
    slackSentAt: null,
    metadata: args.data.metadata ?? {},
  })),
  mockAdminAlertsUpdate: vi.fn(async (args: { data: Record<string, unknown> }) => ({
    id: 1,
    ...args.data,
    createdAt: new Date(),
    resolvedAt: args.data.resolvedAt ?? null,
    slackSentAt: null,
    metadata: args.data.metadata ?? {},
    severity: args.data.severity ?? "warning",
    category: args.data.category ?? "fixture_unsettled",
    title: args.data.title ?? "",
    description: args.data.description ?? "",
    fingerprint: args.data.fingerprint ?? "",
    actionUrl: args.data.actionUrl ?? null,
    actionLabel: args.data.actionLabel ?? null,
  })),
  mockJobsFindMany: vi.fn(async () => [] as unknown[]),
  mockJobRunsFindMany: vi.fn(async () => [] as unknown[]),
}));

vi.mock("@repo/db", () => ({
  prisma: {
    fixtures: { count: mockFixturesCount, findMany: mockFixturesFindMany },
    groupPredictions: { findMany: mockGroupPredictionsFindMany, count: mockGroupPredictionsCount },
    groupFixtures: { findMany: mockGroupFixturesFindMany },
    adminAlerts: {
      findMany: mockAdminAlertsFindMany,
      findUnique: mockAdminAlertsFindUnique,
      create: mockAdminAlertsCreate,
      update: mockAdminAlertsUpdate,
    },
    jobs: { findMany: mockJobsFindMany },
    jobRuns: { findMany: mockJobRunsFindMany },
  },
  Prisma: { InputJsonObject: {} },
  RunStatus: { failed: "failed", success: "success" },
}));

vi.mock("@repo/utils", () => ({
  LIVE_STATES: new Set(["LIVE", "HT", "INPLAY_ET"]),
  FINISHED_STATES: new Set(["FT", "AET", "FT_PEN"]),
}));

vi.mock("../../../utils/dates", () => ({
  nowUnixSeconds: vi.fn(() => 1700000000),
}));

vi.mock("../../../logger", () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { generateAlerts, autoResolveAlerts } from "../alerts.service";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no jobs, no fixtures (so other detectors return [])
  mockJobsFindMany.mockResolvedValue([]);
  mockJobRunsFindMany.mockResolvedValue([]);
  mockFixturesFindMany.mockResolvedValue([]);
  mockFixturesCount.mockResolvedValue(0);
  mockAdminAlertsFindMany.mockResolvedValue([]);
});

describe("detectUnsettledFixtures — per-fixture fingerprints", () => {
  it("returns one alert per finished fixture with unsettled predictions", async () => {
    // 2 group fixtures with unsettled predictions, mapping to 2 different fixtures
    mockGroupPredictionsFindMany
      .mockResolvedValueOnce([{ groupFixtureId: 10 }, { groupFixtureId: 20 }]) // detectUnsettledFixtures
      .mockResolvedValue([]); // autoResolveAlerts and other paths
    mockGroupFixturesFindMany
      .mockResolvedValueOnce([{ fixtureId: 100 }, { fixtureId: 200 }])  // groupFixtures by groupFixtureId
      .mockResolvedValueOnce([                                            // groupFixtures by fixtureId
        { id: 10, fixtureId: 100 },
        { id: 20, fixtureId: 200 },
      ])
      .mockResolvedValue([]);

    // Finished fixtures with unsettled predictions
    mockFixturesFindMany
      .mockResolvedValueOnce([]) // detectStuckFixtures
      .mockResolvedValueOnce([   // detectOverdueNs
      ])
      .mockResolvedValueOnce([   // detectUnsettledFixtures: finished fixtures query
        { id: 100, name: "Match A", state: "FT" },
        { id: 200, name: "Match B", state: "AET" },
      ])
      .mockResolvedValue([]);

    // Prediction counts per fixture
    mockGroupPredictionsCount
      .mockResolvedValueOnce(3)  // fixture 100
      .mockResolvedValueOnce(5); // fixture 200

    const alerts = await generateAlerts();

    const unsettledAlerts = alerts.filter((a) => a.category === "fixture_unsettled");
    expect(unsettledAlerts).toHaveLength(2);

    const fingerprints = unsettledAlerts.map((a) => a.fingerprint);
    expect(fingerprints).toContain("fixture_unsettled:100");
    expect(fingerprints).toContain("fixture_unsettled:200");
    expect(fingerprints).not.toContain("fixture_unsettled:batch");
  });

  it("skips fixtures with 0 unsettled predictions", async () => {
    mockGroupPredictionsFindMany
      .mockResolvedValueOnce([{ groupFixtureId: 10 }])
      .mockResolvedValue([]);
    mockGroupFixturesFindMany
      .mockResolvedValueOnce([{ fixtureId: 100 }])
      .mockResolvedValueOnce([{ id: 10, fixtureId: 100 }])
      .mockResolvedValue([]);

    mockFixturesFindMany
      .mockResolvedValueOnce([]) // detectStuckFixtures
      .mockResolvedValueOnce([]) // detectOverdueNs
      .mockResolvedValueOnce([{ id: 100, name: "Match A", state: "FT" }]) // detectUnsettledFixtures
      .mockResolvedValue([]);

    mockGroupPredictionsCount.mockResolvedValueOnce(0);

    const alerts = await generateAlerts();

    const unsettledAlerts = alerts.filter((a) => a.category === "fixture_unsettled");
    expect(unsettledAlerts).toHaveLength(0);
  });
});

describe("detectOverdueNs — per-fixture fingerprints", () => {
  it("returns one alert per overdue NS fixture", async () => {
    mockGroupPredictionsFindMany.mockResolvedValue([]);

    const nowTs = 1700000000;
    mockFixturesFindMany
      .mockResolvedValueOnce([]) // detectStuckFixtures
      .mockResolvedValueOnce([   // detectOverdueNs
        { id: 500, name: "Game X", startTs: nowTs - 3600, lastProviderState: "NS", lastProviderCheckAt: new Date() },
        { id: 501, name: "Game Y", startTs: nowTs - 7200, lastProviderState: null, lastProviderCheckAt: null },
      ])
      .mockResolvedValue([]);

    const alerts = await generateAlerts();

    const overdueAlerts = alerts.filter((a) => a.category === "overdue_ns");
    expect(overdueAlerts).toHaveLength(2);

    const fingerprints = overdueAlerts.map((a) => a.fingerprint);
    expect(fingerprints).toContain("overdue_ns:500");
    expect(fingerprints).toContain("overdue_ns:501");
    expect(fingerprints).not.toContain("overdue_ns:batch");
  });

  it("marks critical when fixture is >4h overdue", async () => {
    mockGroupPredictionsFindMany.mockResolvedValue([]);

    const nowTs = 1700000000;
    const fiveHoursAgo = nowTs - 5 * 3600;
    mockFixturesFindMany
      .mockResolvedValueOnce([]) // detectStuckFixtures
      .mockResolvedValueOnce([   // detectOverdueNs
        { id: 600, name: "Old Game", startTs: fiveHoursAgo, lastProviderState: null, lastProviderCheckAt: null },
      ])
      .mockResolvedValue([]);

    const alerts = await generateAlerts();

    const overdueAlerts = alerts.filter((a) => a.category === "overdue_ns");
    expect(overdueAlerts).toHaveLength(1);
    expect(overdueAlerts[0]!.severity).toBe("critical");
  });

  it("marks warning when fixture is <4h overdue", async () => {
    mockGroupPredictionsFindMany.mockResolvedValue([]);

    const nowTs = 1700000000;
    const twoHoursAgo = nowTs - 2 * 3600;
    mockFixturesFindMany
      .mockResolvedValueOnce([]) // detectStuckFixtures
      .mockResolvedValueOnce([   // detectOverdueNs
        { id: 601, name: "Recent Game", startTs: twoHoursAgo, lastProviderState: "NS", lastProviderCheckAt: new Date() },
      ])
      .mockResolvedValue([]);

    const alerts = await generateAlerts();

    const overdueAlerts = alerts.filter((a) => a.category === "overdue_ns");
    expect(overdueAlerts).toHaveLength(1);
    expect(overdueAlerts[0]!.severity).toBe("warning");
  });
});

describe("autoResolveAlerts — per-fixture resolution", () => {
  it("resolves alert for fixture that is no longer overdue", async () => {
    // Active alert for fixture 500
    mockAdminAlertsFindMany.mockResolvedValueOnce([
      {
        id: 1,
        fingerprint: "overdue_ns:500",
        severity: "warning",
        category: "overdue_ns",
        title: "Overdue",
        description: "...",
        actionUrl: null,
        actionLabel: null,
        metadata: {},
        createdAt: new Date(),
        resolvedAt: null,
        slackSentAt: null,
      },
    ]);

    // No overdue fixtures anymore
    mockGroupPredictionsFindMany.mockResolvedValue([]);
    mockFixturesFindMany.mockResolvedValue([]);
    mockFixturesCount.mockResolvedValue(0);

    const resolved = await autoResolveAlerts();

    expect(resolved).toBe(1);
    expect(mockAdminAlertsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { resolvedAt: expect.any(Date) },
      })
    );
  });
});
