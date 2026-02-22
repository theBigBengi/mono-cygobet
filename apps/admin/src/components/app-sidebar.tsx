import * as React from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/auth";

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
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAlerts } from "@/hooks/use-dashboard";

const data = {
  navMain: [
    {
      title: "Content",
      items: [
        { title: "Fixtures", url: "/fixtures" },
        { title: "Teams", url: "/teams" },
      ],
    },
    {
      title: "Operations",
      items: [
        { title: "Jobs", url: "/jobs" },
        { title: "Sync Center", url: "/sync-center" },
      ],
    },
    {
      title: "System",
      items: [
        { title: "Analytics", url: "/analytics" },
        { title: "Users", url: "/users" },
        { title: "Settings", url: "/settings" },
        { title: "Sandbox", url: "/sandbox" },
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
  const { me, logout } = useAdminAuth();
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

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="px-2 py-2">
          <h2 className="text-lg font-semibold">Admin</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {/* Dashboard — standalone at top */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/"}>
                  <Link to="/" onClick={handleLinkClick}>
                    Dashboard
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => void logout()}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
              <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">
                {me?.name ?? me?.email ?? ""}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
