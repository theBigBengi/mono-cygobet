// src/services/admin/sandbox.service.ts
// Sandbox: fictive fixtures (negative externalId), test group, simulate kickoff/FT/reset/cleanup.

import { prisma, type FixtureState } from "@repo/db";
import { LIVE_STATES } from "@repo/utils";
import { settlePredictionsForFixtures } from "../api/groups/service/settlement";
import { emitFixtureLiveEvents, emitFixtureFTEvents } from "../api/groups/service/chat-events";
import { getLogger } from "../../logger";
import type { TypedIOServer } from "../../types/socket";

const log = getLogger("Sandbox");

// ───── helpers ─────

/** Sandbox fixtures always have negative externalId */
async function assertSandboxFixture(fixtureId: number) {
  const f = await prisma.fixtures.findUnique({
    where: { id: fixtureId },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });
  if (!f) throw new Error("Fixture not found");
  if (f.externalId >= 0) throw new Error("Not a sandbox fixture");
  return f;
}

async function nextSandboxExternalId(): Promise<bigint> {
  const min = await prisma.fixtures.aggregate({
    _min: { externalId: true },
    where: { externalId: { lt: 0 } },
  });
  return (min._min.externalId ?? BigInt(0)) - BigInt(1);
}

const RANDOM_SCORES = [
  "1:0",
  "2:1",
  "0:0",
  "2:0",
  "1:1",
  "3:1",
  "0:1",
  "1:2",
  "2:2",
  "3:0",
];

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function createSandboxGroupWithFixtures(
  tx: Tx,
  params: {
    fixtureIds: number[];
    memberUserIds: number[];
    predictionMode: "CorrectScore" | "MatchWinner";
    autoGeneratePredictions?: boolean;
    groupName?: string;
    selectionMode: "games" | "leagues" | "teams";
    leagueIds: number[];
    teamIds: number[];
  }
) {
  const {
    fixtureIds,
    memberUserIds,
    predictionMode,
    autoGeneratePredictions,
    groupName,
    selectionMode,
    leagueIds,
    teamIds,
  } = params;

  const group = await tx.groups.create({
    data: {
      name: `[SANDBOX] ${groupName || "Test Group"}`,
      creatorId: memberUserIds[0]!,
      status: "active",
      privacy: "private",
    },
  });

  await tx.groupRules.create({
    data: {
      groupId: group.id,
      selectionMode,
      predictionMode,
      koRoundMode: "FullTime",
      onTheNosePoints: 3,
      correctDifferencePoints: 2,
      outcomePoints: 1,
      groupTeamsIds: selectionMode === "teams" ? teamIds : [],
      groupLeaguesIds: selectionMode === "leagues" ? leagueIds : [],
    },
  });

  const groupFixtureRecords = await tx.groupFixtures.createManyAndReturn({
    data: fixtureIds.map((fixtureId) => ({ groupId: group.id, fixtureId })),
    select: { id: true, groupId: true },
  });

  await tx.groupMembers.createMany({
    data: memberUserIds.map((userId, idx) => ({
      groupId: group.id,
      userId,
      role: idx === 0 ? "owner" : "member",
      status: "joined",
    })),
  });

  let predictionsGenerated = 0;
  if (autoGeneratePredictions) {
    const predData = groupFixtureRecords.flatMap((gf) =>
      memberUserIds.map((userId) => ({
        groupId: gf.groupId,
        groupFixtureId: gf.id,
        userId,
        prediction:
          RANDOM_SCORES[
            Math.floor(Math.random() * RANDOM_SCORES.length)
          ] as string,
      }))
    );
    await tx.groupPredictions.createMany({
      data: predData,
      skipDuplicates: true,
    });
    predictionsGenerated = predData.length;
  }

  return {
    groupId: group.id,
    groupName: group.name,
    fixtureIds,
    memberCount: memberUserIds.length,
    predictionsGenerated,
  };
}

// ───── 1. setup ─────

