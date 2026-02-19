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
      const result = await sandbox.sandboxSetup(
        req.body as Parameters<typeof sandbox.sandboxSetup>[0]
      );
      return reply.send({
        status: "success",
        data: result,
        message: "Sandbox setup complete",
      });
    }
  );

  // POST /admin/sandbox/add-fixture
  fastify.post(
    "/add-fixture",
    {
      schema: {
        body: schemas.sandboxAddFixtureBodySchema,
        response: { 200: schemas.sandboxResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await sandbox.sandboxAddFixture(
        req.body as Parameters<typeof sandbox.sandboxAddFixture>[0]
      );
      return reply.send({
        status: "success",
        data: result,
        message: "Fixture added to group",
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
      const result = await sandbox.sandboxSimulateKickoff(
        fixtureId,
        fastify.io
      );
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
      const result = await sandbox.sandboxSimulateFullTime(
        req.body as Parameters<typeof sandbox.sandboxSimulateFullTime>[0],
        fastify.io
      );
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

  // POST /admin/sandbox/update-start-time
  fastify.post(
    "/update-start-time",
    {
      schema: {
        body: schemas.sandboxUpdateStartTimeBodySchema,
        response: { 200: schemas.sandboxResponseSchema },
      },
    },
    async (req, reply) => {
      const body = req.body as { fixtureId: number; startTime: string };
      const result = await sandbox.sandboxUpdateStartTime(body);
      return reply.send({
        status: "success",
        data: result,
        message: "Start time updated",
      });
    }
  );

  // DELETE /admin/sandbox/group/:groupId
  fastify.delete(
    "/group/:groupId",
    {
      schema: {
        params: schemas.sandboxGroupIdParamsSchema,
        response: { 200: schemas.sandboxResponseSchema },
      },
    },
    async (req, reply) => {
      const groupId = Number((req.params as { groupId: string }).groupId);
      const result = await sandbox.sandboxDeleteGroup(groupId);
      return reply.send({
        status: "success",
        data: result,
        message: "Sandbox group deleted",
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

  // GET /admin/sandbox/group/:groupId/members
  fastify.get(
    "/group/:groupId/members",
    {
      schema: {
        params: schemas.sandboxGroupIdParamsSchema,
        response: { 200: schemas.sandboxMembersResponseSchema },
      },
    },
    async (req, reply) => {
      const groupId = Number((req.params as { groupId: string }).groupId);
      const members = await sandbox.sandboxGetGroupMembers(groupId);
      return reply.send({
        status: "success",
        data: members,
        message: "Group members",
      });
    }
  );

  // POST /admin/sandbox/send-message
  fastify.post(
    "/send-message",
    {
      schema: {
        body: schemas.sandboxSendMessageBodySchema,
        response: { 200: schemas.sandboxSendMessageResponseSchema },
      },
    },
    async (req, reply) => {
      const result = await sandbox.sandboxSendMessage(
        req.body as Parameters<typeof sandbox.sandboxSendMessage>[0],
        fastify.io
      );
      return reply.send({
        status: "success",
        data: result,
        message: "Message sent",
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
