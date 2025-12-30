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
// Register your application as a normal plugin.
// const appService = require('./app.js')
fastify.register(app);

fastify.ready().then(() => {
  console.log(fastify.printPlugins());
});

// Start listening.
// @ts-ignore
fastify.listen(
  {
    port: parseInt(process.env.PORT || "4000", 10),
    host: "0.0.0.0", // Bind to all interfaces for cloud deployment
  },
  (err) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  }
);

// Handle graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`\n🛑 Received ${signal}. Shutting down server...`);
  await fastify.close();
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
