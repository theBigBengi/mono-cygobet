import { apiGet } from "@/lib/adminApi";
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

export const analyticsService = {
  async getOverview(): Promise<AdminAnalyticsOverviewResponse> {
    return apiGet<AdminAnalyticsOverviewResponse>("/admin/analytics/overview");
  },

  async getActiveUsers(days = 30): Promise<AdminAnalyticsActiveUsersResponse> {
    return apiGet<AdminAnalyticsActiveUsersResponse>(
      `/admin/analytics/active-users?days=${days}`
    );
  },

  async getTopFeatures(days = 30): Promise<AdminAnalyticsTopFeaturesResponse> {
    return apiGet<AdminAnalyticsTopFeaturesResponse>(
      `/admin/analytics/top-features?days=${days}`
    );
  },

  async getTopScreens(days = 30): Promise<AdminAnalyticsTopScreensResponse> {
    return apiGet<AdminAnalyticsTopScreensResponse>(
      `/admin/analytics/top-screens?days=${days}`
    );
  },

  async getHourlyUsage(
    days = 30
  ): Promise<AdminAnalyticsHourlyUsageResponse> {
    return apiGet<AdminAnalyticsHourlyUsageResponse>(
      `/admin/analytics/hourly-usage?days=${days}`
    );
  },

  async getGrowth(days = 30): Promise<AdminAnalyticsGrowthResponse> {
    return apiGet<AdminAnalyticsGrowthResponse>(
      `/admin/analytics/growth?days=${days}`
    );
  },

  async getTopUsers(days = 30): Promise<AdminAnalyticsTopUsersResponse> {
    return apiGet<AdminAnalyticsTopUsersResponse>(
      `/admin/analytics/top-users?days=${days}`
    );
  },

  async getPopularContent(
    days = 30
  ): Promise<AdminAnalyticsPopularContentResponse> {
    return apiGet<AdminAnalyticsPopularContentResponse>(
      `/admin/analytics/popular-content?days=${days}`
    );
  },

  async getUserJourney(): Promise<AdminAnalyticsUserJourneyResponse> {
    return apiGet<AdminAnalyticsUserJourneyResponse>(
      "/admin/analytics/user-journey"
    );
  },

  async getEventsTimeline(
    days = 14
  ): Promise<AdminAnalyticsEventsTimelineResponse> {
    return apiGet<AdminAnalyticsEventsTimelineResponse>(
      `/admin/analytics/events-timeline?days=${days}`
    );
  },
};
