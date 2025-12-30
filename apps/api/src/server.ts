import Fastify from "fastify";

// import qs from "qs";
import app from "./app";

// Create Fastify instance
const fastify = Fastify({
  // logger: true,
  ajv: { customOptions: { coerceTypes: true, allowUnionTypes: true } },
  // querystringParser: (str) => qs.parse(str, { comma: true, allowDots: true }),
});

// Initialize logger
const logger = fastify.log;

// Register error handlers first
process.on("uncaughtException", (e) => {
  console.error("uncaughtException", e);
  process.exit(1);
});

process.on("unhandledRejection", (e) => {
  console.error("unhandledRejection", e);
  process.exit(1);
});

// Register your application as a normal plugin.
fastify.register(app);

// Handle graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`\n🛑 Received ${signal}. Shutting down server...`);
  try {
    await fastify.close();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Start listening
const start = async () => {
  try {
    console.log("Starting server...");
    await fastify.ready();
    console.log("Fastify ready!");
    console.log(fastify.printPlugins());

    const port = parseInt(process.env.PORT || "4000", 10);
    console.log(`Attempting to listen on port ${port}...`);
    await fastify.listen({
      port,
      host: "0.0.0.0", // Bind to all interfaces for cloud deployment
    });

    logger.info(`🚀 Server listening on port ${port}`);
    console.log(`🚀 Server listening on port ${port}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    if (err instanceof Error) {
      console.error("Error stack:", err.stack);
    }
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
};

start();
