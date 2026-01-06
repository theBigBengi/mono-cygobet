// src/routes/admin/users/users.route.ts
import { FastifyPluginAsync } from "fastify";
import { AdminUsersService } from "../../../services/admin/users.service";
import { AppError } from "../../../utils/errors";
import {
  listUsersQuerySchema,
  userParamsSchema,
  createUserBodySchema,
  updateUserBodySchema,
  listUsersResponseSchema,
  userDetailResponseSchema,
} from "../../../schemas/admin/users.schemas";
import type {
  AdminUsersListResponse,
  AdminUserResponse,
  AdminCreateUserResponse,
  AdminUpdateUserResponse,
} from "@repo/types";

/**
 * Admin Users Routes
 * ------------------
 * User management endpoints for admin users.
 *
 * Mounted under `/admin/users` by Fastify autoload folder prefix.
 *
 * - GET    /admin/users
 * - GET    /admin/users/:userId
 * - POST   /admin/users
 * - PATCH  /admin/users/:userId
 */
const adminUsersRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AdminUsersService(fastify);

  // GET /admin/users - List all users with pagination and filters
  fastify.get<{
    Querystring: {
      limit?: number;
      offset?: number;
      role?: "admin" | "user";
      search?: string;
    };
    Reply: AdminUsersListResponse;
  }>(
    "/",
    {
      schema: {
        querystring: listUsersQuerySchema,
        response: { 200: listUsersResponseSchema },
      },
    },
    async (req, reply): Promise<AdminUsersListResponse> => {
      const { limit, offset, role, search } = req.query;
      const { users, total } = await service.listUsers({
        limit,
        offset,
        role,
        search,
      });

      return reply.send({
        status: "success",
        data: { users, total },
        message: "Users fetched successfully",
      });
    }
  );

  // GET /admin/users/:userId - Get a single user by ID
  fastify.get<{
    Params: { userId: string };
    Reply: AdminUserResponse;
  }>(
    "/:userId",
    {
      schema: {
        params: userParamsSchema,
        response: { 200: userDetailResponseSchema },
      },
    },
    async (req, reply): Promise<AdminUserResponse> => {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) {
        return reply.status(400).send({
          status: "error",
          data: null,
          message: "Invalid user ID",
        } as unknown as AdminUserResponse);
      }

      try {
        const user = await service.getUserById(userId);
        return reply.send({
          status: "success",
          data: user,
          message: "User fetched successfully",
        });
      } catch (e: unknown) {
        if (e instanceof AppError) {
          return reply.status(e.status).send({
            status: "error",
            data: null,
            message: e.message,
          } as unknown as AdminUserResponse);
        }
        throw e;
      }
    }
  );

  // POST /admin/users - Create a new user
  fastify.post<{
    Body: {
      email: string;
      password: string;
      name?: string | null;
      username?: string | null;
      role?: "admin" | "user";
    };
    Reply: AdminCreateUserResponse;
  }>(
    "/",
    {
      schema: {
        body: createUserBodySchema,
        response: { 200: userDetailResponseSchema },
      },
    },
    async (req, reply): Promise<AdminCreateUserResponse> => {
      try {
        const user = await service.createUser(req.body);
        return reply.send({
          status: "success",
          data: user,
          message: "User created successfully",
        });
      } catch (e: unknown) {
        if (e instanceof AppError) {
          return reply.status(e.status).send({
            status: "error",
            data: null,
            message: e.message,
          } as unknown as AdminCreateUserResponse);
        }
        throw e;
      }
    }
  );

  // PATCH /admin/users/:userId - Update an existing user
  fastify.patch<{
    Params: { userId: string };
    Body: {
      email?: string;
      password?: string;
      name?: string | null;
      username?: string | null;
      role?: "admin" | "user";
    };
    Reply: AdminUpdateUserResponse;
  }>(
    "/:userId",
    {
      schema: {
        params: userParamsSchema,
        body: updateUserBodySchema,
        response: { 200: userDetailResponseSchema },
      },
    },
    async (req, reply): Promise<AdminUpdateUserResponse> => {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) {
        return reply.status(400).send({
          status: "error",
          data: null,
          message: "Invalid user ID",
        } as unknown as AdminUpdateUserResponse);
      }

      try {
        const user = await service.updateUser(userId, req.body);
        return reply.send({
          status: "success",
          data: user,
          message: "User updated successfully",
        });
      } catch (e: unknown) {
        if (e instanceof AppError) {
          return reply.status(e.status).send({
            status: "error",
            data: null,
            message: e.message,
          } as unknown as AdminUpdateUserResponse);
        }
        throw e;
      }
    }
  );
};

export default adminUsersRoutes;

