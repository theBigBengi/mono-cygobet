// lib/auth/auth.mutations.ts
// React Query mutations for auth-domain actions (e.g. change password).

import { useMutation } from "@tanstack/react-query";
import { changePassword } from "./auth.api";

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => changePassword(currentPassword, newPassword),
  });
}
