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
  const accessTokenRef = useRef(accessToken);
  const [isConnected, setIsConnected] = useState(false);

  accessTokenRef.current = accessToken;

  // Create/destroy socket based on auth status
  useEffect(() => {
    if (status !== "authenticated") {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Socket already exists — kept alive across token refreshes
    if (socketRef.current) return;

    const token = accessTokenRef.current;
    if (!token) return;

    const baseUrl = getApiBaseUrl();

    const socket: TypedSocket = io(baseUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Keep socket auth token in sync so reconnects use the latest token
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !accessToken) return;

    socket.auth = { token: accessToken };

    // If socket gave up reconnecting (e.g. all attempts failed with old token),
    // kick it off again now that we have a fresh token
    if (!socket.connected && !socket.active) {
      socket.connect();
    }
  }, [accessToken]);

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
