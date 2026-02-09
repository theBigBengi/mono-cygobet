import { useState, useEffect, useRef } from "react";
import * as authApi from "./auth.api";

type AvailabilityStatus = "idle" | "checking" | "available" | "taken" | "error";

export function useUsernameAvailability(username: string, minLength = 3) {
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const trimmed = username.trim();

    // Reset to idle if too short
    if (trimmed.length < minLength) {
      setStatus("idle");
      return;
    }

    // Validate format before checking
    const usernameRegex = /^[\u0590-\u05FFa-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmed)) {
      setStatus("idle");
      return;
    }

    setStatus("checking");

    // Debounce 500ms
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await authApi.checkUsernameAvailable(trimmed);
        setStatus(result.available ? "available" : "taken");
      } catch {
        setStatus("error");
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [username, minLength]);

  return status;
}
