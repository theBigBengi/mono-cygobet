// groups/service.ts
// API service for groups (create, list, get).

import { FixtureState, prisma } from "@repo/db";
import type {
  ApiGroupItem,
  ApiGroupResponse,
  ApiGroupsResponse,
  ApiCreateGroupBody,
  ApiUpdateGroupBody,
  ApiPublishGroupBody,
  ApiGroupPrivacy,
  ApiGroupFixturesResponse,
  ApiFixturesListResponse,
} from "@repo/types";
import { NotFoundError } from "../../../utils/errors";
import type { GroupFixturesFilter } from "../../../types/groups";
import { applyGroupFixturesFilter } from "./fixtures-filter";

const now = () => Math.floor(Date.now() / 1000);

/**
 * Create a new group.
 * Sets default values: status = "draft", privacy = "private" if not provided.
 * If name is not provided or empty, generates automatic name: "$username Draft #N"
 * Creates groupFixtures from fixtureIds (games), or from upcoming fixtures by league/team (leagues/teams).
 */
export async function createGroup(
  args: ApiCreateGroupBody & { creatorId: number }
): Promise<ApiGroupResponse> {
  const {
    name,
    creatorId,
    privacy = "private",
    fixtureIds = [],
    selectionMode = "games",
    teamIds = [],
    leagueIds = [],
  } = args;

  // Get user to get username for auto-generated name
  const user = await prisma.users.findUnique({
    where: { id: creatorId },
    select: { username: true },
  });

  // Determine group name
  let groupName: string;
  if (name && typeof name === "string" && name.trim()) {
    groupName = name.trim();
  } else {
    const username = user?.username || "User";
    const draftCount = await prisma.groups.count({
      where: { creatorId, status: "draft" },
    });
    groupName = `${username} Draft #${draftCount + 1}`;
  }

  const result = await prisma.$transaction(async (tx) => {
    const group = await tx.groups.create({
      data: {
        name: groupName,
        creatorId,
        privacy: privacy as ApiGroupPrivacy,
        status: "draft",
      },
    });

    await tx.groupMembers.create({
      data: {
        groupId: group.id,
        userId: creatorId,
        role: "owner",
        status: "joined",
      },
    });

    let fixtureIdsToUse: number[] = [];
    const selMode = (selectionMode ?? "games") as "games" | "teams" | "leagues";
    const modeLeagues = selMode === "leagues" ? (leagueIds ?? []) : [];
    const modeTeams = selMode === "teams" ? (teamIds ?? []) : [];

    if (selMode === "games") {
      fixtureIdsToUse = fixtureIds;
      await tx.groupRules.create({
        data: {
          groupId: group.id,
          selectionMode: "games",
          groupTeamsIds: [],
          groupLeaguesIds: [],
        },
      });
    } else if (selMode === "leagues") {
      if (modeLeagues.length > 0) {
        const upcoming = await tx.fixtures.findMany({
          where: {
            state: FixtureState.NS,
            startTs: { gt: now() },
            leagueId: { in: modeLeagues },
          },
          select: { id: true },
          orderBy: { startTs: "asc" },
        });
        fixtureIdsToUse = upcoming.map((f) => f.id);
      }
      await tx.groupRules.create({
        data: {
          groupId: group.id,
          selectionMode: "leagues",
          groupTeamsIds: [],
          groupLeaguesIds: modeLeagues,
        },
      });
    } else {
      // selMode === "teams"
      if (modeTeams.length > 0) {
        const upcoming = await tx.fixtures.findMany({
          where: {
            state: FixtureState.NS,
            startTs: { gt: now() },
            OR: [
              { homeTeamId: { in: modeTeams } },
              { awayTeamId: { in: modeTeams } },
            ],
          },
          select: { id: true },
          orderBy: { startTs: "asc" },
        });
        fixtureIdsToUse = upcoming.map((f) => f.id);
      }
      await tx.groupRules.create({
        data: {
          groupId: group.id,
          selectionMode: "teams",
          groupTeamsIds: modeTeams,
          groupLeaguesIds: [],
        },
      });
    }

    if (fixtureIdsToUse.length > 0) {
      await tx.groupFixtures.createMany({
        data: fixtureIdsToUse.map((fixtureId) => ({
          groupId: group.id,
          fixtureId,
        })),
        skipDuplicates: true,
      });
    }

    return group;
  });

  const data: ApiGroupItem = {
    id: result.id,
    name: result.name,
    privacy: result.privacy as ApiGroupPrivacy,
    status: result.status as "draft" | "active" | "ended",
    creatorId: result.creatorId,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };

  return {
    status: "success",
    data,
    message: "Group created successfully",
  };
}

