// routes/api/fixture-detail.route.ts
// GET /api/fixtures/:id — full fixture + user's predictions across all groups.
// Mounted under /api by Fastify autoload.

import type { FastifyPluginAsync } from "fastify";
import { getFixtureDetail } from "../../services/api/fixtures/fixture-detail";

const fixtureDetailRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /fixtures/:id
   *
   * - Requires auth + onboarding completion.
   * - Returns full fixture data + current user's predictions for this fixture across all groups.
   */
  fastify.get<{
    Params: { id: string };
  }>("/fixtures/:id", {
    preHandler: [fastify.userAuth.requireOnboardingComplete],
  }, async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid fixture ID",
      });
    }
    const userId = req.userAuth!.user.id;
    const data = await getFixtureDetail(id, userId);
    if (data == null) {
      return reply.status(404).send({
        status: "error",
        message: "Fixture not found",
      });
    }
    return reply.send({
      status: "success",
      data,
    });
  });
};

export default fixtureDetailRoutes;
