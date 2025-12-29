import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { prisma } from "@repo/db";
import { UserDTO } from "@repo/types/user";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: ["http://localhost:3000"],
    credentials: true,
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/version", async () => ({
    name: "api",
    version: "1.0.0",
  }));

  app.get("/users", async (): Promise<{ users: UserDTO[] }> => {
    const users = await prisma.user.findMany();
    return { users };
  });

  return app;
}
