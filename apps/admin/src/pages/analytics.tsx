import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Zap, TrendingUp, MousePointerClick } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  useAnalyticsOverview,
  useActiveUsers,
  useTopFeatures,
  useTopScreens,
  useHourlyUsage,
  useGrowth,
  useTopUsers,
  usePopularContent,
  useUserJourney,
} from "@/hooks/use-analytics";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
];

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remainSec = sec % 60;
  return `${min}m ${remainSec}s`;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6 px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-12 sm:w-16 mt-1" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold">{value}</p>
            )}
          </div>
          <Icon className="h-5 w-5 sm:h-8 sm:w-8 text-muted-foreground/50" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const overview = useAnalyticsOverview();
  const activeUsers = useActiveUsers(30);
  const topFeatures = useTopFeatures(30);
  const topScreens = useTopScreens(30);
  const hourlyUsage = useHourlyUsage(30);
  const growth = useGrowth(30);
  const topUsers = useTopUsers(30);
  const popularContent = usePopularContent(30);
  const userJourney = useUserJourney();

  const isFetching =
    overview.isFetching ||
    activeUsers.isFetching ||
    topFeatures.isFetching;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-4">
      <div className="flex-shrink-0 mb-2 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Analytics</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <KpiCard
            label="DAU"
            value={overview.data?.dau ?? 0}
            icon={Users}
            isLoading={overview.isLoading}
          />
          <KpiCard
            label="WAU"
            value={overview.data?.wau ?? 0}
            icon={Users}
            isLoading={overview.isLoading}
          />
          <KpiCard
            label="MAU"
            value={overview.data?.mau ?? 0}
            icon={Users}
            isLoading={overview.isLoading}
          />
          <KpiCard
            label="Events Today"
            value={overview.data?.eventsToday ?? 0}
            icon={Zap}
            isLoading={overview.isLoading}
          />
          <KpiCard
            label="Predictions Today"
            value={overview.data?.predictionsToday ?? 0}
            icon={MousePointerClick}
            isLoading={overview.isLoading}
          />
          <KpiCard
            label="Groups Created"
            value={overview.data?.groupsCreatedToday ?? 0}
            icon={Users}
            isLoading={overview.isLoading}
          />
          <KpiCard
            label="New Users"
            value={overview.data?.newUsersToday ?? 0}
            icon={TrendingUp}
            isLoading={overview.isLoading}
          />
        </div>

        {/* Row 2: Active Users + Growth */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Active Users Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Active Users (30 days)</CardTitle>
              <CardDescription>Daily active users</CardDescription>
            </CardHeader>
            <CardContent>
              {activeUsers.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={activeUsers.data?.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      labelFormatter={(d) => new Date(d).toLocaleDateString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* User Growth */}
          <Card>
            <CardHeader>
              <CardTitle>User Growth (30 days)</CardTitle>
              <CardDescription>New users per day + cumulative total</CardDescription>
            </CardHeader>
            <CardContent>
              {growth.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={growth.data?.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      labelFormatter={(d) => new Date(d).toLocaleDateString()}
                    />
                    <Bar dataKey="newUsers" fill="#10b981" name="New Users" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Top Features + Top Screens */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Features */}
          <Card>
            <CardHeader>
              <CardTitle>Top Features</CardTitle>
              <CardDescription>Most used features (30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {topFeatures.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={topFeatures.data?.data?.slice(0, 10) ?? []}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="eventName"
                      width={150}
                      fontSize={12}
                      tickFormatter={(v) => v.replace(/_/g, " ")}
                    />
                    <Tooltip />
                    <Bar dataKey="count" name="Events">
                      {(topFeatures.data?.data?.slice(0, 10) ?? []).map(
                        (_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        )
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Screens */}
          <Card>
            <CardHeader>
              <CardTitle>Top Screens</CardTitle>
              <CardDescription>
                Most viewed screens with avg. time spent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topScreens.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="overflow-x-auto"><Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Screen</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Avg. Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(topScreens.data?.data ?? []).map((s) => (
                      <TableRow key={s.screenName}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {s.screenName}
                        </TableCell>
                        <TableCell className="text-right">{s.views}</TableCell>
                        <TableCell className="text-right">
                          {formatDuration(s.avgDurationMs)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Usage by Hour + User Journey */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Usage by Hour */}
          <Card>
            <CardHeader>
              <CardTitle>Usage by Hour</CardTitle>
              <CardDescription>When are users most active (UTC)</CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyUsage.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={hourlyUsage.data?.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(h) => `${h}:00`}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      labelFormatter={(h) => `${h}:00 - ${Number(h) + 1}:00`}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" name="Events" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* User Journey Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>User Journey</CardTitle>
              <CardDescription>
                Conversion funnel: Registration to Prediction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userJourney.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-4">
                  {(userJourney.data?.steps ?? []).map((step, i) => (
                    <div key={step.step}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{step.step}</span>
                        <span className="text-muted-foreground">
                          {step.count} ({step.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${step.percentage}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 5: Top Users + Popular Content */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Users */}
          <Card>
            <CardHeader>
              <CardTitle>Top Users</CardTitle>
              <CardDescription>Most active users (30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {topUsers.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Events</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(topUsers.data?.data ?? []).map((u) => (
                      <TableRow key={u.userId}>
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {u.username ?? "No username"}
                            </span>
                            <span className="text-muted-foreground text-xs ml-2">
                              {u.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {u.eventCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Popular Content */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Content</CardTitle>
              <CardDescription>
                Most predicted leagues and teams (30 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {popularContent.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Leagues</h4>
                    {(popularContent.data?.leagues ?? []).map((l, i) => (
                      <div
                        key={l.name}
                        className="flex justify-between text-sm py-1"
                      >
                        <span className="truncate mr-2">
                          {i + 1}. {l.name}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {l.count}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Teams</h4>
                    {(popularContent.data?.teams ?? []).map((t, i) => (
                      <div
                        key={t.name}
                        className="flex justify-between text-sm py-1"
                      >
                        <span className="truncate mr-2">
                          {i + 1}. {t.name}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {t.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
