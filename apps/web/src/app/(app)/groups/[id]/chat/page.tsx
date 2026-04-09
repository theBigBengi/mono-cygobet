"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { io, type Socket } from "socket.io-client";

type ChatMessage = {
  id: number;
  body: string;
  createdAt: string;
  type: "user_message" | "system_event";
  senderId: number | null;
  sender: {
    id: number;
    username: string | null;
    image: string | null;
  } | null;
};

type MessagesResponse = {
  data: ChatMessage[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function useMessages(groupId: number) {
  return useInfiniteQuery({
    queryKey: ["groups", groupId, "messages"],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: "50" };
      if (pageParam) params.before = String(pageParam);
      const qs = new URLSearchParams(params).toString();
      return apiClient.fetch<MessagesResponse>(
        `/api/groups/${groupId}/messages?${qs}`,
      );
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length < 50) return undefined;
      return lastPage.data[lastPage.data.length - 1]?.id;
    },
  });
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMessages(groupId);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Connect to socket for real-time messages
  useEffect(() => {
    const token = apiClient.getAccessToken();
    if (!token) return;

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("joinGroup", groupId);
    });

    socket.on("message:new", (message: ChatMessage) => {
      queryClient.setQueryData(
        ["groups", groupId, "messages"],
        (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            pages: [
              { data: [message, ...old.pages[0]!.data] },
              ...old.pages.slice(1),
            ],
          };
        },
      );
    });

    socketRef.current = socket;

    return () => {
      socket.emit("leaveGroup", groupId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [groupId, queryClient, data]);

  // Auto-scroll to bottom on new messages
  const firstPageLength = data?.pages?.[0]?.data?.length;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [firstPageLength]);

  // Load more on scroll to top
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await apiClient.fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        body: { body: trimmed },
      });
      setText("");
      // Refetch to show the new message
      queryClient.invalidateQueries({ queryKey: ["groups", groupId, "messages"] });
    } finally {
      setSending(false);
    }
  }

  const allMessages = data?.pages.flatMap((p) => p.data).reverse() ?? [];

  return (
    <div className="flex h-[calc(100vh-16rem)] flex-col rounded-lg border">
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {isFetchingNextPage && (
          <div className="mb-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-48 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {allMessages.map((msg, i) => {
              if (msg.type === "system_event" || !msg.sender) {
                return (
                  <div
                    key={msg.id}
                    className="text-center text-xs text-muted-foreground"
                  >
                    {msg.body}
                  </div>
                );
              }

              const isMe = msg.sender.id === user?.id;
              const showAvatar =
                i === 0 || allMessages[i - 1]?.sender?.id !== msg.sender.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  {showAvatar ? (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">
                        {msg.sender.username?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  <div
                    className={`max-w-[70%] ${isMe ? "items-end" : "items-start"}`}
                  >
                    {showAvatar && !isMe && (
                      <p className="mb-0.5 text-xs font-medium text-muted-foreground">
                        {msg.sender.username ?? "Unknown"}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.body}
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t p-3"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
