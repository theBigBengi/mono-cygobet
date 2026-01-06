import { FastifyInstance } from "fastify";

export class Logger {
  private fastify: FastifyInstance;
  private context: string;

  constructor(fastify: FastifyInstance, context: string = "App") {
    this.fastify = fastify;
    this.context = context;
  }

  info(message: string, data?: any): void {
    this.fastify.log.info({ context: this.context, data }, message);
  }

  error(message: string, error?: any): void {
    this.fastify.log.error({ context: this.context, error }, message);
  }

  warn(message: string, data?: any): void {
    this.fastify.log.warn({ context: this.context, data }, message);
  }

  debug(message: string, data?: any): void {
    this.fastify.log.debug({ context: this.context, data }, message);
  }

  // OAuth specific logging
  oauth(message: string, data?: any): void {
    this.fastify.log.info({ context: "OAuth", data }, message);
  }

  // Database specific logging
  db(message: string, data?: any): void {
    this.fastify.log.info({ context: "Database", data }, message);
  }

  // Authentication specific logging
  auth(message: string, data?: any): void {
    this.fastify.log.info({ context: "Auth", data }, message);
  }

  // Session specific logging
  session(message: string, data?: any): void {
    this.fastify.log.info({ context: "Session", data }, message);
  }

  // User specific logging
  user(message: string, data?: any): void {
    this.fastify.log.info({ context: "User", data }, message);
  }
}

// Create logger instances for different contexts
export const createLogger = (fastify: FastifyInstance) => ({
  oauth: new Logger(fastify, "OAuth"),
  db: new Logger(fastify, "Database"),
  auth: new Logger(fastify, "Auth"),
  session: new Logger(fastify, "Session"),
  user: new Logger(fastify, "User"),
  app: new Logger(fastify, "App"),
});
