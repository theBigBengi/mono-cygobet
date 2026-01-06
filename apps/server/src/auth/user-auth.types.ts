// src/auth/user-auth.types.ts
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