/**
 * Get all groups created by the user.
 * Sorted by createdAt DESC.
 * Includes memberCount and nextGame for each group.
 */
export async function getMyGroups(
  creatorId: number
): Promise<ApiGroupsResponse> {
  const groups = await prisma.groups.findMany({
    where: {
      creatorId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const now = Math.floor(Date.now() / 1000);

  // Helper function to format fixture data
  const formatFixture = (
    fixtures: any
  ): ApiFixturesListResponse["data"][0] | null => {
    if (!fixtures) return null;

    const country = fixtures.league?.country
      ? {
          id: fixtures.league.country.id,
          name: fixtures.league.country.name,
          imagePath: fixtures.league.country.imagePath,
        }
      : null;

    return {
      id: fixtures.id,
      name: fixtures.name,
      kickoffAt: fixtures.startIso,
      startTs: fixtures.startTs,
      state: String(fixtures.state),
      stage: fixtures.stage ?? null,
      round: fixtures.round ?? null,
      league: fixtures.league
        ? {
            id: fixtures.league.id,
            name: fixtures.league.name,
            imagePath: fixtures.league.imagePath ?? null,
          }
        : undefined,
      homeTeam: fixtures.homeTeam
        ? {
            id: fixtures.homeTeam.id,
            name: fixtures.homeTeam.name,
            imagePath: fixtures.homeTeam.imagePath ?? null,
          }
        : undefined,
      awayTeam: fixtures.awayTeam
        ? {
            id: fixtures.awayTeam.id,
            name: fixtures.awayTeam.name,
            imagePath: fixtures.awayTeam.imagePath ?? null,
          }
        : undefined,
      country,
      odds: undefined,
      prediction: undefined,
    };
  };

  // Fetch data for all groups in parallel
  const data: ApiGroupItem[] = await Promise.all(
    groups.map(async (group) => {
      const isDraft = group.status === "draft";

      if (isDraft) {
        // For draft groups: find the first game (earliest fixture)
        const firstGameRow = await prisma.groupFixtures.findFirst({
          where: {
            groupId: group.id,
          },
          orderBy: {
            fixtures: {
              startTs: "asc",
            },
          },
          select: {
            fixtures: {
              select: {
                id: true,
                name: true,
                startIso: true,
                startTs: true,
                state: true,
                stage: true,
                round: true,
                league: {
                  select: {
                    id: true,
                    name: true,
                    imagePath: true,
                    country: {
                      select: {
                        id: true,
                        name: true,
                        imagePath: true,
                      },
                    },
                  },
                },
                homeTeam: {
                  select: {
                    id: true,
                    name: true,
                    imagePath: true,
                  },
                },
                awayTeam: {
                  select: {
                    id: true,
                    name: true,
                    imagePath: true,
                  },
                },
              } as any,
            },
          },
        });

        const firstGame = formatFixture((firstGameRow as any)?.fixtures);

        return {
          id: group.id,
          name: group.name,
          privacy: group.privacy as ApiGroupPrivacy,
          status: group.status as "draft" | "active" | "ended",
          creatorId: group.creatorId,
          createdAt: group.createdAt.toISOString(),
          updatedAt: group.updatedAt.toISOString(),
          firstGame,
        };
      } else {
        // For active/ended groups: count members and find next game
        const memberCount = await prisma.groupMembers.count({
          where: {
            groupId: group.id,
            status: "joined",
          },
        });

        // Count total fixtures in the group
        const totalFixtures = await prisma.groupFixtures.count({
          where: {
            groupId: group.id,
          },
        });

        // Count predictions made by the user
        const predictionsCount = await prisma.groupPredictions.count({
          where: {
            groupId: group.id,
            userId: creatorId,
          },
        });

        // Check if there are upcoming games without predictions
        const unpredictedUpcomingGames = await prisma.groupFixtures.findFirst({
          where: {
            groupId: group.id,
            fixtures: {
              startTs: {
                gt: now,
              },
            },
            NOT: {
              groupPredictions: {
                some: {
                  userId: creatorId,
                },
              },
            },
          },
        });

        const hasUnpredictedGames = !!unpredictedUpcomingGames;

        // Find next upcoming game
        const nextGameRow = await prisma.groupFixtures.findFirst({
          where: {
            groupId: group.id,
            fixtures: {
              startTs: {
                gt: now,
              },
            },
          },
          orderBy: {
            fixtures: {
              startTs: "asc",
            },
          },
          select: {
            fixtures: {
              select: {
                id: true,
                name: true,
                startIso: true,
                startTs: true,
                state: true,
                stage: true,
                round: true,
                league: {
                  select: {
                    id: true,
                    name: true,
                    imagePath: true,
                    country: {
                      select: {
                        id: true,
                        name: true,
                        imagePath: true,
                      },
                    },
                  },
                },
                homeTeam: {
                  select: {
                    id: true,
                    name: true,
                    imagePath: true,
                  },
                },
                awayTeam: {
                  select: {
                    id: true,
                    name: true,
                    imagePath: true,
                  },
                },
              } as any,
            },
          },
        });

        const nextGame = formatFixture((nextGameRow as any)?.fixtures);

        return {
          id: group.id,
          name: group.name,
          privacy: group.privacy as ApiGroupPrivacy,
          status: group.status as "draft" | "active" | "ended",
          creatorId: group.creatorId,
          createdAt: group.createdAt.toISOString(),
          updatedAt: group.updatedAt.toISOString(),
          memberCount,
          nextGame,
          predictionsCount,
          totalFixtures,
          hasUnpredictedGames,
        };
      }
    })
  );

  return {
    status: "success",
    data,
    message: "Groups fetched successfully",
  };
}

/**
 * Get a group by ID.
 * Verifies that the user is the creator.
 * Returns 404 if group doesn't exist or user is not the creator.
 * Optionally includes fixtures with user predictions when includeFixtures=true.
 * When filters are provided, fixtures are filtered before being attached.
 */
export async function getGroupById(
  id: number,
  creatorId: number,
  includeFixtures?: boolean,
  filters?: GroupFixturesFilter
): Promise<ApiGroupResponse> {
  const group = await prisma.groups.findUnique({
    where: { id },
  });

  if (!group) {
    throw new NotFoundError(`Group with id ${id} not found`);
  }

  if (group.creatorId !== creatorId) {
    throw new NotFoundError(`Group with id ${id} not found`);
  }

  const data: ApiGroupItem = {
    id: group.id,
    name: group.name,
    privacy: group.privacy as ApiGroupPrivacy,
    status: group.status as "draft" | "active" | "ended",
    creatorId: group.creatorId,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };

  // Include fixtures if requested
  if (includeFixtures) {
    const rows = await prisma.groupFixtures.findMany({
      where: { groupId: id },
      orderBy: {
        fixtures: {
          startTs: "asc",
        },
      },
      select: {
        id: true, // groupFixtureId needed for predictions
        fixtures: {
          select: {
            id: true,
            name: true,
            startIso: true,
            startTs: true,
            state: true,
            stage: true,
            round: true,
            league: {
              select: {
                id: true,
                name: true,
                imagePath: true,
                country: {
                  select: {
                    id: true,
                    name: true,
                    imagePath: true,
                  },
                },
              },
            },
            homeTeam: {
              select: {
                id: true,
                name: true,
                imagePath: true,
              },
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                imagePath: true,
              },
            },
          } as any,
        },
        groupPredictions: {
          where: { userId: creatorId },
          select: {
            prediction: true,
            updatedAt: true,
            placedAt: true,
            settledAt: true,
          },
        },
      },
    });

    const fixturesData: ApiFixturesListResponse["data"] = (rows as any[]).map(
      ({ fixtures, groupPredictions }: any) => {
        const country = fixtures.league?.country
          ? {
              id: fixtures.league.country.id,
              name: fixtures.league.country.name,
              imagePath: fixtures.league.country.imagePath,
            }
          : null;

        // Parse prediction if exists
        let prediction: {
          home: number;
          away: number;
          updatedAt: string;
          placedAt: string;
          settled: boolean;
        } | null = null;

        if (groupPredictions.length > 0) {
          const pred = groupPredictions[0];
          if (pred) {
            // Parse prediction string format "home:away" (e.g., "2:1")
            const parts = pred.prediction.split(":");
            if (parts.length === 2) {
              const home = Number(parts[0]);
              const away = Number(parts[1]);
              if (!isNaN(home) && !isNaN(away)) {
                prediction = {
                  home,
                  away,
                  updatedAt: pred.updatedAt.toISOString(),
                  placedAt: pred.placedAt.toISOString(),
                  settled: pred.settledAt != null,
                };
              }
            }
          }
        }

        return {
          id: fixtures.id,
          name: fixtures.name,
          kickoffAt: fixtures.startIso,
          startTs: fixtures.startTs,
          state: String(fixtures.state),
          stage: fixtures.stage ?? null,
          round: fixtures.round ?? null,
          league: fixtures.league
            ? {
                id: fixtures.league.id,
                name: fixtures.league.name,
                imagePath: fixtures.league.imagePath ?? null,
              }
            : undefined,
          homeTeam: fixtures.homeTeam
            ? {
                id: fixtures.homeTeam.id,
                name: fixtures.homeTeam.name,
                imagePath: fixtures.homeTeam.imagePath ?? null,
              }
            : undefined,
          awayTeam: fixtures.awayTeam
            ? {
                id: fixtures.awayTeam.id,
                name: fixtures.awayTeam.name,
                imagePath: fixtures.awayTeam.imagePath ?? null,
              }
            : undefined,
          country,
          odds: undefined,
          prediction,
        };
      }
    );

    data.fixtures =
      filters != null
        ? applyGroupFixturesFilter(fixturesData, filters)
        : fixturesData;
  }

  return {
    status: "success",
    data,
    message: "Group fetched successfully",
  };
}

/**
 * Update a group.
 * Verifies that the user is the creator.
 * Only updates fields that are provided.
 * Returns 404 if group doesn't exist or user is not the creator.
 */
export async function updateGroup(
  id: number,
  args: ApiUpdateGroupBody & { creatorId: number }
): Promise<ApiGroupResponse> {
  const { creatorId, name, privacy, fixtureIds } = args;

  // Verify group exists and user is creator
  const existingGroup = await prisma.groups.findUnique({
    where: { id },
  });

  if (!existingGroup) {
    throw new NotFoundError(`Group with id ${id} not found`);
  }

  if (existingGroup.creatorId !== creatorId) {
    throw new NotFoundError(`Group with id ${id} not found`);
  }

  // Build update data
  const updateData: {
    name?: string;
    privacy?: ApiGroupPrivacy;
  } = {};

  if (name !== undefined) {
    updateData.name = name.trim();
  }

  if (privacy !== undefined) {
    updateData.privacy = privacy as ApiGroupPrivacy;
  }

  // Update the group and groupFixtures in a transaction
  const group = await prisma.$transaction(async (tx) => {
    // Update the group
    const updatedGroup = await tx.groups.update({
      where: { id },
      data: updateData,
    });

    // Update groupFixtures if fixtureIds is provided
    if (fixtureIds !== undefined) {
      // Get current groupFixtures
      const currentGroupFixtures = await tx.groupFixtures.findMany({
        where: { groupId: id },
        select: { fixtureId: true },
      });

      const currentFixtureIds = new Set(
        currentGroupFixtures.map((gf) => gf.fixtureId)
      );
      const newFixtureIds = new Set(fixtureIds);

      // Find fixtures to remove (in current but not in new)
      const fixtureIdsToRemove = Array.from(currentFixtureIds).filter(
        (fixtureId) => !newFixtureIds.has(fixtureId)
      );

      // Find fixtures to add (in new but not in current)
      const fixtureIdsToAdd = fixtureIds.filter(
        (fixtureId) => !currentFixtureIds.has(fixtureId)
      );

      // Remove fixtures that are no longer in the list
      if (fixtureIdsToRemove.length > 0) {
        await tx.groupFixtures.deleteMany({
          where: {
            groupId: id,
            fixtureId: { in: fixtureIdsToRemove },
          },
        });
      }

      // Add new fixtures
      if (fixtureIdsToAdd.length > 0) {
        await tx.groupFixtures.createMany({
          data: fixtureIdsToAdd.map((fixtureId) => ({
            groupId: id,
            fixtureId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updatedGroup;
  });

  const data: ApiGroupItem = {
    id: group.id,
    name: group.name,
    privacy: group.privacy as ApiGroupPrivacy,
    status: group.status as "draft" | "active" | "ended",
    creatorId: group.creatorId,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };

  return {
    status: "success",
    data,
    message: "Group updated successfully",
  };
}

/**
 * Publish a group (change status from "draft" to "active" and update name/privacy).
 * - Verifies that the user is the creator.
 * - Verifies that the group is in "draft" status.
 * - Updates status to "active" and optionally updates name/privacy.
 * - Returns 404 if group doesn't exist or user is not the creator.
 * - Returns error if group is not in "draft" status.
 */
export async function publishGroup(
  id: number,
  args: ApiPublishGroupBody & { creatorId: number }
): Promise<ApiGroupResponse> {
  const { creatorId, name, privacy } = args;

  // Verify group exists and user is creator
  const existingGroup = await prisma.groups.findUnique({
    where: { id },
  });

  if (!existingGroup) {
    throw new NotFoundError(`Group with id ${id} not found`);
  }

  if (existingGroup.creatorId !== creatorId) {
    throw new NotFoundError(`Group with id ${id} not found`);
  }

  // Verify group is in draft status
  if (existingGroup.status !== "draft") {
    throw new NotFoundError(
      `Group with id ${id} cannot be published. Only draft groups can be published.`
    );
  }

  // Build update data
  const updateData: {
    status: "active";
    name?: string;
    privacy?: ApiGroupPrivacy;
  } = {
    status: "active",
  };

  if (name !== undefined) {
    updateData.name = name.trim();
  }

  if (privacy !== undefined) {
    updateData.privacy = privacy as ApiGroupPrivacy;
  }

  // Update the group
  const group = await prisma.groups.update({
    where: { id },
    data: updateData,
  });

  const data: ApiGroupItem = {
    id: group.id,
    name: group.name,
    privacy: group.privacy as ApiGroupPrivacy,
    status: group.status as "draft" | "active" | "ended",
    creatorId: group.creatorId,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };

  return {
    status: "success",
    data,
    message: "Group published successfully",
  };
}

/**
 * Get fixtures attached to a specific group.
 * - Verifies that the user is the creator.
 * - Returns fixtures in chronological order by kickoff time.
 * When filters are provided, fixtures are filtered before being returned.
 */
export async function getGroupFixtures(
  id: number,
  creatorId: number,
  filters?: GroupFixturesFilter
): Promise<ApiGroupFixturesResponse> {
  const group = await prisma.groups.findUnique({
    where: { id },
    select: {
      id: true,
      creatorId: true,
    },
  });

  if (!group || group.creatorId !== creatorId) {
    throw new NotFoundError(`Group with id ${id} not found`);
  }

  const rows = await prisma.groupFixtures.findMany({
    where: { groupId: id },
    orderBy: {
      fixtures: {
        startTs: "asc",
      },
    },
    select: {
      id: true, // groupFixtureId needed for predictions
      fixtures: {
        select: {
          id: true,
          name: true,
          startIso: true,
          startTs: true,
          state: true,
          stage: true,
          round: true,
          league: {
            select: {
              id: true,
              name: true,
              imagePath: true,
              country: {
                select: {
                  id: true,
                  name: true,
                  imagePath: true,
                },
              },
            },
          },
          homeTeam: {
            select: {
              id: true,
              name: true,
              imagePath: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              imagePath: true,
            },
          },
        } as any,
      },
      groupPredictions: {
        where: { userId: creatorId },
        select: {
          prediction: true,
          updatedAt: true,
          placedAt: true,
          settledAt: true,
        },
      },
    },
  });

  const data: ApiFixturesListResponse["data"] = (rows as any[]).map(
    ({ fixtures, groupPredictions }: any) => {
      const country = fixtures.league?.country
        ? {
            id: fixtures.league.country.id,
            name: fixtures.league.country.name,
            imagePath: fixtures.league.country.imagePath,
          }
        : null;

      // Parse prediction if exists
      let prediction: {
        home: number;
        away: number;
        updatedAt: string;
        placedAt: string;
        settled: boolean;
      } | null = null;

      if (groupPredictions.length > 0) {
        const pred = groupPredictions[0];
        if (pred) {
          // Parse prediction string format "home:away" (e.g., "2:1")
          const parts = pred.prediction.split(":");
          if (parts.length === 2) {
            const home = Number(parts[0]);
            const away = Number(parts[1]);
            if (!isNaN(home) && !isNaN(away)) {
              prediction = {
                home,
                away,
                updatedAt: pred.updatedAt.toISOString(),
                placedAt: pred.placedAt.toISOString(),
                settled: pred.settledAt != null,
              };
            }
          }
        }
      }

      return {
        id: fixtures.id,
        name: fixtures.name,
        kickoffAt: fixtures.startIso,
        startTs: fixtures.startTs,
        state: String(fixtures.state),
        stage: fixtures.stage ?? null,
        round: fixtures.round ?? null,
        league: fixtures.league
          ? {
              id: fixtures.league.id,
              name: fixtures.league.name,
              imagePath: fixtures.league.imagePath ?? null,
            }
          : undefined,
        homeTeam: fixtures.homeTeam
          ? {
              id: fixtures.homeTeam.id,
              name: fixtures.homeTeam.name,
              imagePath: fixtures.homeTeam.imagePath ?? null,
            }
          : undefined,
        awayTeam: fixtures.awayTeam
          ? {
              id: fixtures.awayTeam.id,
              name: fixtures.awayTeam.name,
              imagePath: fixtures.awayTeam.imagePath ?? null,
            }
          : undefined,
        country,
        odds: undefined,
        prediction,
      };
    }
  );

  const finalData =
    filters != null ? applyGroupFixturesFilter(data, filters) : data;

  return {
    status: "success",
    data: finalData,
    message: "Group fixtures fetched successfully",
  };
}

/**
 * Save or update a group prediction for a specific fixture.
 * - Verifies that the user is a group member.
 * - Verifies that the fixture belongs to the group.
 * - Upserts the prediction record.
 */
export async function saveGroupPrediction(
  groupId: number,
  fixtureId: number,
  userId: number,
  prediction: { home: number; away: number }
): Promise<{ status: "success"; message: string }> {
  // Verify user is group member
  const groupMember = await prisma.groupMembers.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  });

  if (!groupMember) {
    throw new NotFoundError(
      `User is not a member of group ${groupId} or group does not exist`
    );
  }

  // Verify fixture belongs to group and get groupFixtureId
  const groupFixture = await prisma.groupFixtures.findUnique({
    where: {
      groupId_fixtureId: {
        groupId,
        fixtureId,
      },
    },
  });

  if (!groupFixture) {
    throw new NotFoundError(
      `Fixture ${fixtureId} does not belong to group ${groupId}`
    );
  }

  // Format prediction as string "home:away" (e.g., "2:1")
  const predictionString = `${prediction.home}:${prediction.away}`;

  // Upsert prediction
  await prisma.groupPredictions.upsert({
    where: {
      userId_groupFixtureId: {
        userId,
        groupFixtureId: groupFixture.id,
      },
    },
    update: {
      prediction: predictionString,
      updatedAt: new Date(),
    },
    create: {
      groupId,
      groupFixtureId: groupFixture.id,
      userId,
      prediction: predictionString,
    },
  });

  return {
    status: "success",
    message: "Prediction saved successfully",
  };
}

/**
 * Save or update multiple group predictions in a batch.
 * - Verifies that the user is a group member.
 * - Verifies that all fixtures belong to the group.
 * - Updates all predictions in a single transaction.
 */
export async function saveGroupPredictionsBatch(
  groupId: number,
  userId: number,
  predictions: Array<{ fixtureId: number; home: number; away: number }>
): Promise<{ status: "success"; message: string }> {
  if (predictions.length === 0) {
    return {
      status: "success",
      message: "No predictions to save",
    };
  }

  // Verify user is group member
  const groupMember = await prisma.groupMembers.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId,
      },
    },
  });

  if (!groupMember) {
    throw new NotFoundError(
      `User is not a member of group ${groupId} or group does not exist`
    );
  }

  // Get all fixtures and verify they belong to the group
  const fixtureIds = predictions.map((p) => p.fixtureId);
  const groupFixtures = await prisma.groupFixtures.findMany({
    where: {
      groupId,
      fixtureId: {
        in: fixtureIds,
      },
    },
  });

  if (groupFixtures.length !== fixtureIds.length) {
    throw new NotFoundError(
      `One or more fixtures do not belong to group ${groupId}`
    );
  }

  // Create a map of fixtureId -> groupFixtureId for quick lookup
  const fixtureIdToGroupFixtureId = new Map(
    groupFixtures.map((gf) => [gf.fixtureId, gf.id])
  );

  // Update all predictions in a transaction
  await prisma.$transaction(
    predictions.map((pred) => {
      const groupFixtureId = fixtureIdToGroupFixtureId.get(pred.fixtureId);
      if (!groupFixtureId) {
        throw new NotFoundError(
          `Group fixture not found for fixture ${pred.fixtureId}`
        );
      }

      const predictionString = `${pred.home}:${pred.away}`;

      return prisma.groupPredictions.upsert({
        where: {
          userId_groupFixtureId: {
            userId,
            groupFixtureId,
          },
        },
        update: {
          prediction: predictionString,
          updatedAt: new Date(),
        },
        create: {
          groupId,
          groupFixtureId,
          userId,
          prediction: predictionString,
        },
      });
    })
  );

  return {
    status: "success",
    message: `${predictions.length} prediction(s) saved successfully`,
  };
}
