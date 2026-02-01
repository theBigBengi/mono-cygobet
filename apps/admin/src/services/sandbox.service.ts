import { apiGet, apiPost, apiDelete } from "@/lib/adminApi";

// ───── Types (matching server responses) ─────

export type SandboxFixture = {
  id: number;
  externalId: string;
  name: string;
  state: string;
  homeScore: number | null;
  awayScore: number | null;
  liveMinute: number | null;
  startTs: number;
  homeTeam: string | null;
  awayTeam: string | null;
};

export type SandboxGroup = {
  id: number;
  name: string;
  status: string;
  memberCount: number;
  fixtureCount: number;
};

export type SandboxListResponse = {
  status: string;
  data: { fixtures: SandboxFixture[]; groups: SandboxGroup[] };
  message: string;
};

export type SandboxSetupResponse = {
  status: string;
  data: {
    groupId: number;
    groupName: string;
    fixtureIds: number[];
    memberCount: number;
    predictionsGenerated: number;
  };
  message: string;
};

export type SandboxSimulateResponse = {
  status: string;
  data: {
    fixtureId: number;
    state: string;
    name?: string;
    homeScore?: number;
    awayScore?: number;
    settlement?: { settled: number; skipped: number; groupsEnded: number };
  };
  message: string;
};

export type SandboxResetResponse = {
  status: string;
  data: {
    fixtureId: number;
    state: string;
    predictionsReset: number;
    groupsReactivated: number;
  };
  message: string;
};

export type SandboxCleanupResponse = {
  status: string;
  data: { deletedFixtures: number; deletedGroups: number };
  message: string;
};

// ───── Service ─────

export const sandboxService = {
  list: (): Promise<SandboxListResponse> =>
    apiGet<SandboxListResponse>("/admin/sandbox/list"),

  setup: (args: {
    fixtureCount: number;
    memberUserIds: number[];
    predictionMode: "CorrectScore" | "MatchWinner";
    autoGeneratePredictions?: boolean;
    groupName?: string;
    startInMinutes?: number;
  }): Promise<SandboxSetupResponse> =>
    apiPost<SandboxSetupResponse>("/admin/sandbox/setup", args),

  simulateKickoff: (fixtureId: number): Promise<SandboxSimulateResponse> =>
    apiPost<SandboxSimulateResponse>("/admin/sandbox/simulate/kickoff", {
      fixtureId,
    }),

  simulateFullTime: (args: {
    fixtureId: number;
    homeScore: number;
    awayScore: number;
    state?: "FT" | "AET" | "FT_PEN";
    homeScoreET?: number;
    awayScoreET?: number;
    penHome?: number;
    penAway?: number;
  }): Promise<SandboxSimulateResponse> =>
    apiPost<SandboxSimulateResponse>(
      "/admin/sandbox/simulate/full-time",
      args
    ),

  updateLive: (args: {
    fixtureId: number;
    homeScore?: number;
    awayScore?: number;
    liveMinute?: number;
    state?: string;
  }): Promise<SandboxSimulateResponse> =>
    apiPost<SandboxSimulateResponse>(
      "/admin/sandbox/simulate/update-live",
      args
    ),

  resetFixture: (fixtureId: number): Promise<SandboxResetResponse> =>
    apiPost<SandboxResetResponse>("/admin/sandbox/reset-fixture", {
      fixtureId,
    }),

  updateStartTime: (args: {
    fixtureId: number;
    startTime: string;
  }): Promise<SandboxSimulateResponse> =>
    apiPost<SandboxSimulateResponse>(
      "/admin/sandbox/update-start-time",
      args
    ),

  cleanup: (): Promise<SandboxCleanupResponse> =>
    apiDelete<SandboxCleanupResponse>("/admin/sandbox/cleanup"),
};
