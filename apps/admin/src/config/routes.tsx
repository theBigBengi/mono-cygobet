import type { RouteObject } from "react-router-dom";
import { AdminGuard } from "@/auth/AdminGuard";
import CountriesPage from "@/pages/countries";
import LeaguesPage from "@/pages/leagues";
import TeamsPage from "@/pages/teams";
import SeasonsPage from "@/pages/seasons";
import BookmakersPage from "@/pages/bookmakers";
import FixturesPage from "@/pages/fixtures";
import OddsPage from "@/pages/odds";
import SyncCenterPage from "@/pages/sync-center";
import JobsPage from "@/pages/jobs";
import LoginPage from "@/pages/login";
import { AdminLayout } from "@/components/layout";

/**
 * Application route configuration
 */
export const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: (
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    ),
    children: [
      { path: "/", element: <SyncCenterPage /> },
      { path: "/sync-center", element: <SyncCenterPage /> },
      { path: "/countries", element: <CountriesPage /> },
      { path: "/leagues", element: <LeaguesPage /> },
      { path: "/teams", element: <TeamsPage /> },
      { path: "/seasons", element: <SeasonsPage /> },
      { path: "/bookmakers", element: <BookmakersPage /> },
      { path: "/odds", element: <OddsPage /> },
      { path: "/fixtures", element: <FixturesPage /> },
      { path: "/jobs", element: <JobsPage /> },
      {
        path: "*",
        element: (
          <div className="p-6">
            <h1>Page not found</h1>
          </div>
        ),
      },
    ],
  },
];
