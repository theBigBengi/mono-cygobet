// lib/auth/useGoogleAuth.ts
// Hook for Google Sign-In supporting both Native SDK and Server-Side OAuth fallback

import { useCallback, useEffect, useState, useRef } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { getApiBaseUrl } from "@/lib/env";

// Required for web browser redirect to complete properly
WebBrowser.maybeCompleteAuthSession();

// Result type for the hook
export type GoogleAuthResult =
  | { type: "native"; idToken: string }
  | { type: "fallback"; otc: string };

interface UseGoogleAuthOptions {
  onSuccess: (result: GoogleAuthResult) => void;
  onError?: (error: Error) => void;
}

// Dynamically import native SDK - will fail in Expo Go
let GoogleSignin: typeof import("@react-native-google-signin/google-signin").GoogleSignin | null =
  null;
let isSuccessResponse: typeof import("@react-native-google-signin/google-signin").isSuccessResponse | null =
  null;
let isErrorWithCode: typeof import("@react-native-google-signin/google-signin").isErrorWithCode | null =
  null;
let statusCodes: typeof import("@react-native-google-signin/google-signin").statusCodes | null =
  null;

// Check if native SDK is available (not in Expo Go)
function checkNativeAvailable(): boolean {
  if (Platform.OS === "web") return false;

  try {
    // Dynamic require - will throw in Expo Go
    const googleSignIn = require("@react-native-google-signin/google-signin");
    GoogleSignin = googleSignIn.GoogleSignin;
    isSuccessResponse = googleSignIn.isSuccessResponse;
    isErrorWithCode = googleSignIn.isErrorWithCode;
    statusCodes = googleSignIn.statusCodes;
    return true;
  } catch {
    return false;
  }
}

const nativeAvailable = checkNativeAvailable();

export function useGoogleAuth({ onSuccess, onError }: UseGoogleAuthOptions) {
  const [isReady, setIsReady] = useState(false);
  const [isNative, setIsNative] = useState(nativeAvailable);
  const configuredRef = useRef(false);

  // Initialize native SDK if available
  useEffect(() => {
    if (nativeAvailable && GoogleSignin && !configuredRef.current) {
      try {
        GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        });
        configuredRef.current = true;
        setIsNative(true);
        setIsReady(true);
      } catch (err) {
        // Configuration failed, fall back to server-side OAuth
        setIsNative(false);
        setIsReady(true);
      }
    } else {
      // Fallback is always ready
      setIsNative(false);
      setIsReady(true);
    }
  }, []);

  const signInNative = useCallback(async () => {
    if (!GoogleSignin || !isSuccessResponse || !isErrorWithCode || !statusCodes) {
      onError?.(new Error("Google Sign-In SDK not available"));
      return;
    }

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        if (idToken) {
          onSuccess({ type: "native", idToken });
        } else {
          onError?.(new Error("No ID token received"));
        }
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // User cancelled - don't show error
            break;
          case statusCodes.IN_PROGRESS:
            // Already in progress
            break;
          default:
            onError?.(new Error(error.message));
        }
      } else {
        onError?.(error instanceof Error ? error : new Error("Google sign-in failed"));
      }
    }
  }, [onSuccess, onError]);

  const signInFallback = useCallback(async () => {
    try {
      const redirectUri = Linking.createURL("oauth");
      const baseUrl = getApiBaseUrl();
      const authUrl = `${baseUrl}/auth/google/start?redirect_uri=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const otc = url.searchParams.get("otc");
        const error = url.searchParams.get("error");

        if (error) {
          const errorMessages: Record<string, string> = {
            missing_params: "Missing authentication parameters",
            invalid_state: "Authentication session expired",
            auth_failed: "Authentication failed",
          };
          onError?.(new Error(errorMessages[error] || error));
          return;
        }

        if (otc) {
          onSuccess({ type: "fallback", otc });
        }
      } else if (result.type === "cancel") {
        // User cancelled - don't show error
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Google sign-in failed"));
    }
  }, [onSuccess, onError]);

  const signIn = useCallback(async () => {
    if (isNative && nativeAvailable) {
      await signInNative();
    } else {
      await signInFallback();
    }
  }, [isNative, signInNative, signInFallback]);

  return {
    signIn,
    isReady,
    isNative,
  };
}
