import { apiGet, apiPost, apiDelete } from "@/lib/adminApi";

// ───── Types (matching server responses) ─────

export type SandboxFixture = {
  id: number;
  externalId: string;
  name: string;
  state: string;
  homeScore90: number | null;
  awayScore90: number | null;
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
  fixtureIds: number[];
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
    homeScore90?: number;
    awayScore90?: number;
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

export type SandboxDeleteGroupResponse = {
  status: string;
  data: { groupId: number; deletedFixtures: number };
  message: string;
};

export type SandboxCleanupResponse = {
  status: string;
  data: { deletedFixtures: number; deletedGroups: number };
  message: string;
};

export type SandboxAddFixtureResponse = {
  status: string;
  data: {
    fixtureId: number;
    name: string;
    startTs: number;
    startIso: string;
  };
  message: string;
};

export type SandboxMember = {
  userId: number;
  username: string;
  email: string | null;
  image: string | null;
  role: string;
};

export type SandboxGetMembersResponse = {
  status: string;
  data: SandboxMember[];
  message: string;
};

export type SandboxSendMessageResponse = {
  status: string;
  data: { messageId: number; body: string; createdAt: string };
  message: string;
};

// ───── Service ─────

export const sandboxService = {
  list: (): Promise<SandboxListResponse> =>
    apiGet<SandboxListResponse>("/admin/sandbox/list"),

  setup: (args: {
    selectionMode?: "games" | "leagues" | "teams";
    fixtureCount?: number;
    leagueIds?: number[];
    teamIds?: number[];
    memberUserIds: number[];
    predictionMode: "CorrectScore" | "MatchWinner";
    autoGeneratePredictions?: boolean;
    groupName?: string;
    startInMinutes?: number;
  }): Promise<SandboxSetupResponse> =>
    apiPost<SandboxSetupResponse>("/admin/sandbox/setup", args),

  addFixture: (args: {
    groupId: number;
    homeTeamId?: number;
    awayTeamId?: number;
    leagueId?: number;
    round?: string;
    startInMinutes?: number;
  }): Promise<SandboxAddFixtureResponse> =>
    apiPost<SandboxAddFixtureResponse>("/admin/sandbox/add-fixture", args),

  simulateKickoff: (fixtureId: number): Promise<SandboxSimulateResponse> =>
    apiPost<SandboxSimulateResponse>("/admin/sandbox/simulate/kickoff", {
      fixtureId,
    }),

  simulateFullTime: (args: {
    fixtureId: number;
    homeScore90: number;
    awayScore90: number;
    state?: "FT" | "AET" | "FT_PEN";
    homeScoreET?: number;
    awayScoreET?: number;
    penHome?: number;
    penAway?: number;
  }): Promise<SandboxSimulateResponse> =>
    apiPost<SandboxSimulateResponse>("/admin/sandbox/simulate/full-time", args),

  updateLive: (args: {
    fixtureId: number;
    homeScore90?: number;
    awayScore90?: number;
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
    apiPost<SandboxSimulateResponse>("/admin/sandbox/update-start-time", args),

  deleteGroup: (groupId: number): Promise<SandboxDeleteGroupResponse> =>
    apiDelete<SandboxDeleteGroupResponse>(`/admin/sandbox/group/${groupId}`),

  cleanup: (): Promise<SandboxCleanupResponse> =>
    apiDelete<SandboxCleanupResponse>("/admin/sandbox/cleanup"),

  getGroupMembers: (groupId: number): Promise<SandboxGetMembersResponse> =>
    apiGet<SandboxGetMembersResponse>(
      `/admin/sandbox/group/${groupId}/members`
    ),

  sendMessage: (args: {
    groupId: number;
    senderId: number;
    body: string;
  }): Promise<SandboxSendMessageResponse> =>
    apiPost<SandboxSendMessageResponse>("/admin/sandbox/send-message", args),
};
