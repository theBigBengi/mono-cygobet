// src/types/auth.ts
// Shared auth types (user + admin). Used by auth/, plugins/, types/fastify.d.

import type { UserRole } from "../constants/roles.constants";

export type UserAuthUser = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  image: string | null;
  role: UserRole;
};

export type UserAuthContext = {
  user: UserAuthUser;
};

export type AdminAuthUser = {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
};

export type AdminAuthSession = {
  id: number;
  userId: number;
  expires: Date;
};

export type AdminAuthContext = {
  user: AdminAuthUser;
  session: AdminAuthSession;
};
