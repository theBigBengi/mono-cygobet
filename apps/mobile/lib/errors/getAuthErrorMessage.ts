import i18n from "i18next";
import { ApiError } from "@/lib/http/apiError";

export function getAuthErrorMessage(error: unknown): string {
  const t = (key: string) => i18n.t(key, { ns: "common" });

  if (error instanceof ApiError) {
    // Network error (no connection)
    if (error.status === 0) {
      return t("errors.noInternet");
    }
    // Rate limited
    if (error.status === 429) {
      return t("errors.tooManyAttempts");
    }
    // Server error
    if (error.status >= 500) {
      return t("errors.serverError");
    }
    // Client errors with message from server
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t("errors.somethingWentWrong");
}
