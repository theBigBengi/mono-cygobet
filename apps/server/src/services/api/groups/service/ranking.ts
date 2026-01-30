// groups/service/ranking.ts
// Group ranking service: aggregated points and stats per member.

import { prisma } from "@repo/db";
import { assertGroupMember } from "../permissions";
import { repository as repo } from "../repository";
import { getLogger } from "../../../../logger";
import type { RankingItem, RankingResponse } from "../types";

const log = getLogger("Ranking");

type RawRankRow = {
  user_id: number;
  username: string | null;
  total_points: string | number | bigint;
  prediction_count: string | number | bigint;
  correct_score_count: string | number | bigint;
  correct_outcome_count: string | number | bigint;
};

function toNumber(value: string | number | bigint): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return parseInt(value, 10) || 0;
  return 0;
}

/**
 * Get group ranking: all joined members with aggregated points and stats.
 * - Verifies that the user is a group member (creator or joined).
 * - Uses raw SQL because points is stored as String; Prisma groupBy cannot SUM it.
 * - Members with 0 predictions are included with zeros.
 * - Ranks are 1-based; ties (same totalPoints and correctScoreCount) get the same rank.
 */
export async function getGroupRanking(
  groupId: number,
  userId: number
): Promise<RankingResponse> {
  log.debug({ groupId, userId }, "getGroupRanking - start");
  await assertGroupMember(groupId, userId);

  const [rawRows, membersWithUsers] = await Promise.all([
    prisma.$queryRaw<RawRankRow[]>`
      SELECT
        gp.user_id,
        u.username,
        COALESCE(SUM(CAST(gp.points AS INTEGER)), 0) AS total_points,
        COUNT(gp.id)::int AS prediction_count,
        COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END)::int AS correct_score_count,
        COUNT(CASE WHEN gp.winning_match_winner = true THEN 1 END)::int AS correct_outcome_count
      FROM group_predictions gp
      JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id
      JOIN users u ON u.id = gp.user_id
      WHERE gp.group_id = ${groupId}
        AND gm.status = 'joined'::group_members_status
      GROUP BY gp.user_id, u.username
      ORDER BY total_points DESC, correct_score_count DESC, u.username ASC
    `,
    repo.findGroupMembersWithUsers(groupId),
  ]);

  const userById = new Map(
    membersWithUsers.users.map((u) => [u.id, { username: u.username }])
  );

  const fromSql: RankingItem[] = rawRows.map((row) => ({
    rank: 0,
    userId: row.user_id,
    username: row.username,
    totalPoints: toNumber(row.total_points),
    predictionCount: toNumber(row.prediction_count),
    correctScoreCount: toNumber(row.correct_score_count),
    correctOutcomeCount: toNumber(row.correct_outcome_count),
  }));

  const userIdsFromSql = new Set(fromSql.map((r) => r.userId));
  const zeroRows: RankingItem[] = [];
  for (const m of membersWithUsers.members) {
    if (userIdsFromSql.has(m.userId)) continue;
    const user = userById.get(m.userId);
    zeroRows.push({
      rank: 0,
      userId: m.userId,
      username: user?.username ?? null,
      totalPoints: 0,
      predictionCount: 0,
      correctScoreCount: 0,
      correctOutcomeCount: 0,
    });
  }

  const combined = [...fromSql, ...zeroRows].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.correctScoreCount !== a.correctScoreCount)
      return b.correctScoreCount - a.correctScoreCount;
    const nameA = a.username ?? "";
    const nameB = b.username ?? "";
    return nameA.localeCompare(nameB);
  });

  let rank = 1;
  const items: RankingItem[] = combined.map((row, index) => {
    const prev = index > 0 ? combined[index - 1] : null;
    if (
      prev &&
      prev.totalPoints === row.totalPoints &&
      prev.correctScoreCount === row.correctScoreCount
    ) {
      // same rank as previous
    } else {
      rank = index + 1;
    }
    return { ...row, rank };
  });

  return {
    status: "success",
    data: items,
    message: "Ranking fetched successfully",
  };
}
