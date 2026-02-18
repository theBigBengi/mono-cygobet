/**
 * Admin Socket.IO hook
 * --------------------
 * Connects to the server's default Socket.IO namespace and joins the "admin" room.
 * Listens for alert:new and alert:resolved events to keep the dashboard updated.
 *
 * Uses cookie-based auth (credentials: include) matching the admin API pattern.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined) ??
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "";

export function useAdminSocket() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to admin namespace
    const socket = io(`${SOCKET_URL}/admin`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Join admin room for broadcast events
      socket.emit("admin:join");
    });

    socket.on("alert:new", () => {
      // Invalidate alert and dashboard queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    socket.on("alert:resolved", () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });

    socket.on("connect_error", () => {
      // Silently handle — admin socket is optional enhancement
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  return socketRef;
}
