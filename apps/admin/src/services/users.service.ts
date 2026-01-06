// src/services/users.service.ts
import type {
  AdminUsersListResponse,
  AdminUserResponse,
  AdminCreateUserResponse,
  AdminUpdateUserResponse,
} from "@repo/types";
import { apiGet, apiPost, apiPatch } from "@/lib/adminApi";

export const usersService = {
  /**
   * List users with optional filters
   */
  list: async (params?: {
    limit?: number;
    offset?: number;
    role?: "admin" | "user";
    search?: string;
  }): Promise<AdminUsersListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    if (params?.role) searchParams.set("role", params.role);
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return apiGet<AdminUsersListResponse>(
      `/admin/users${query ? `?${query}` : ""}`
    );
  },

  /**
   * Get a single user by ID
   */
  getById: async (userId: number): Promise<AdminUserResponse> => {
    return apiGet<AdminUserResponse>(`/admin/users/${userId}`);
  },

  /**
   * Create a new user
   */
  create: async (data: {
    email: string;
    password: string;
    name?: string | null;
    username?: string | null;
    role?: "admin" | "user";
  }): Promise<AdminCreateUserResponse> => {
    return apiPost<AdminCreateUserResponse>("/admin/users", data);
  },

  /**
   * Update an existing user
   */
  update: async (
    userId: number,
    data: {
      email?: string;
      password?: string;
      name?: string | null;
      username?: string | null;
      role?: "admin" | "user";
    }
  ): Promise<AdminUpdateUserResponse> => {
    return apiPatch<AdminUpdateUserResponse>(`/admin/users/${userId}`, data);
  },
};
