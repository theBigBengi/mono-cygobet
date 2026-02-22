import "@repo/env";
import Fastify from "fastify";

// import qs from "qs";
import app from "./app";
import { logger, getLogger } from "./logger";
import { disconnectRedis } from "@repo/redis";

// Create Fastify instance
const fastify = Fastify({
  loggerInstance: logger,
  pluginTimeout: 30_000, // 30s; default 10s too low when routes autoload ~7s + plugins ~2s (userAuthRoutes last, heaviest)
  ajv: {
    customOptions: {
      coerceTypes: true,
      allowUnionTypes: true,
      removeAdditional: false, // Reject requests with additional properties (enforces additionalProperties: false)
    },
  },
  // querystringParser: (str) => qs.parse(str, { comma: true, allowDots: true }),
});

// Initialize logger for server-specific logging
const serverLogger = getLogger("Server");

// Register error handlers first
process.on("uncaughtException", (e) => {
  serverLogger.fatal({ err: e }, "uncaughtException");
  process.exit(1);
});

process.on("unhandledRejection", (e) => {
  serverLogger.fatal({ err: e }, "unhandledRejection");
  process.exit(1);
});

// Register your application as a normal plugin.
fastify.register(app);

// Handle graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  serverLogger.info({ signal }, "Received signal, shutting down server");
  try {
    await fastify.close();
    await disconnectRedis();
    process.exit(0);
  } catch (err) {
    serverLogger.error({ err }, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Start listening
const start = async () => {
  try {
    serverLogger.info("Starting server");
    await fastify.ready();
    serverLogger.debug({ plugins: fastify.printPlugins() }, "Fastify ready");

    const port = parseInt(process.env.PORT || "4000", 10);
    await fastify.listen({
      port,
      host: "0.0.0.0", // Bind to all interfaces for cloud deployment
    });

    serverLogger.info({ port }, "Server listening");
  } catch (err) {
    serverLogger.error({ err }, "Failed to start server");
    process.exit(1);
  }
};

start();
