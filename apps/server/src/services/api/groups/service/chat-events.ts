import { prisma } from "@repo/db";
import { createSystemMessage } from "./chat";
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
  } catch {
    // Silently fail — never break the calling operation
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

    await emitSystemEvent(
      groupId,
      "member_joined",
      {
        userId,
        username: user?.username || "Someone",
      },
      io
    );
  } catch (err) {
    log.warn({ groupId, userId, err }, "Failed to emit member_joined event");
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

      await emitSystemEvent(
        groupId,
        "fixture_live",
        {
          fixtureId,
          homeTeam: fixture.homeTeam?.name || "TBD",
          awayTeam: fixture.awayTeam?.name || "TBD",
        },
        io
      );
    }
  }
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

      await emitSystemEvent(
        groupId,
        "fixture_ft",
        {
          fixtureId,
          homeTeam: fixture.homeTeam?.name || "TBD",
          awayTeam: fixture.awayTeam?.name || "TBD",
          homeScore90: fixture.homeScore90,
          awayScore90: fixture.awayScore90,
        },
        io
      );
    }
  }
}
