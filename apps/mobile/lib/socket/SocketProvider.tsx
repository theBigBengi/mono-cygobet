import React, {
  createContext,
  useContext,
  useEffect,
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
  const { status, accessToken } = useAuth();
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect when authenticated and we have a token
    if (status !== "authenticated" || !accessToken) {
      // Disconnect if currently connected
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // If already connected with same token, skip
    if (socketRef.current?.connected) {
      return;
    }

    // Disconnect old socket if exists (e.g. token changed)
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const baseUrl = getApiBaseUrl();

    const socket: TypedSocket = io(baseUrl, {
      auth: { token: accessToken },
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

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [status, accessToken]);

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

  const value: SocketContextValue = {
    socket: socketRef.current,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
