// groups/service/nudge.ts
// Nudge service: send a nudge to a group member for an upcoming fixture.

import { Prisma } from "@repo/db";
import { BadRequestError, ConflictError } from "../../../../utils/errors";
import { assertGroupMember } from "../permissions";
import { repository as repo } from "../repository";
import { nowUnixSeconds } from "../../../../utils/dates";
import { getLogger } from "../../../../logger";

const log = getLogger("groups.nudge");

/**
 * Send a nudge to a group member for a fixture (remind them to predict).
 * - Caller must be a group member; target must be a joined member; nudger !== target.
 * - Group must have nudge enabled; fixture must be in group, NS, and within nudge window.
 * - Target must have no prediction for the fixture.
 * - On duplicate (same nudger, target, fixture) returns 409 "Already nudged".
 */
export async function sendNudge(
  groupId: number,
  nudgerUserId: number,
  targetUserId: number,
  fixtureId: number
): Promise<{ status: "success"; message: string }> {
  log.debug({ groupId, nudgerUserId, targetUserId, fixtureId }, "sendNudge - start");

  await assertGroupMember(groupId, nudgerUserId);

  if (nudgerUserId === targetUserId) {
    throw new BadRequestError("Cannot nudge yourself");
  }

  const targetMember = await repo.findGroupMember(groupId, targetUserId);
  if (!targetMember || targetMember.status !== "joined") {
    throw new BadRequestError("Target user is not a joined member of this group");
  }

  const rules = await repo.findGroupRules(groupId);
  if (!rules?.nudgeEnabled) {
    throw new BadRequestError("Nudge is not enabled for this group");
  }

  const groupFixture = await repo.findGroupFixtureByGroupAndFixture(groupId, fixtureId);
  if (!groupFixture) {
    throw new BadRequestError("Fixture does not belong to this group");
  }

  const fixture = await repo.findFixtureByGroupFixtureId(groupFixture.id);
  if (!fixture) {
    throw new BadRequestError("Fixture not found");
  }
  if (fixture.state !== "NS") {
    throw new BadRequestError("Can only nudge for fixtures that have not started");
  }

  const now = nowUnixSeconds();
  const windowSeconds = (rules.nudgeWindowMinutes ?? 60) * 60;
  const windowEnd = now + windowSeconds;
  if (fixture.startTs < now || fixture.startTs > windowEnd) {
    throw new BadRequestError(
      "Fixture is outside the nudge window (must start within the configured minutes before kickoff)"
    );
  }

  const targetPrediction = await repo.findGroupPredictionByUserAndGroupFixture(
    targetUserId,
    groupFixture.id
  );
  if (targetPrediction) {
    throw new BadRequestError("Target user has already predicted this fixture");
  }

  try {
    await repo.createNudgeEvent({
      groupId,
      fixtureId,
      nudgerUserId,
      targetUserId,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("Already nudged");
    }
    throw err;
  }

  log.info({ groupId, nudgerUserId, targetUserId, fixtureId }, "sendNudge - success");
  return {
    status: "success",
    message: "Nudge sent successfully",
  };
}