export async function sandboxSetup(args: {
  selectionMode?: "games" | "leagues" | "teams";
  fixtureCount?: number;
  leagueIds?: number[];
  teamIds?: number[];
  memberUserIds: number[];
  predictionMode: "CorrectScore" | "MatchWinner";
  autoGeneratePredictions?: boolean;
  groupName?: string;
  startInMinutes?: number;
}) {
  const selectionMode = args.selectionMode ?? "games";
  const {
    fixtureCount,
    leagueIds = [],
    teamIds = [],
    memberUserIds,
    predictionMode,
    autoGeneratePredictions,
    groupName,
  } = args;

  if (selectionMode === "games") {
    if (fixtureCount == null || fixtureCount < 1) {
      throw new Error("games mode requires fixtureCount (minimum 1)");
    }
  } else if (selectionMode === "leagues") {
    if (!leagueIds.length) {
      throw new Error("leagues mode requires at least one leagueId");
    }
  } else if (selectionMode === "teams") {
    if (!teamIds.length) {
      throw new Error("teams mode requires at least one teamId");
    }
  }

  const users = await prisma.users.findMany({
    where: { id: { in: memberUserIds } },
  });
  if (users.length !== memberUserIds.length) {
    const found = new Set(users.map((u) => u.id));
    const missing = memberUserIds.filter((id) => !found.has(id));
    throw new Error(`Users not found: ${missing.join(", ")}`);
  }

  if (selectionMode === "leagues" || selectionMode === "teams") {
    const nowTs = Math.floor(Date.now() / 1000);
    const realFixtures =
      selectionMode === "leagues"
        ? await prisma.fixtures.findMany({
            where: {
              leagueId: { in: leagueIds },
              state: "NS",
              startTs: { gt: nowTs },
              externalId: { gte: 0 },
            },
            select: {
              id: true,
              homeTeamId: true,
              awayTeamId: true,
              leagueId: true,
              round: true,
              name: true,
              startTs: true,
              startIso: true,
            },
            orderBy: { startTs: "asc" },
          })
        : await prisma.fixtures.findMany({
            where: {
              state: "NS",
              startTs: { gt: nowTs },
              externalId: { gte: 0 },
              OR: [
                { homeTeamId: { in: teamIds } },
                { awayTeamId: { in: teamIds } },
              ],
            },
            select: {
              id: true,
              homeTeamId: true,
              awayTeamId: true,
              leagueId: true,
              round: true,
              name: true,
              startTs: true,
              startIso: true,
            },
            orderBy: { startTs: "asc" },
          });

    if (realFixtures.length === 0) {
      throw new Error(
        selectionMode === "leagues"
          ? "No upcoming NS fixtures found for the given league(s)"
          : "No upcoming NS fixtures found involving the given team(s)"
      );
    }

    let nextExtId = await nextSandboxExternalId();
    const offsetSec =
      args.startInMinutes != null ? args.startInMinutes * 60 : null;

    return prisma.$transaction(async (tx) => {
      const fixtureData = realFixtures.map((src, i) => {
        const startTs =
          offsetSec != null ? nowTs + offsetSec + i : src.startTs;
        const startIso =
          offsetSec != null
            ? new Date(startTs * 1000).toISOString()
            : src.startIso;
        return {
          externalId: nextExtId - BigInt(i),
          homeTeamId: src.homeTeamId,
          awayTeamId: src.awayTeamId,
          leagueId: src.leagueId,
          name: src.name,
          startTs,
          startIso,
          round: src.round,
          state: "NS" as const,
        };
      });
      const created = await tx.fixtures.createManyAndReturn({
        data: fixtureData,
        select: { id: true },
      });
      const fixtureIds = created.map((f) => f.id);

      const result = await createSandboxGroupWithFixtures(tx, {
        fixtureIds,
        memberUserIds,
        predictionMode,
        autoGeneratePredictions,
        groupName,
        selectionMode,
        leagueIds,
        teamIds,
      });
      log.info(
        {
          groupId: result.groupId,
          fixtureIds: result.fixtureIds,
          predictionsGenerated: result.predictionsGenerated,
          selectionMode,
        },
        "Sandbox setup complete"
      );
      return result;
    });
  }

  // games mode
  const count = fixtureCount!;
  const teams = await prisma.teams.findMany({
    select: { id: true, name: true },
    take: count * 2,
    orderBy: { id: "asc" },
  });
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = teams[i];
    const b = teams[j];
    if (a !== undefined && b !== undefined) {
      teams[i] = b;
      teams[j] = a;
    }
  }
  if (teams.length < count * 2) {
    throw new Error(
      `Need ${count * 2} teams, only ${teams.length} available`
    );
  }

  let nextExtId = await nextSandboxExternalId();
  const nowTs = Math.floor(Date.now() / 1000);

  const offsetSec = (args.startInMinutes ?? 60) * 60;
  const fixtureData = Array.from({ length: count }, (_, i) => {
    const home = teams[i * 2]!;
    const away = teams[i * 2 + 1]!;
    const startTs = nowTs + offsetSec + i;
    const startIso = new Date(startTs * 1000).toISOString();
    return {
      externalId: nextExtId - BigInt(i),
      homeTeamId: home.id,
      awayTeamId: away.id,
      name: `${home.name} vs ${away.name}`,
      startTs,
      startIso,
      state: "NS" as const,
    };
  });

  return prisma.$transaction(async (tx) => {
    const created = await tx.fixtures.createManyAndReturn({
      data: fixtureData,
      select: { id: true },
    });
    const fixtureIds = created.map((f) => f.id);

    const result = await createSandboxGroupWithFixtures(tx, {
      fixtureIds,
      memberUserIds,
      predictionMode,
      autoGeneratePredictions,
      groupName,
      selectionMode: "games",
      leagueIds: [],
      teamIds: [],
    });
    log.info(
      {
        groupId: result.groupId,
        fixtureIds: result.fixtureIds,
        predictionsGenerated: result.predictionsGenerated,
      },
      "Sandbox setup complete"
    );
    return result;
  });
}

