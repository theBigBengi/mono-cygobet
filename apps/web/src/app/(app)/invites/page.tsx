"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Check, X } from "lucide-react";
import { useState } from "react";

type Invite = {
  id: number;
  groupId: number;
  groupName: string;
  invitedBy: string | null;
  createdAt: string;
  status: string;
};

type InvitesResponse = {
  status: string;
  data: Invite[];
};

function useInvites() {
  return useQuery({
    queryKey: ["invites"],
    queryFn: () => apiClient.fetch<InvitesResponse>("/api/invites"),
    select: (data) => data.data,
  });
}

export default function InvitesPage() {
  const { data: invites, isLoading, refetch } = useInvites();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Invitations</h1>
        <p className="text-sm text-muted-foreground">
          Pending group invitations
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {invites && invites.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Mail className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">No invitations</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You don&apos;t have any pending invitations
          </p>
        </div>
      )}

      {invites && invites.length > 0 && (
        <div className="space-y-4">
          {invites.map((invite) => (
            <InviteCard key={invite.id} invite={invite} onAction={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function InviteCard({
  invite,
  onAction,
}: {
  invite: Invite;
  onAction: () => void;
}) {
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  async function respond(action: "accept" | "decline") {
    setLoading(action);
    try {
      await apiClient.fetch(`/api/invites/${invite.id}/respond`, {
        method: "POST",
        body: { action },
      });
      onAction();
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium">{invite.groupName}</p>
          {invite.invitedBy && (
            <p className="text-sm text-muted-foreground">
              Invited by {invite.invitedBy}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => respond("accept")}
            disabled={loading !== null}
          >
            {loading === "accept" ? "..." : <Check className="h-4 w-4" />}
            <span className="ml-1">Accept</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => respond("decline")}
            disabled={loading !== null}
          >
            {loading === "decline" ? "..." : <X className="h-4 w-4" />}
            <span className="ml-1">Decline</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
