"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupNav } from "@/components/group-nav";

type GroupDetail = {
  id: number;
  name: string;
  description: string | null;
  privacy: "private" | "public";
  status: "draft" | "active" | "ended";
  memberCount: number;
};

function useGroupDetail(id: number) {
  return useQuery({
    queryKey: ["groups", id],
    queryFn: () =>
      apiClient.fetch<{ status: string; data: GroupDetail }>(
        `/api/groups/${id}`,
      ),
    select: (res) => res.data,
  });
}

export default function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);
  const { data: group, isLoading } = useGroupDetail(groupId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/groups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        {isLoading ? (
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : group ? (
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{group.name}</h1>
              <Badge variant="secondary" className="text-xs">
                {group.privacy}
              </Badge>
            </div>
            {group.description && (
              <p className="text-sm text-muted-foreground">
                {group.description}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">Group not found</p>
        )}
      </div>

      {/* Tab navigation */}
      <GroupNav groupId={groupId} />

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