// ───── 1b. add fixture to group ─────

export async function sandboxAddFixture(args: {
  groupId: number;
  homeTeamId?: number;
  awayTeamId?: number;
  leagueId?: number;
  round?: string;
  startInMinutes?: number;
}) {
  const { groupId, homeTeamId, awayTeamId, leagueId, round, startInMinutes } =
    args;

  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { id: true, name: true },
  });
  if (!group || !group.name.startsWith("[SANDBOX]")) {
    throw new Error("Group not found or is not a sandbox group");
  }

  if (homeTeamId == null || awayTeamId == null) {
    throw new Error("homeTeamId and awayTeamId are required to add a fixture");
  }

  const [homeTeam, awayTeam] = await Promise.all([
    prisma.teams.findUnique({ where: { id: homeTeamId }, select: { name: true } }),
    prisma.teams.findUnique({ where: { id: awayTeamId }, select: { name: true } }),
  ]);
  if (!homeTeam || !awayTeam) {
    throw new Error("One or both teams not found");
  }

  const offsetSec = (startInMinutes ?? 60) * 60;
  const startTs = Math.floor(Date.now() / 1000) + offsetSec;
  const startIso = new Date(startTs * 1000).toISOString();
  const name = `${homeTeam.name} vs ${awayTeam.name}`;

  const nextExtId = await nextSandboxExternalId();

  return prisma.$transaction(async (tx) => {
    const fixture = await tx.fixtures.create({
      data: {
        externalId: nextExtId,
        homeTeamId,
        awayTeamId,
        leagueId: leagueId ?? null,
        round: round ?? null,
        name,
        startTs,
        startIso,
        state: "NS",
      },
    });

    await tx.groupFixtures.create({
      data: { groupId, fixtureId: fixture.id },
    });

    log.info({ groupId, fixtureId: fixture.id }, "Sandbox add fixture complete");

    return {
      fixtureId: fixture.id,
      name: fixture.name,
      startTs: fixture.startTs,
      startIso: fixture.startIso,
    };
  });
}

// ───── 2. simulate kickoff ─────

export async function sandboxSimulateKickoff(
  fixtureId: number,
  io?: TypedIOServer
) {
  const fixture = await assertSandboxFixture(fixtureId);
  if (fixture.state !== "NS") {
    throw new Error(`Fixture state is ${fixture.state}, expected NS`);
  }

  await prisma.fixtures.update({
    where: { id: fixtureId },
    data: {
      state: "INPLAY_1ST_HALF",
      liveMinute: 1,
      homeScore: 0,
      awayScore: 0,
      result: "0-0",
    },
  });

  await emitFixtureLiveEvents(
    [
      {
        id: fixtureId,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
      },
    ],
    io
  );

  return {
    fixtureId,
    state: "INPLAY_1ST_HALF",
    name: fixture.name,
  };
}

// ───── 3. simulate full-time ─────

