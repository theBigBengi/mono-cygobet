import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radio,
  Clock,
  AlertTriangle,
  Zap,
  Eye,
  RefreshCw,
  TimerOff,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { StatusBadge } from "@/components/table/status-badge";

type StatusCardVariant = "gray" | "green" | "yellow" | "red";

function getStatusCardVariant(label: string, count: number): StatusCardVariant {
  if (label === "Live Now") {
    return count === 0 ? "gray" : "green";
  }
  if (
    label === "Pending Settlement" ||
    label === "Failed Jobs (24h)" ||
    label === "Stuck Fixtures" ||
    label === "Overdue NS"
  ) {
    return count === 0 ? "green" : "red";
  }
  return "green";
}

function StatusCard({
  label,
  count,
  href,
  icon: Icon,
}: {
  label: string;
  count: number;
  href: string;
  icon: React.ElementType;
}) {
  const variant = getStatusCardVariant(label, count);
  const variantStyles: Record<StatusCardVariant, string> = {
    gray: "border-l-gray-400",
    green: "border-l-green-500",
    yellow: "border-l-yellow-500",
    red: "border-l-red-500",
  };

  return (
    <Link to={href}>
      <Card
        className={`cursor-pointer transition-colors hover:bg-muted/50 border-l-4 ${variantStyles[variant]}`}
      >
        <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6 px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                {label}
              </p>
              <p className="text-xl sm:text-2xl font-bold">{count}</p>
            </div>
            <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useDashboard();

  if (isError) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
        <div className="text-destructive">
          Failed to load dashboard: {error?.message ?? "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-4">
      <div className="flex-shrink-0 mb-2 flex items-center justify-between gap-2 sm:gap-4">
        <h1 className="text-base sm:text-lg font-semibold truncate">
          Operational Console
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching || isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Row 1 – Status Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : (
            <>
              <StatusCard
                label="Live Now"
                count={data?.liveCount ?? 0}
                href="/fixtures?state=INPLAY_1ST_HALF,INPLAY_2ND_HALF,INPLAY_ET,INPLAY_PENALTIES,HT,BREAK,EXTRA_TIME_BREAK,PEN_BREAK"
                icon={Radio}
              />
              <StatusCard
                label="Pending Settlement"
                count={data?.pendingSettlement ?? 0}
                href="/fixtures?state=FT,AET,FT_PEN"
                icon={Clock}
              />
              <StatusCard
                label="Failed Jobs (24h)"
                count={data?.failedJobs24h ?? 0}
                href="/jobs?status=failed"
                icon={AlertTriangle}
              />
              <StatusCard
                label="Stuck Fixtures"
                count={data?.stuckFixtures ?? 0}
                href="/fixtures?state=INPLAY_1ST_HALF,INPLAY_2ND_HALF,INPLAY_ET,INPLAY_PENALTIES,HT,BREAK,EXTRA_TIME_BREAK,PEN_BREAK"
                icon={Zap}
              />
              <StatusCard
                label="Overdue NS"
                count={data?.overdueNsCount ?? 0}
                href="/fixtures?state=NS"
                icon={TimerOff}
              />
            </>
          )}
        </div>

        {/* Row 2 – Recent Job Failures */}
        <Card>
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">Recent Job Failures</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Last 10 failed job runs in the past 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !data?.recentFailedJobs?.length ? (
              <p className="text-sm text-muted-foreground py-4">
                No recent failures
              </p>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead className="hidden sm:table-cell">Error</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead className="w-[60px] sm:w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentFailedJobs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate">
                          {run.jobKey}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell max-w-[320px]">
                          <span
                            className="block truncate"
                            title={run.errorMessage ?? undefined}
                          >
                            {run.errorMessage ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                          {formatDistanceToNow(new Date(run.startedAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/jobs?runId=${run.id}`}>
                              <Eye className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 3 – Fixtures Needing Attention */}
        <Card>
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">Fixtures Needing Attention</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Stuck LIVE, unsettled, or overdue NS
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !data?.fixturesNeedingAttention?.length ? (
              <p className="text-sm text-muted-foreground py-4">
                No fixtures need attention
              </p>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fixture</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="hidden sm:table-cell">Since</TableHead>
                      <TableHead className="hidden sm:table-cell">Issue</TableHead>
                      <TableHead className="w-[60px] sm:w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.fixturesNeedingAttention.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium max-w-[120px] sm:max-w-[200px] truncate text-xs sm:text-sm">
                          {f.name}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={f.state} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {formatDistanceToNow(new Date(f.updatedAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{f.issue}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/fixtures/${f.id}`}>
                              <Eye className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
