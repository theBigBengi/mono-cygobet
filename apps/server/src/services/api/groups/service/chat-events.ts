import { prisma } from "@repo/db";
import { createSystemMessage } from "./chat";
import { logActivity } from "./activity-log";
import { getLogger } from "../../../../logger";
import type { TypedIOServer } from "../../../../types/socket";

const log = getLogger("groups.chat-events");

/**
 * Create a system message and broadcast it via Socket.IO.
 * Silently catches errors to never fail the calling operation.
 */
export async function emitSystemEvent(
  groupId: number,
  eventType: string,
  eventData: Record<string, unknown>,
  io?: TypedIOServer
): Promise<void> {
  try {
    const message = await createSystemMessage(groupId, eventType, eventData);

    io?.to(`group:${groupId}`).emit("message:new", {
      id: message.id,
      createdAt: message.createdAt.toISOString(),
      groupId: message.groupId,
      senderId: null,
      type: "system_event" as const,
      body: message.body,
      meta: message.meta as Record<string, unknown> | null,
      sender: null,
    });
  } catch (err) {
    log.warn({ groupId, eventType, err }, "Failed to emit system event");
  }
}

export async function emitMemberJoinedEvent(
  groupId: number,
  userId: number,
  io?: TypedIOServer
): Promise<void> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const username = user?.username || "Someone";

    // Write to chat (existing behavior)
    await emitSystemEvent(
      groupId,
      "member_joined",
      { userId, username },
      io
    );

    // Also write to activity log
    await logActivity(groupId, "member_joined", `${username} joined the group`, {
      actorId: userId,
      meta: { userId, username },
      io,
    });
  } catch (err) {
    log.warn({ groupId, userId, err }, "Failed to emit member_joined event");
  }
}

type FixtureBase = {
  id: number;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
};

async function emitFixtureEventsInternal<T extends FixtureBase>(
  fixtures: T[],
  eventType: string,
  buildEventData: (fixture: T, fixtureId: number) => Record<string, unknown>,
  buildActivityBody: (fixture: T) => string,
  io?: TypedIOServer
): Promise<void> {
  const fixtureIds = fixtures.map((f) => f.id);
  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { fixtureId: { in: fixtureIds } },
    select: { groupId: true, fixtureId: true },
  });

  const groupMap = new Map<number, number[]>();
  for (const gf of groupFixtures) {
    const arr = groupMap.get(gf.groupId) || [];
    arr.push(gf.fixtureId);
    groupMap.set(gf.groupId, arr);
  }

  const fixtureMap = new Map(fixtures.map((f) => [f.id, f]));

  for (const [groupId, fIds] of groupMap) {
    for (const fixtureId of fIds) {
      const fixture = fixtureMap.get(fixtureId);
      if (!fixture) continue;

      const eventData = buildEventData(fixture, fixtureId);

      // Write to chat (existing behavior)
      await emitSystemEvent(groupId, eventType, eventData, io);

      // Also write to activity log
      await logActivity(groupId, eventType, buildActivityBody(fixture), {
        meta: eventData,
        io,
      });
    }
  }
}

type FixtureWithTeams = {
  id: number;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
};

export async function emitFixtureLiveEvents(
  fixtures: FixtureWithTeams[],
  io?: TypedIOServer
): Promise<void> {
  await emitFixtureEventsInternal(
    fixtures,
    "fixture_live",
    (f, fixtureId) => ({
      fixtureId,
      homeTeam: f.homeTeam?.name || "TBD",
      awayTeam: f.awayTeam?.name || "TBD",
    }),
    (f) =>
      `${f.homeTeam?.name || "TBD"} vs ${f.awayTeam?.name || "TBD"} — Kicked off!`,
    io
  );
}

type FixtureWithScoresAndTeams = {
  id: number;
  homeScore90: number | null;
  awayScore90: number | null;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
};

