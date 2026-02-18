import * as React from "react";
import { ChevronRight, Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAlerts } from "@/hooks/use-dashboard";

const data = {
  navMain: [
    {
      title: "Dashboard",
      items: [
        { title: "Home", url: "/" },
        { title: "Analytics", url: "/analytics" },
      ],
    },
    {
      title: "Operations",
      items: [
        { title: "Fixtures", url: "/fixtures" },
        { title: "Teams", url: "/teams" },
        { title: "Jobs", url: "/jobs" },
      ],
    },
    {
      title: "Tools",
      items: [
        { title: "Sync Center", url: "/sync-center" },
        { title: "Sandbox", url: "/sandbox" },
      ],
    },
    {
      title: "Admin",
      items: [
        { title: "Users", url: "/users" },
        { title: "Settings", url: "/settings" },
      ],
    },
  ],
};

// Map nav item titles to alert categories for badge display
function getAlertBadge(
  title: string,
  alertCounts: Record<string, number>
): number {
  switch (title) {
    case "Jobs":
      return alertCounts["job_failure"] ?? 0;
    case "Fixtures":
      return (
        (alertCounts["fixture_stuck"] ?? 0) +
        (alertCounts["fixture_unsettled"] ?? 0) +
        (alertCounts["data_quality"] ?? 0) +
        (alertCounts["overdue_ns"] ?? 0)
      );
    default:
      return 0;
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { data: alertsData } = useAlerts();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Count alerts by category
  const alertCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const alert of alertsData?.data ?? []) {
      counts[alert.category] = (counts[alert.category] ?? 0) + 1;
    }
    return counts;
  }, [alertsData?.data]);

  const totalAlerts = alertsData?.data?.length ?? 0;

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-2">
          <h2 className="text-lg font-semibold">Admin</h2>
          {totalAlerts > 0 && (
            <Link
              to="/"
              className="relative p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
              onClick={handleLinkClick}
              title={`${totalAlerts} active alert${totalAlerts !== 1 ? "s" : ""}`}
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {totalAlerts}
              </span>
            </Link>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {data.navMain.map((item) => (
          <Collapsible
            key={item.title}
            title={item.title}
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel
                asChild
                className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <CollapsibleTrigger>
                  {item.title}{" "}
                  <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {item.items.map((subItem) => {
                      const isActive =
                        location.pathname === subItem.url ||
                        (subItem.url !== "/" &&
                          location.pathname.startsWith(subItem.url));
                      const badge = getAlertBadge(subItem.title, alertCounts);
                      return (
                        <SidebarMenuItem key={subItem.title}>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link
                              to={subItem.url}
                              onClick={handleLinkClick}
                              className="flex items-center justify-between"
                            >
                              <span>{subItem.title}</span>
                              {badge > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                                  {badge}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
