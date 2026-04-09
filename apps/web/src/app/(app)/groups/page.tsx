"use client";

import { LayoutGrid } from "lucide-react";
import { useGroups } from "@/hooks/use-groups";
import { GroupCard, GroupCardSkeleton } from "@/components/group-card";

export default function GroupsPage() {
  const { data: groups, isLoading, error } = useGroups();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Groups</h1>
          <p className="text-sm text-muted-foreground">
            Your prediction groups
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <GroupCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load groups. Please try again.
          </p>
        </div>
      )}

      {groups && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <LayoutGrid className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">No groups yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Join or create a group to start predicting
          </p>
        </div>
      )}

      {groups && groups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