export async function emitFixtureFTEvents(
  fixtures: FixtureWithScoresAndTeams[],
  io?: TypedIOServer
): Promise<void> {
  await emitFixtureEventsInternal(
    fixtures,
    "fixture_ft",
    (f, fixtureId) => ({
      fixtureId,
      homeTeam: f.homeTeam?.name || "TBD",
      awayTeam: f.awayTeam?.name || "TBD",
      homeScore90: f.homeScore90,
      awayScore90: f.awayScore90,
    }),
    (f) =>
      `${f.homeTeam?.name || "TBD"} ${f.homeScore90 ?? "?"}-${f.awayScore90 ?? "?"} ${f.awayTeam?.name || "TBD"} — Full Time`,
    io
  );
}

// ─── Activity-only events (no chat message) ────────────────────────────────

export async function emitMemberLeftEvent(
  groupId: number,
  userId: number,
  io?: TypedIOServer
): Promise<void> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    const username = user?.username || "Someone";
    await logActivity(groupId, "member_left", `${username} left the group`, {
      actorId: userId,
      meta: { userId, username },
      io,
    });
  } catch (err) {
    log.warn({ groupId, userId, err }, "Failed to emit member_left event");
  }
}

export async function emitRulesChangedEvent(
  groupId: number,
  changedFields: string[],
  actorId: number,
  io?: TypedIOServer
): Promise<void> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: actorId },
      select: { username: true },
    });
    const username = user?.username || "Someone";
    await logActivity(groupId, "rules_changed", `${username} updated group rules`, {
      actorId,
      meta: { changedFields, username },
      io,
    });
  } catch (err) {
    log.warn({ groupId, err }, "Failed to emit rules_changed event");
  }
}

export async function emitGamesAddedEvent(
  groupId: number,
  count: number,
  actorId: number,
  io?: TypedIOServer
): Promise<void> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: actorId },
      select: { username: true },
    });
    const username = user?.username || "Someone";
    await logActivity(groupId, "games_added", `${username} added ${count} games`, {
      actorId,
      meta: { count, username },
      io,
    });
  } catch (err) {
    log.warn({ groupId, err }, "Failed to emit games_added event");
  }
}

export async function emitGamesRemovedEvent(
  groupId: number,
  count: number,
  actorId: number,
  io?: TypedIOServer
): Promise<void> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: actorId },
      select: { username: true },
    });
    const username = user?.username || "Someone";
    await logActivity(
      groupId,
      "games_removed",
      `${username} removed ${count} games`,
      { actorId, meta: { count, username }, io }
    );
  } catch (err) {
    log.warn({ groupId, err }, "Failed to emit games_removed event");
  }
}

export async function emitGroupInfoChangedEvent(
  groupId: number,
  changedFields: string[],
  actorId: number,
  io?: TypedIOServer
): Promise<void> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: actorId },
      select: { username: true },
    });
    const username = user?.username || "Someone";
    await logActivity(
      groupId,
      "group_info_changed",
      `${username} updated group info`,
      { actorId, meta: { changedFields, username }, io }
    );
  } catch (err) {
    log.warn({ groupId, err }, "Failed to emit group_info_changed event");
  }
}

export async function emitFixturesSyncedEvent(
  groupId: number,
  fixtureIds: number[],
  io?: TypedIOServer
): Promise<void> {
  try {
    const fixtures = await prisma.fixtures.findMany({
      where: { id: { in: fixtureIds } },
      select: {
        id: true,
        startTs: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        league: { select: { name: true } },
      },
    });

    for (const f of fixtures) {
      const home = f.homeTeam?.name || "TBD";
      const away = f.awayTeam?.name || "TBD";
      const league = f.league?.name || null;

      await logActivity(
        groupId,
        "fixtures_synced",
        `${home} vs ${away}`,
        {
          meta: { fixtureId: f.id, home, away, league, startTs: f.startTs },
          io,
        }
      );
    }
  } catch (err) {
    log.warn({ groupId, err }, "Failed to emit fixtures_synced event");
  }
}

export async function emitGroupPublishedEvent(
  groupId: number,
  actorId: number,
  io?: TypedIOServer
): Promise<void> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: actorId },
      select: { username: true },
    });
    const username = user?.username || "Someone";
    await logActivity(
      groupId,
      "group_published",
      `${username} activated the group`,
      { actorId, meta: { username }, io }
    );
  } catch (err) {
    log.warn({ groupId, err }, "Failed to emit group_published event");
  }
}
