// Admin analytics response types

export interface AdminAnalyticsOverviewResponse {
  dau: number;
  wau: number;
  mau: number;
  eventsToday: number;
  predictionsToday: number;
  groupsCreatedToday: number;
  newUsersToday: number;
}

export interface AdminAnalyticsActiveUsersResponse {
  data: Array<{
    date: string;
    count: number;
  }>;
}

export interface AdminAnalyticsTopFeaturesResponse {
  data: Array<{
    eventName: string;
    count: number;
  }>;
}

export interface AdminAnalyticsTopScreensResponse {
  data: Array<{
    screenName: string;
    views: number;
    avgDurationMs: number | null;
  }>;
}

export interface AdminAnalyticsHourlyUsageResponse {
  data: Array<{
    hour: number;
    count: number;
  }>;
}

export interface AdminAnalyticsGrowthResponse {
  data: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
}

export interface AdminAnalyticsTopUsersResponse {
  data: Array<{
    userId: number;
    username: string | null;
    email: string;
    eventCount: number;
  }>;
}

export interface AdminAnalyticsPopularContentResponse {
  leagues: Array<{
    name: string;
    count: number;
  }>;
  teams: Array<{
    name: string;
    count: number;
  }>;
}

export interface AdminAnalyticsUserJourneyResponse {
  steps: Array<{
    step: string;
    count: number;
    percentage: number;
  }>;
}

export interface AdminAnalyticsEventsTimelineResponse {
  data: Array<{
    date: string;
    events: Record<string, number>;
  }>;
}
