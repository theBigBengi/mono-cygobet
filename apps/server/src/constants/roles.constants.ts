// src/constants/roles.constants.ts

export const ADMIN_ROLE = "admin" as const;
export const USER_ROLE = "user" as const;

export type UserRole = typeof ADMIN_ROLE | typeof USER_ROLE;
