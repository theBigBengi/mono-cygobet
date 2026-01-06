// src/auth/admin-auth.types.ts
import type { UserRole } from "../constants/roles.constants";

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
