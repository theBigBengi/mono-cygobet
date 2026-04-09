"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Target,
  Trophy,
  Users,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "", label: "Lobby", icon: LayoutGrid },
  { key: "/predictions", label: "Predictions", icon: Target },
  { key: "/ranking", label: "Ranking", icon: Trophy },
  { key: "/members", label: "Members", icon: Users },
  { key: "/chat", label: "Chat", icon: MessageCircle },
];

export function GroupNav({ groupId }: { groupId: number }) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b pb-px">
      {tabs.map((tab) => {
        const href = `${base}${tab.key}`;
        const isActive =
          tab.key === ""
            ? pathname === base
            : pathname.startsWith(href);

        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