export async function sandboxSimulateFullTime(
  args: {
    fixtureId: number;
    homeScore: number;
    awayScore: number;
    state?: "FT" | "AET" | "FT_PEN";
    homeScoreET?: number;
    awayScoreET?: number;
    penHome?: number;
    penAway?: number;
  },
  io?: TypedIOServer
) {
  const fixture = await assertSandboxFixture(args.fixtureId);
  const liveStates = [...LIVE_STATES] as string[];
  if (!liveStates.includes(fixture.state)) {
    throw new Error(
      `Fixture state is ${fixture.state}, must be LIVE. Run kickoff first.`
    );
  }

  const finishedState = args.state ?? "FT";

  await prisma.fixtures.update({
    where: { id: args.fixtureId },
    data: {
      state: finishedState,
      homeScore: args.homeScore,
      awayScore: args.awayScore,
      result: `${args.homeScore}-${args.awayScore}`,
      homeScore90: args.homeScore,
      awayScore90: args.awayScore,
      liveMinute: 90,
      ...(finishedState === "AET" || finishedState === "FT_PEN"
        ? {
            homeScoreET: args.homeScoreET ?? args.homeScore,
            awayScoreET: args.awayScoreET ?? args.awayScore,
          }
        : {}),
      ...(finishedState === "FT_PEN"
        ? {
            penHome: args.penHome ?? 0,
            penAway: args.penAway ?? 0,
          }
        : {}),
    },
  });

  const settlement = await settlePredictionsForFixtures([args.fixtureId], io);

  await emitFixtureFTEvents(
    [
      {
        id: args.fixtureId,
        homeScore: args.homeScore,
        awayScore: args.awayScore,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
      },
    ],
    io
  );

  return {
    fixtureId: args.fixtureId,
    state: finishedState,
    homeScore: args.homeScore,
    awayScore: args.awayScore,
    settlement,
  };
}

// ───── 3b. update live (score, minute, state) ─────

export async function sandboxUpdateLive(args: {
  fixtureId: number;
  homeScore?: number;
  awayScore?: number;
  liveMinute?: number;
  state?: string;
}) {
  const fixture = await assertSandboxFixture(args.fixtureId);
  const liveStates = [...LIVE_STATES] as string[];
  if (!liveStates.includes(fixture.state)) {
    throw new Error("Fixture must be LIVE. Run kickoff first.");
  }
  const data: {
    homeScore?: number;
    awayScore?: number;
    result?: string;
    liveMinute?: number;
    state?: FixtureState;
  } = {};
  if (args.homeScore !== undefined) data.homeScore = args.homeScore;
  if (args.awayScore !== undefined) data.awayScore = args.awayScore;
  if (args.homeScore !== undefined && args.awayScore !== undefined) {
    data.result = `${args.homeScore}-${args.awayScore}`;
  }
  if (args.liveMinute !== undefined) data.liveMinute = args.liveMinute;
  if (args.state !== undefined) {
    if (!liveStates.includes(args.state)) {
      throw new Error("state must be one of LIVE_STATES (not FT/NS).");
    }
    data.state = args.state as FixtureState;
  }
  if (Object.keys(data).length === 0) return fixture;
  const updated = await prisma.fixtures.update({
    where: { id: args.fixtureId },
    data,
  });
  return updated;
}

// ───── 3c. update start time ─────

export async function sandboxUpdateStartTime(args: {
  fixtureId: number;
  startTime: string; // ISO 8601 string
}) {
  const fixture = await assertSandboxFixture(args.fixtureId);
  if (fixture.state !== "NS") {
    throw new Error("Can only change start time for NS fixtures");
  }
  const date = new Date(args.startTime);
  const startTs = Math.floor(date.getTime() / 1000);
  const startIso = date.toISOString();
  await prisma.fixtures.update({
    where: { id: args.fixtureId },
    data: { startTs, startIso },
  });
  return { fixtureId: args.fixtureId, startTs, startIso };
}

// ───── 4. reset fixture ─────

