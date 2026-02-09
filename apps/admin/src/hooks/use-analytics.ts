import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";

const STALE_TIME = 60_000; // 1 minute

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analyticsService.getOverview(),
    staleTime: STALE_TIME,
  });
}

export function useActiveUsers(days = 30) {
  return useQuery({
    queryKey: ["analytics", "active-users", days],
    queryFn: () => analyticsService.getActiveUsers(days),
    staleTime: STALE_TIME,
  });
}

export function useTopFeatures(days = 30) {
  return useQuery({
    queryKey: ["analytics", "top-features", days],
    queryFn: () => analyticsService.getTopFeatures(days),
    staleTime: STALE_TIME,
  });
}

export function useTopScreens(days = 30) {
  return useQuery({
    queryKey: ["analytics", "top-screens", days],
    queryFn: () => analyticsService.getTopScreens(days),
    staleTime: STALE_TIME,
  });
}

export function useHourlyUsage(days = 30) {
  return useQuery({
    queryKey: ["analytics", "hourly-usage", days],
    queryFn: () => analyticsService.getHourlyUsage(days),
    staleTime: STALE_TIME,
  });
}

export function useGrowth(days = 30) {
  return useQuery({
    queryKey: ["analytics", "growth", days],
    queryFn: () => analyticsService.getGrowth(days),
    staleTime: STALE_TIME,
  });
}

export function useTopUsers(days = 30) {
  return useQuery({
    queryKey: ["analytics", "top-users", days],
    queryFn: () => analyticsService.getTopUsers(days),
    staleTime: STALE_TIME,
  });
}

export function usePopularContent(days = 30) {
  return useQuery({
    queryKey: ["analytics", "popular-content", days],
    queryFn: () => analyticsService.getPopularContent(days),
    staleTime: STALE_TIME,
  });
}

export function useUserJourney() {
  return useQuery({
    queryKey: ["analytics", "user-journey"],
    queryFn: () => analyticsService.getUserJourney(),
    staleTime: STALE_TIME,
  });
}
