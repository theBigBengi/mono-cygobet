// src/routes/admin/sandbox/sandbox.route.ts
// Sandbox: setup, kickoff, full-time, reset, cleanup, list. Mounted under /admin/sandbox by Fastify autoload.

import { FastifyPluginAsync } from "fastify";
import * as sandbox from "../../../services/admin/sandbox.service";
import * as schemas from "../../../schemas/admin/sandbox.schemas";

const sandboxRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sandbox/setup
  fastify.post(
    "/setup",
    {
      schema: {
        body: schemas.sandboxSetupBodySchema,
        response: { 200: schemas.sandboxResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await sandbox.sandboxSetup(req.body as Parameters<typeof sandbox.sandboxSetup>[0]);
      return reply.send({
        status: "success",
        data: result,
        message: "Sandbox setup complete",
      });
    }
  );

  // POST /admin/sandbox/simulate/kickoff
  fastify.post(
    "/simulate/kickoff",
    {
      schema: {
        body: schemas.sandboxSimulateKickoffBodySchema,
        response: { 200: schemas.sandboxResponseSchema },
      },
    },
    async (req, reply) => {
      const { fixtureId } = req.body as { fixtureId: number };
      const result = await sandbox.sandboxSimulateKickoff(fixtureId, fastify.io);
      return reply.send({
        status: "success",
        data: result,
        message: "Fixture kicked off",
      });
    }
  );

  // POST /admin/sandbox/simulate/full-time
  fastify.post(
    "/simulate/full-time",
    {
      schema: {
        body: schemas.sandboxSimulateFullTimeBodySchema,
        response: { 200: schemas.sandboxResponseSchema },
      },
    },
    async (req, reply) => {
      const body = req.body as {
        fixtureId: number;
        homeScore: number;
        awayScore: number;
      };
      const result = await sandbox.sandboxSimulateFullTime(body, fastify.io);
      return reply.send({
        status: "success",
        data: result,
        message: "Fixture finished and predictions settled",
      });
    }
  );

  // POST /admin/sandbox/simulate/update-live
  fastify.post(
    "/simulate/update-live",
    {
      schema: {
        body: schemas.sandboxUpdateLiveBodySchema,
        response: { 200: schemas.sandboxResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await sandbox.sandboxUpdateLive(
        req.body as Parameters<typeof sandbox.sandboxUpdateLive>[0]
      );
      return reply.send({
        status: "success",
        data: result,
        message: "Live fixture updated",
      });
    }
  );

  // POST /admin/sandbox/reset-fixture
  fastify.post(
    "/reset-fixture",
    {
      schema: {
        body: schemas.sandboxResetFixtureBodySchema,
        response: { 200: schemas.sandboxResponseSchema },
      },
    },
    async (req, reply) => {
      const { fixtureId } = req.body as { fixtureId: number };
      const result = await sandbox.sandboxResetFixture(fixtureId);
      return reply.send({
        status: "success",
        data: result,
        message: "Fixture reset to NS",
      });
    }
  );

  // DELETE /admin/sandbox/cleanup
  fastify.delete(
    "/cleanup",
    {
      schema: {
        response: { 200: schemas.sandboxResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await sandbox.sandboxCleanup();
      return reply.send({
        status: "success",
        data: result,
        message: "All sandbox data cleaned up",
      });
    }
  );

  // GET /admin/sandbox/list
  fastify.get(
    "/list",
    {
      schema: {
        response: { 200: schemas.sandboxResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await sandbox.sandboxList();
      return reply.send({
        status: "success",
        data: result,
        message: "Sandbox data retrieved",
      });
    }
  );
};

export default sandboxRoutes;
