/**
 * Route label mapping for breadcrumbs and page titles
 */
export const ROUTE_LABELS: Record<string, string> = {
  "/": "Sync Center",
  "/sync-center": "Sync Center",
  "/countries": "Countries",
  "/leagues": "Leagues",
  "/teams": "Teams",
  "/seasons": "Seasons",
  "/bookmakers": "Bookmakers",
  "/odds": "Odds",
  "/fixtures": "Fixtures",
  "/jobs": "Jobs",
  "/settings": "Settings",
  "/settings/user": "User Settings",
  "/settings/system": "System Settings",
};

/**
 * Get the display label for a route pathname
 */
export function getRouteLabel(pathname: string): string {
  return ROUTE_LABELS[pathname] ?? "Admin";
}

