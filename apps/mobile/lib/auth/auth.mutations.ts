// lib/auth/auth.mutations.ts
// React Query mutations for auth-domain actions (e.g. change password).

import { useMutation } from "@tanstack/react-query";
import { changePassword, forgotPassword, resetPassword } from "./auth.api";

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

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => forgotPassword(email),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => resetPassword(token, newPassword),
  });
}
