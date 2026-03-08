import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { io, type Socket } from "socket.io-client";
import { getApiBaseUrl } from "../env";
import { useAuth } from "../auth/useAuth";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "./socket.types";

export type TypedSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

interface SocketContextValue {
  socket: TypedSocket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { status, getAccessToken } = useAuth();
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    // Only connect when authenticated and we have a token
    if (status !== "authenticated" || !token) {
      // Disconnect if currently connected
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Disconnect old socket if exists so we reconnect with new token
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const baseUrl = getApiBaseUrl();

    const socket: TypedSocket = io(baseUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      if (__DEV__) {
        console.warn("[Socket] Connection error:", err.message);
      }
      setIsConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [status, getAccessToken]);

  // Reconnect on app resume if disconnected
  useEffect(() => {
    const handleAppState = (next: AppStateStatus) => {
      if (
        next === "active" &&
        socketRef.current &&
        !socketRef.current.connected
      ) {
        socketRef.current.connect();
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, []);

  const value = useMemo<SocketContextValue>(
    () => ({ socket: socketRef.current, isConnected }),
    [isConnected, socketRef.current],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
