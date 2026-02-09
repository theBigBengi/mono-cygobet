import { prisma } from "@repo/db";
import type {
  AdminAnalyticsOverviewResponse,
  AdminAnalyticsActiveUsersResponse,
  AdminAnalyticsTopFeaturesResponse,
  AdminAnalyticsTopScreensResponse,
  AdminAnalyticsHourlyUsageResponse,
  AdminAnalyticsGrowthResponse,
  AdminAnalyticsTopUsersResponse,
  AdminAnalyticsPopularContentResponse,
  AdminAnalyticsUserJourneyResponse,
  AdminAnalyticsEventsTimelineResponse,
} from "@repo/types";

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAnalyticsOverview(): Promise<AdminAnalyticsOverviewResponse> {
  const todayStart = startOfDay(new Date());
  const weekAgo = daysAgo(7);
  const monthAgo = daysAgo(30);

  const [
    dauResult,
    wauResult,
    mauResult,
    eventsToday,
    predictionsToday,
    groupsCreatedToday,
    newUsersToday,
  ] = await Promise.all([
    // DAU - distinct users with events today
    prisma.analyticsEvents.findMany({
      where: { createdAt: { gte: todayStart }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    // WAU
    prisma.analyticsEvents.findMany({
      where: { createdAt: { gte: weekAgo }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    // MAU
    prisma.analyticsEvents.findMany({
      where: { createdAt: { gte: monthAgo }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    // Events today
    prisma.analyticsEvents.count({
      where: { createdAt: { gte: todayStart } },
    }),
    // Predictions today (from actual predictions table)
    prisma.groupPredictions.count({
      where: { placedAt: { gte: todayStart } },
    }),
    // Groups created today
    prisma.groups.count({
      where: { createdAt: { gte: todayStart } },
    }),
    // New users today
    prisma.users.count({
      where: { createdAt: { gte: todayStart } },
    }),
  ]);

  return {
    dau: dauResult.length,
    wau: wauResult.length,
    mau: mauResult.length,
    eventsToday,
    predictionsToday,
    groupsCreatedToday,
    newUsersToday,
  };
}

export async function getActiveUsersOverTime(
  days: number = 30
): Promise<AdminAnalyticsActiveUsersResponse> {
  const since = daysAgo(days);

  // Use raw query for date-based grouping
  const rows = await prisma.$queryRaw<
    Array<{ date: string; count: bigint }>
  >`
    SELECT
      DATE(created_at AT TIME ZONE 'UTC') as date,
      COUNT(DISTINCT user_id) as count
    FROM analytics_events
    WHERE created_at >= ${since}
      AND user_id IS NOT NULL
    GROUP BY DATE(created_at AT TIME ZONE 'UTC')
    ORDER BY date ASC
  `;

  return {
    data: rows.map((r) => ({
      date: String(r.date),
      count: Number(r.count),
    })),
  };
}

export async function getTopFeatures(
  days: number = 30
): Promise<AdminAnalyticsTopFeaturesResponse> {
  const since = daysAgo(days);

  const rows = await prisma.analyticsEvents.groupBy({
    by: ["eventName"],
    where: {
      createdAt: { gte: since },
      eventName: { not: "screen_view" },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  return {
    data: rows.map((r) => ({
      eventName: r.eventName,
      count: r._count.id,
    })),
  };
}

export async function getTopScreens(
  days: number = 30
): Promise<AdminAnalyticsTopScreensResponse> {
  const since = daysAgo(days);

  const rows = await prisma.$queryRaw<
    Array<{ screen_name: string; views: bigint; avg_duration_ms: number | null }>
  >`
    SELECT
      screen_name,
      COUNT(*) as views,
      AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms
    FROM analytics_events
    WHERE created_at >= ${since}
      AND screen_name IS NOT NULL
      AND event_name IN ('screen_view', 'screen_view_end')
    GROUP BY screen_name
    ORDER BY views DESC
    LIMIT 20
  `;

  return {
    data: rows.map((r) => ({
      screenName: r.screen_name,
      views: Number(r.views),
      avgDurationMs: r.avg_duration_ms ? Math.round(r.avg_duration_ms) : null,
    })),
  };
}

export async function getHourlyUsage(
  days: number = 30
): Promise<AdminAnalyticsHourlyUsageResponse> {
  const since = daysAgo(days);

  const rows = await prisma.$queryRaw<
    Array<{ hour: number; count: bigint }>
  >`
    SELECT
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC')::int as hour,
      COUNT(*) as count
    FROM analytics_events
    WHERE created_at >= ${since}
    GROUP BY hour
    ORDER BY hour ASC
  `;

  return {
    data: rows.map((r) => ({
      hour: r.hour,
      count: Number(r.count),
    })),
  };
}

export async function getGrowth(
  days: number = 30
): Promise<AdminAnalyticsGrowthResponse> {
  const since = daysAgo(days);

  const rows = await prisma.$queryRaw<
    Array<{ date: string; new_users: bigint; total_users: bigint }>
  >`
    WITH daily_new AS (
      SELECT
        DATE(created_at AT TIME ZONE 'UTC') as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= ${since}
      GROUP BY DATE(created_at AT TIME ZONE 'UTC')
    )
    SELECT
      d.date,
      d.new_users,
      (SELECT COUNT(*) FROM users WHERE DATE(created_at AT TIME ZONE 'UTC') <= d.date) as total_users
    FROM daily_new d
    ORDER BY d.date ASC
  `;

  return {
    data: rows.map((r) => ({
      date: String(r.date),
      newUsers: Number(r.new_users),
      totalUsers: Number(r.total_users),
    })),
  };
}

export async function getTopUsers(
  days: number = 30
): Promise<AdminAnalyticsTopUsersResponse> {
  const since = daysAgo(days);

  const rows = await prisma.$queryRaw<
    Array<{ user_id: number; username: string | null; email: string; event_count: bigint }>
  >`
    SELECT
      ae.user_id,
      u.username,
      u.email,
      COUNT(*) as event_count
    FROM analytics_events ae
    JOIN users u ON u.id = ae.user_id
    WHERE ae.created_at >= ${since}
      AND ae.user_id IS NOT NULL
    GROUP BY ae.user_id, u.username, u.email
    ORDER BY event_count DESC
    LIMIT 20
  `;

  return {
    data: rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      email: r.email,
      eventCount: Number(r.event_count),
    })),
  };
}

export async function getPopularContent(
  days: number = 30
): Promise<AdminAnalyticsPopularContentResponse> {
  const since = daysAgo(days);

  // Popular leagues from predictions
  const leagueRows = await prisma.$queryRaw<
    Array<{ name: string; count: bigint }>
  >`
    SELECT l.name, COUNT(DISTINCT gp.id) as count
    FROM group_predictions gp
    JOIN group_fixtures gf ON gf.id = gp.group_fixture_id
    JOIN fixtures f ON f.id = gf.fixture_id
    JOIN leagues l ON l.id = f.league_id
    WHERE gp.placed_at >= ${since}
    GROUP BY l.name
    ORDER BY count DESC
    LIMIT 10
  `;

  // Popular teams from predictions
  const teamRows = await prisma.$queryRaw<
    Array<{ name: string; count: bigint }>
  >`
    SELECT t.name, COUNT(*) as count
    FROM (
      SELECT f.home_team_id as team_id
      FROM group_predictions gp
      JOIN group_fixtures gf ON gf.id = gp.group_fixture_id
      JOIN fixtures f ON f.id = gf.fixture_id
      WHERE gp.placed_at >= ${since}
      UNION ALL
      SELECT f.away_team_id as team_id
      FROM group_predictions gp
      JOIN group_fixtures gf ON gf.id = gp.group_fixture_id
      JOIN fixtures f ON f.id = gf.fixture_id
      WHERE gp.placed_at >= ${since}
    ) sub
    JOIN teams t ON t.id = sub.team_id
    GROUP BY t.name
    ORDER BY count DESC
    LIMIT 10
  `;

  return {
    leagues: leagueRows.map((r) => ({ name: r.name, count: Number(r.count) })),
    teams: teamRows.map((r) => ({ name: r.name, count: Number(r.count) })),
  };
}

export async function getUserJourney(): Promise<AdminAnalyticsUserJourneyResponse> {
  // Simple funnel: registered → created/joined group → made prediction
  const totalUsers = await prisma.users.count();

  const usersWithGroups = await prisma.groupMembers.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  const usersWithPredictions = await prisma.groupPredictions.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  const steps = [
    {
      step: "Registered",
      count: totalUsers,
      percentage: 100,
    },
    {
      step: "Joined a Group",
      count: usersWithGroups.length,
      percentage: totalUsers > 0 ? Math.round((usersWithGroups.length / totalUsers) * 100) : 0,
    },
    {
      step: "Made a Prediction",
      count: usersWithPredictions.length,
      percentage: totalUsers > 0 ? Math.round((usersWithPredictions.length / totalUsers) * 100) : 0,
    },
  ];

  return { steps };
}

export async function getEventsTimeline(
  days: number = 14
): Promise<AdminAnalyticsEventsTimelineResponse> {
  const since = daysAgo(days);

  const rows = await prisma.$queryRaw<
    Array<{ date: string; event_name: string; count: bigint }>
  >`
    SELECT
      DATE(created_at AT TIME ZONE 'UTC') as date,
      event_name,
      COUNT(*) as count
    FROM analytics_events
    WHERE created_at >= ${since}
    GROUP BY DATE(created_at AT TIME ZONE 'UTC'), event_name
    ORDER BY date ASC
  `;

  // Group by date
  const dateMap = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const dateStr = String(r.date);
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, {});
    }
    dateMap.get(dateStr)![r.event_name] = Number(r.count);
  }

  return {
    data: Array.from(dateMap.entries()).map(([date, events]) => ({
      date,
      events,
    })),
  };
}