export async function sandboxResetFixture(fixtureId: number) {
  await assertSandboxFixture(fixtureId);

  await prisma.fixtures.update({
    where: { id: fixtureId },
    data: {
      state: "NS",
      homeScore: null,
      awayScore: null,
      result: null,
      homeScore90: null,
      awayScore90: null,
      homeScoreET: null,
      awayScoreET: null,
      penHome: null,
      penAway: null,
      liveMinute: null,
    },
  });

  const gfs = await prisma.groupFixtures.findMany({
    where: { fixtureId },
    select: { id: true, groupId: true },
  });
  const gfIds = gfs.map((gf) => gf.id);
  const groupIds = [...new Set(gfs.map((gf) => gf.groupId))];

  let predictionsReset = 0;
  if (gfIds.length > 0) {
    const res = await prisma.groupPredictions.updateMany({
      where: { groupFixtureId: { in: gfIds } },
      data: {
        settledAt: null,
        points: "0",
        winningCorrectScore: false,
        winningMatchWinner: false,
      },
    });
    predictionsReset = res.count;
  }

  let groupsReactivated = 0;
  if (groupIds.length > 0) {
    const res = await prisma.groups.updateMany({
      where: { id: { in: groupIds }, status: "ended" },
      data: { status: "active" },
    });
    groupsReactivated = res.count;
  }

  return {
    fixtureId,
    state: "NS",
    predictionsReset,
    groupsReactivated,
  };
}

// ───── 5. cleanup ─────

export async function sandboxCleanup() {
  const sandboxFixtures = await prisma.fixtures.findMany({
    where: { externalId: { lt: 0 } },
    select: { id: true },
  });
  const fixtureIds = sandboxFixtures.map((f) => f.id);

  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { fixtureId: { in: fixtureIds } },
    select: { groupId: true },
  });
  const groupIds = [...new Set(groupFixtures.map((gf) => gf.groupId))];

  const sandboxGroupsByName = await prisma.groups.findMany({
    where: { name: { startsWith: "[SANDBOX]" } },
    select: { id: true },
  });
  const allGroupIds = [
    ...new Set([
      ...groupIds,
      ...sandboxGroupsByName.map((g) => g.id),
    ]),
  ];

  let deletedGroups = 0;
  if (allGroupIds.length > 0) {
    const res = await prisma.groups.deleteMany({
      where: { id: { in: allGroupIds } },
    });
    deletedGroups = res.count;
  }

  const delFixtures = await prisma.fixtures.deleteMany({
    where: { externalId: { lt: 0 } },
  });

  log.info(
    { deletedFixtures: delFixtures.count, deletedGroups },
    "Sandbox cleanup complete"
  );

  return {
    deletedFixtures: delFixtures.count,
    deletedGroups,
  };
}

// ───── 6. list ─────

export async function sandboxList() {
  const fixtures = await prisma.fixtures.findMany({
    where: { externalId: { lt: 0 } },
    select: {
      id: true,
      externalId: true,
      name: true,
      state: true,
      homeScore: true,
      awayScore: true,
      liveMinute: true,
      startTs: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
    orderBy: { id: "asc" },
  });

  const fixtureIds = fixtures.map((f) => f.id);
  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { fixtureId: { in: fixtureIds } },
    select: { groupId: true, fixtureId: true },
  });
  const groupIdsFromFixtures = [
    ...new Set(groupFixtures.map((gf) => gf.groupId)),
  ];

  const sandboxGroupsByName = await prisma.groups.findMany({
    where: { name: { startsWith: "[SANDBOX]" } },
    select: { id: true },
  });
  const allGroupIds = [
    ...new Set([
      ...groupIdsFromFixtures,
      ...sandboxGroupsByName.map((g) => g.id),
    ]),
  ];

  const groups =
    allGroupIds.length > 0
      ? await prisma.groups.findMany({
          where: { id: { in: allGroupIds } },
          select: {
            id: true,
            name: true,
            status: true,
            _count: { select: { groupMembers: true, groupFixtures: true } },
          },
        })
      : [];

  const groupFixturesByGroup = new Map<number, number[]>();
  for (const gf of groupFixtures) {
    const list = groupFixturesByGroup.get(gf.groupId) ?? [];
    list.push(gf.fixtureId);
    groupFixturesByGroup.set(gf.groupId, list);
  }
  for (const g of groups) {
    if (!groupFixturesByGroup.has(g.id)) {
      groupFixturesByGroup.set(g.id, []);
    }
  }

  return {
    fixtures: fixtures.map((f) => ({
      id: f.id,
      externalId: f.externalId.toString(),
      name: f.name,
      state: f.state,
      homeScore: f.homeScore,
      awayScore: f.awayScore,
      liveMinute: f.liveMinute,
      startTs: f.startTs,
      homeTeam: f.homeTeam?.name ?? null,
      awayTeam: f.awayTeam?.name ?? null,
    })),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      memberCount: g._count.groupMembers,
      fixtureCount: g._count.groupFixtures,
      fixtureIds: groupFixturesByGroup.get(g.id) ?? [],
    })),
  };
}
