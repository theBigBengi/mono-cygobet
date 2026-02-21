import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockJobsFindMany = vi.fn(async () => []);
const mockJobRunsFindMany = vi.fn(async () => []);

vi.mock("@repo/db", () => ({
  RunStatus: { success: "success", failed: "failed", running: "running", queued: "queued", skipped: "skipped" },
  prisma: {
    jobs: { findMany: mockJobsFindMany },
    jobRuns: { findMany: mockJobRunsFindMany },
    $queryRaw: vi.fn(async () => [{ "?column?": 1 }]),
  },
}));

vi.mock("../../schemas/health.schemas", () => ({
  healthResponseSchema: {},
}));

vi.mock("../../types/health", () => ({}));

// Minimal Fastify stub to register the route and call it
async function callSchedulerEndpoint() {
  const routes: Record<string, Function> = {};

  const fakeFastify = {
    get(path: string, ...args: unknown[]) {
      // Fastify .get can be (path, handler) or (path, opts, handler)
      const handler = args.length === 2 ? args[1] : args[0];
      routes[path] = handler as Function;
    },
  };

  const mod = await import("../health.route");
  await mod.default(fakeFastify as never, {} as never);

  const handler = routes["/health/scheduler"];
  if (!handler) throw new Error("Route /health/scheduler not registered");
  return handler();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /health/scheduler", () => {
  it("returns ok when all enabled jobs have successful last run", async () => {
    mockJobsFindMany.mockResolvedValueOnce([
      { key: "upsert-live-fixtures", enabled: true, scheduleCron: "*/5 * * * *" },
      { key: "admin-alerts", enabled: true, scheduleCron: "*/2 * * * *" },
    ]);
    mockJobRunsFindMany.mockResolvedValueOnce([
      { jobKey: "upsert-live-fixtures", startedAt: new Date("2026-02-21T10:00:00Z"), status: "success" },
      { jobKey: "admin-alerts", startedAt: new Date("2026-02-21T10:01:00Z"), status: "success" },
    ]);

    const result = await callSchedulerEndpoint();

    expect(result.status).toBe("ok");
    expect(result.jobs["upsert-live-fixtures"].lastStatus).toBe("success");
    expect(result.jobs["admin-alerts"].lastStatus).toBe("success");
    expect(result.timestamp).toBeDefined();
  });

  it("returns degraded when an enabled job's last run failed", async () => {
    mockJobsFindMany.mockResolvedValueOnce([
      { key: "upsert-live-fixtures", enabled: true, scheduleCron: "*/5 * * * *" },
      { key: "admin-alerts", enabled: true, scheduleCron: "*/2 * * * *" },
    ]);
    mockJobRunsFindMany.mockResolvedValueOnce([
      { jobKey: "upsert-live-fixtures", startedAt: new Date("2026-02-21T10:00:00Z"), status: "failed" },
      { jobKey: "admin-alerts", startedAt: new Date("2026-02-21T10:01:00Z"), status: "success" },
    ]);

    const result = await callSchedulerEndpoint();

    expect(result.status).toBe("degraded");
  });

  it("returns error when an enabled job has never run", async () => {
    mockJobsFindMany.mockResolvedValueOnce([
      { key: "upsert-live-fixtures", enabled: true, scheduleCron: "*/5 * * * *" },
      { key: "admin-alerts", enabled: true, scheduleCron: "*/2 * * * *" },
    ]);
    // Only one job has a run — the other never ran
    mockJobRunsFindMany.mockResolvedValueOnce([
      { jobKey: "admin-alerts", startedAt: new Date("2026-02-21T10:01:00Z"), status: "success" },
    ]);

    const result = await callSchedulerEndpoint();

    expect(result.status).toBe("error");
    expect(result.jobs["upsert-live-fixtures"].lastRunAt).toBeNull();
    expect(result.jobs["upsert-live-fixtures"].lastStatus).toBeNull();
  });

  it("ignores disabled jobs for status determination", async () => {
    mockJobsFindMany.mockResolvedValueOnce([
      { key: "upsert-live-fixtures", enabled: true, scheduleCron: "*/5 * * * *" },
      { key: "disabled-job", enabled: false, scheduleCron: null },
    ]);
    mockJobRunsFindMany.mockResolvedValueOnce([
      { jobKey: "upsert-live-fixtures", startedAt: new Date("2026-02-21T10:00:00Z"), status: "success" },
      // disabled-job never ran — should NOT cause "error"
    ]);

    const result = await callSchedulerEndpoint();

    expect(result.status).toBe("ok");
    expect(result.jobs["disabled-job"].enabled).toBe(false);
    expect(result.jobs["disabled-job"].lastRunAt).toBeNull();
  });

  it("returns per-job info with scheduleCron and enabled fields", async () => {
    mockJobsFindMany.mockResolvedValueOnce([
      { key: "upsert-live-fixtures", enabled: true, scheduleCron: "*/5 * * * *" },
    ]);
    const runDate = new Date("2026-02-21T10:00:00Z");
    mockJobRunsFindMany.mockResolvedValueOnce([
      { jobKey: "upsert-live-fixtures", startedAt: runDate, status: "success" },
    ]);

    const result = await callSchedulerEndpoint();
    const job = result.jobs["upsert-live-fixtures"];

    expect(job.lastRunAt).toBe(runDate.toISOString());
    expect(job.lastStatus).toBe("success");
    expect(job.enabled).toBe(true);
    expect(job.scheduleCron).toBe("*/5 * * * *");
  });

  it("error takes priority over degraded", async () => {
    mockJobsFindMany.mockResolvedValueOnce([
      { key: "job-a", enabled: true, scheduleCron: "*/5 * * * *" },
      { key: "job-b", enabled: true, scheduleCron: "*/5 * * * *" },
    ]);
    mockJobRunsFindMany.mockResolvedValueOnce([
      // job-a failed (→ degraded), job-b never ran (→ error)
      { jobKey: "job-a", startedAt: new Date(), status: "failed" },
    ]);

    const result = await callSchedulerEndpoint();

    expect(result.status).toBe("error");
  });
});
