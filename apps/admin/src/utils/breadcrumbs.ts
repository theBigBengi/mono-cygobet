/**
 * Route label mapping for breadcrumbs and page titles
 */
export const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/sync-center": "Sync Center",
  "/fixtures": "Fixtures",
  "/fixtures/:id": "Fixture Detail",
  "/jobs": "Jobs",
  "/sandbox": "Sandbox",
  "/users": "Users",
  "/analytics": "Analytics",
  "/teams": "Teams",
  "/settings": "Settings",
  "/settings/league-order": "League Order",
  "/settings/team-order": "Team Order",
};

/**
 * Get the display label for a route pathname
 */
export function getRouteLabel(pathname: string): string {
  if (pathname.startsWith("/fixtures/") && pathname !== "/fixtures")
    return "Fixture Detail";
  if (pathname === "/jobs") return "Jobs";
  if (/^\/jobs\/[^/]+\/runs\/\d+$/.test(pathname)) return "Run Detail";
  if (pathname.startsWith("/jobs/") && pathname !== "/jobs")
    return "Job Detail";
  return ROUTE_LABELS[pathname] ?? "Admin";
}
