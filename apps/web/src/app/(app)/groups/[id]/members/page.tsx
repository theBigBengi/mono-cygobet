"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Shield, Crown, User } from "lucide-react";

type Member = {
  userId: number;
  username: string | null;
  name?: string | null;
  image?: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: string;
};

type MembersResponse = {
  status: string;
  data: Member[];
  message: string;
};

function useGroupMembers(groupId: number) {
  return useQuery({
    queryKey: ["groups", groupId, "members"],
    queryFn: () =>
      apiClient.fetch<MembersResponse>(`/api/groups/${groupId}/members`),
    select: (data) => data.data,
  });
}

const roleConfig = {
  owner: { label: "Owner", icon: Crown, color: "text-yellow-600" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-600" },
  member: { label: "Member", icon: User, color: "text-muted-foreground" },
};

export default function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);
  const { data: members, isLoading } = useGroupMembers(groupId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-medium">No members</h3>
      </div>
    );
  }

  // Sort: owner first, then admin, then member
  const sortOrder = { owner: 0, admin: 1, member: 2 };
  const sorted = [...members].sort(
    (a, b) => sortOrder[a.role] - sortOrder[b.role],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {sorted.map((member) => (
          <MemberRow key={member.userId} member={member} />
        ))}
      </CardContent>
    </Card>
  );
}

function MemberRow({ member }: { member: Member }) {
  const config = roleConfig[member.role];
  const RoleIcon = config.icon;
  const initial =
    member.username?.[0]?.toUpperCase() ?? String(member.userId)[0] ?? "U";
  const joinDate = new Date(member.joinedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-sm">{initial}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-sm font-medium">
          {member.username ?? `User ${member.userId}`}
        </p>
        <p className="text-xs text-muted-foreground">Joined {joinDate}</p>
      </div>
      <Badge variant="outline" className="gap-1">
        <RoleIcon className={`h-3 w-3 ${config.color}`} />
        <span className="text-xs">{config.label}</span>
      </Badge>
    </div>
  );
}
