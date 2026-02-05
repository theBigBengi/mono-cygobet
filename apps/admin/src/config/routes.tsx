import type { RouteObject } from "react-router-dom";
import { AdminGuard } from "@/auth/AdminGuard";
import DashboardPage from "@/pages/dashboard";
import FixturesPage from "@/pages/fixtures";
import FixtureDetailPage from "@/pages/fixtures/fixture-detail";
import SyncCenterPage from "@/pages/sync-center";
import JobsListPage from "@/pages/jobs/jobs-list";
import JobDetailPage from "@/pages/jobs/job-detail";
import RunDetailPage from "@/pages/jobs/run-detail";
import SandboxPage from "@/pages/sandbox";
import UsersPage from "@/pages/users";
import TeamsPage from "@/pages/teams";
import UserSettingsPage from "@/pages/settings/user";
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
      { path: "/", element: <DashboardPage /> },
      { path: "/sync-center", element: <SyncCenterPage /> },
      { path: "/fixtures", element: <FixturesPage /> },
      { path: "/fixtures/:id", element: <FixtureDetailPage /> },
      { path: "/teams", element: <TeamsPage /> },
      { path: "/jobs", element: <JobsListPage /> },
      { path: "/jobs/:jobKey", element: <JobDetailPage /> },
      { path: "/jobs/:jobKey/runs/:runId", element: <RunDetailPage /> },
      { path: "/sandbox", element: <SandboxPage /> },
      { path: "/users", element: <UsersPage /> },
      { path: "/settings", element: <UserSettingsPage /> },
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
