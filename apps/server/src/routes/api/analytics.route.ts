import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";

/**
 * POST /api/analytics/events — Collect analytics events from mobile app.
 * Accepts a batch of events to minimize network calls.
 * Mounted under /api by Fastify autoload.
 */
const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // Require auth but allow unauthenticated events (userId will be null)
  fastify.post<{
    Body: {
      events: Array<{
        eventName: string;
        properties?: Record<string, unknown>;
        screenName?: string;
        durationMs?: number;
        timestamp?: string;
        sessionId?: string;
        platform?: string;
        appVersion?: string;
      }>;
    };
  }>("/analytics/events", async (req, reply) => {
    // Try to resolve user but don't require auth
    const ctx = await fastify.userAuth.resolve(req);
    const userId = ctx?.user?.id ?? null;

    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return reply.status(400).send({ status: "error", message: "No events provided" });
    }

    if (events.length > 100) {
      return reply.status(400).send({ status: "error", message: "Max 100 events per batch" });
    }

    const rows = events.map((e) => ({
      userId,
      sessionId: e.sessionId ?? null,
      eventName: e.eventName,
      properties: (e.properties ?? {}) as object,
      screenName: e.screenName ?? null,
      durationMs: e.durationMs ?? null,
      platform: e.platform ?? null,
      appVersion: e.appVersion ?? null,
      createdAt: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));

    await prisma.analyticsEvents.createMany({ data: rows });

    return { status: "success", message: `${rows.length} events recorded` };
  });
};

export default analyticsRoutes;
