// src/services/admin/users.service.ts
import type { FastifyInstance } from "fastify";
import * as bcrypt from "bcrypt";
import { Prisma, prisma } from "@repo/db";
import { getLogger } from "../../logger";

const log = getLogger("AdminUsers");
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from "../../utils/errors";
import { ADMIN_ROLE, USER_ROLE } from "../../constants/roles.constants";
import { ensureUserProfile } from "../../auth/user-onboarding";
import type {
  AdminUsersListResponse,
  AdminCreateUserResponse,
  AdminUpdateUserResponse,
} from "@repo/types";

type UserRow = AdminUsersListResponse["data"]["users"][number];
type CreateUserRow = NonNullable<AdminCreateUserResponse["data"]>;
type UpdateUserRow = NonNullable<AdminUpdateUserResponse["data"]>;

/**
 * Shared Prisma selection for user list and detail views.
 */
const selectUser = Prisma.validator<Prisma.usersSelect>()({
  id: true,
  email: true,
  name: true,
  username: true,
  role: true,
  image: true,
  createdAt: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
});

type UserWithSelection = Prisma.usersGetPayload<{
  select: typeof selectUser;
}>;

/**
 * AdminUsersService
 * -----------------
 * Business logic for user management:
 * - GET    /admin/users
 * - GET    /admin/users/:userId
 * - POST   /admin/users
 * - PATCH  /admin/users/:userId
 *
 * Routes should be thin (HTTP + error mapping). Validation + DB access stays here.
 */
export class AdminUsersService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Hash password using bcrypt (same as admin auth service).
   */
  private async hashPassword(plain: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(plain, saltRounds);
  }

  /**
   * List all users with pagination support.
   */
  async listUsers(args?: {
    limit?: number;
    offset?: number;
    role?: "admin" | "user";
    search?: string;
  }): Promise<{ users: UserRow[]; total: number }> {
    const limit = args?.limit ?? 50;
    const offset = args?.offset ?? 0;
    const role = args?.role;
    const search = args?.search?.trim();

    const where: Prisma.usersWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        select: selectUser,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.users.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name ?? null,
        username: u.username ?? null,
        role: u.role,
        image: u.image ?? null,
        createdAt: u.createdAt.toISOString(),
        emailVerifiedAt: u.emailVerifiedAt?.toISOString() ?? null,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      })),
      total,
    };
  }

  /**
   * Get a single user by ID.
   */
  async getUserById(userId: number): Promise<UserRow> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: selectUser,
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      username: user.username ?? null,
      role: user.role,
      image: user.image ?? null,
      createdAt: user.createdAt.toISOString(),
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }

  /**
   * Create a new user.
   */
  async createUser(input: {
    email: string;
    password: string;
    name?: string | null;
    username?: string | null;
    role?: "admin" | "user";
  }): Promise<CreateUserRow> {
    const email = input.email?.trim().toLowerCase();
    const password = input.password;
    const name = input.name?.trim() || null;
    const username = input.username?.trim() || null;
    const role = input.role ?? USER_ROLE;

    if (!email) {
      throw new BadRequestError("Email is required");
    }

    if (!password || password.length < 8) {
      throw new BadRequestError("Password must be at least 8 characters");
    }

    if (username && username.length > 50) {
      throw new BadRequestError("Username must be 50 characters or less");
    }

    if (role !== ADMIN_ROLE && role !== USER_ROLE) {
      throw new BadRequestError(
        `Invalid role. Must be "${ADMIN_ROLE}" or "${USER_ROLE}"`
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.users.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      throw new ConflictError(`User with email "${email}" already exists`);
    }

    // Check if username already exists (if provided)
    if (username) {
      const existingUsername = await prisma.users.findUnique({
        where: { username },
        select: { id: true },
      });

      if (existingUsername) {
        throw new ConflictError(
          `User with username "${username}" already exists`
        );
      }
    }

    const passwordHash = await this.hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.users.create({
        data: {
          email,
          password: passwordHash,
          name,
          username,
          role,
        },
        select: selectUser,
      });

      // Ensure profile exists for newly created user
      await ensureUserProfile(tx, created.id);

      return created;
    });

    log.info(
      { userId: user.id, email: user.email },
      "admin created user"
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      username: user.username ?? null,
      role: user.role,
      image: user.image ?? null,
      createdAt: user.createdAt.toISOString(),
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }

  /**
   * Update an existing user.
   */
  async updateUser(
    userId: number,
    input: {
      email?: string;
      password?: string;
      name?: string | null;
      username?: string | null;
      role?: "admin" | "user";
    }
  ): Promise<UpdateUserRow> {
    const email = input.email?.trim().toLowerCase();
    const password = input.password;
    const name =
      input.name !== undefined ? input.name?.trim() || null : undefined;
    const username =
      input.username !== undefined ? input.username?.trim() || null : undefined;
    const role = input.role;

    // Validate password if provided
    if (password !== undefined) {
      if (!password || password.length < 8) {
        throw new BadRequestError("Password must be at least 8 characters");
      }
    }

    // Validate username length if provided
    if (username !== undefined && username !== null && username.length > 50) {
      throw new BadRequestError("Username must be 50 characters or less");
    }

    // Validate role if provided
    if (role !== undefined && role !== ADMIN_ROLE && role !== USER_ROLE) {
      throw new BadRequestError(
        `Invalid role. Must be "${ADMIN_ROLE}" or "${USER_ROLE}"`
      );
    }

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    if (!existingUser) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Check if email already exists (if changing email)
    if (email && email !== existingUser.email) {
      const emailConflict = await prisma.users.findUnique({
        where: { email },
        select: { id: true },
      });

      if (emailConflict) {
        throw new ConflictError(`User with email "${email}" already exists`);
      }
    }

    // Check if username already exists (if changing username)
    if (
      username !== undefined &&
      username !== null &&
      username !== existingUser.username
    ) {
      const usernameConflict = await prisma.users.findUnique({
        where: { username },
        select: { id: true },
      });

      if (usernameConflict) {
        throw new ConflictError(
          `User with username "${username}" already exists`
        );
      }
    }

    // Build update data
    const updateData: Prisma.usersUpdateInput = {};

    if (email !== undefined) {
      updateData.email = email;
    }

    if (password !== undefined) {
      updateData.password = await this.hashPassword(password);
    }

    if (name !== undefined) {
      updateData.name = name;
    }

    if (username !== undefined) {
      updateData.username = username;
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    const user = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: selectUser,
    });

    log.info({ userId: user.id }, "admin updated user");

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      username: user.username ?? null,
      role: user.role,
      image: user.image ?? null,
      createdAt: user.createdAt.toISOString(),
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }
}
