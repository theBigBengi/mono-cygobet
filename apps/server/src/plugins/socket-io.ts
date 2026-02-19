import fp from "fastify-plugin";
import fastifySocketIO from "fastify-socket.io";
import { prisma } from "@repo/db";
import { createRedisClient, isRedisConfigured } from "@repo/redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { verifyAccessToken } from "../auth/user-tokens";
import { assertGroupMember } from "../services/api/groups/permissions";
import { sendMessage, markAsRead } from "../services/api/groups/service/chat";
import { adminSessionDb } from "../auth/admin-session";
import { ADMIN_SESSION_COOKIE_NAME } from "../constants/admin-auth.constants";
import { ADMIN_ROLE } from "../constants/roles.constants";
import { getLogger } from "../logger";

const log = getLogger("SocketIO");

function isValidGroupId(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export default fp(async function socketIOPlugin(fastify) {
  const corsOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const vercelSuffix = (process.env.CORS_VERCEL_SUFFIX ?? "").trim();

  // ── Redis adapter for multi-instance Socket.IO ──
  // When REDIS_URL is set, Socket.IO rooms and broadcasts sync across all server instances.
  // Without it, falls back to the default in-memory adapter (single-instance only).
  let adapter: ReturnType<typeof createAdapter> | undefined;

  if (isRedisConfigured()) {
    try {
      const pubClient = createRedisClient({
        onEvent: (e) => {
          if (e.type === "error")
            log.error({ err: e.error }, "Socket.IO Redis pub error");
        },
      });
      const subClient = pubClient.duplicate();

      subClient.on("error", (err) =>
        log.error({ err }, "Socket.IO Redis sub error")
      );

      adapter = createAdapter(pubClient, subClient);

      // Clean up Redis connections on server close
      fastify.addHook("onClose", async () => {
        await Promise.all([pubClient.quit(), subClient.quit()]);
        log.info("Socket.IO Redis adapter connections closed");
      });

      log.info("Socket.IO Redis adapter enabled (multi-instance ready)");
    } catch (err) {
      log.warn(
        { err },
        "Failed to initialize Redis adapter — falling back to in-memory"
      );
    }
  } else {
    log.info(
      "REDIS_URL not set — Socket.IO using in-memory adapter (single-instance)"
    );
  }

  await fastify.register(fastifySocketIO, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const isDev = process.env.NODE_ENV !== "production";
        if (isDev) return cb(null, true);
        if (corsOrigins.includes(origin)) return cb(null, origin);
        if (
          vercelSuffix &&
          origin.startsWith("https://") &&
          origin.endsWith(".vercel.app") &&
          origin.includes(vercelSuffix)
        ) {
          return cb(null, origin);
        }
        return cb(null, false);
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
    ...(adapter && { adapter }),
  });

  const io = fastify.io;

  // ── Auth middleware (runs once per connection) ──
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));

      const payload = verifyAccessToken(fastify, token);
      const user = await prisma.users.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, name: true, image: true },
      });
      if (!user) return next(new Error("User not found"));

      socket.data.user = user;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  // ── Connection handler ──
  io.on("connection", (socket) => {
    const userId = socket.data.user.id;
    log.info({ userId }, "Socket connected");

    socket.join(`user:${userId}`);

    socket.on("group:join", async (groupId) => {
      if (!isValidGroupId(groupId)) return;
      try {
        await assertGroupMember(groupId, userId);
        await socket.join(`group:${groupId}`);
      } catch {
        socket.emit("error", {
          event: "group:join",
          message: "Not a member",
        });
      }
    });

    socket.on("group:leave", (groupId) => {
      if (!isValidGroupId(groupId)) return;
      socket.leave(`group:${groupId}`);
    });

    socket.on("message:send", async (data) => {
      try {
        const message = await sendMessage(
          data.groupId,
          userId,
          data.body,
          data.mentions
        );

        io.to(`group:${data.groupId}`).emit("message:new", {
          id: message.id,
          createdAt: message.createdAt.toISOString(),
          groupId: message.groupId,
          senderId: message.senderId,
          type: message.type,
          body: message.body,
          meta: message.meta as Record<string, unknown> | null,
          sender: {
            id: userId,
            username: socket.data.user.username,
            image: socket.data.user.image,
          },
          tempId: data.tempId,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed";
        socket.emit("error", { event: "message:send", message });
      }
    });

    socket.on("typing:start", (groupId) => {
      if (!isValidGroupId(groupId)) return;
      socket.to(`group:${groupId}`).emit("typing:start", {
        userId,
        username: socket.data.user.username,
      });
    });

    socket.on("typing:stop", (groupId) => {
      if (!isValidGroupId(groupId)) return;
      socket.to(`group:${groupId}`).emit("typing:stop", { userId });
    });

    socket.on("messages:read", async (data) => {
      try {
        await markAsRead(data.groupId, userId, data.lastReadMessageId);
      } catch (err) {
        log.warn(
          { userId, groupId: data.groupId, err },
          "messages:read failed"
        );
      }
    });

    socket.on("disconnect", (reason) => {
      log.info({ userId, reason }, "Socket disconnected");
    });
  });

  // ── Admin namespace (cookie-based auth) ──
  const adminNs = io.of("/admin");

  adminNs.use(async (socket, next) => {
    try {
      // Parse cookie from handshake headers
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const cookies = Object.fromEntries(
        cookieHeader.split(";").map((c) => {
          const [key, ...rest] = c.trim().split("=");
          return [key, rest.join("=")];
        })
      );

      const sessionToken = cookies[ADMIN_SESSION_COOKIE_NAME];
      if (!sessionToken) return next(new Error("Admin session required"));

      const resolved = await adminSessionDb.resolve(sessionToken);
      if (!resolved) return next(new Error("Invalid admin session"));
      if (resolved.user.role !== ADMIN_ROLE) return next(new Error("Admin role required"));

      socket.data.adminUser = resolved.user;
      next();
    } catch {
      next(new Error("Admin auth failed"));
    }
  });

  adminNs.on("connection", (socket) => {
    const adminUser = socket.data.adminUser;
    log.info({ adminId: adminUser?.id }, "Admin socket connected");

    // Join admin room for broadcast alert events
    socket.join("admin");

    socket.on("admin:join", () => {
      socket.join("admin");
    });

    socket.on("disconnect", (reason) => {
      log.info({ adminId: adminUser?.id, reason }, "Admin socket disconnected");
    });
  });
});
