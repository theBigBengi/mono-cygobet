// Root layout for the Expo Router app.
// - Provides global providers (Theme, Query, Auth, etc.)
// - Returns Stack with (tabs) as the only screen
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import "react-native-reanimated";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";
import { useRouter } from "expo-router";

import { Provider as JotaiProvider } from "jotai";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { useAuth, isAuthenticated, isOnboarding, isUnauthenticated } from "@/lib/auth/useAuth";
import { queryClient } from "@/lib/query/queryClient";
import { StatusBar } from "expo-status-bar";
import { jotaiStore } from "@/lib/state/jotaiStore";
import { AppStartGate } from "@/components/AppStart/AppStartGate";
import { DegradedBanner } from "@/components/DegradedBanner";
import { initializeGlobalErrorHandlers } from "@/lib/errors/globalErrorHandlers";
import { handleError, getUserFriendlyMessage } from "@/lib/errors";
import { View, Text, StyleSheet, Pressable } from "react-native";

// Log store identity for verification
console.log("[RootLayout] Jotai store instance:", jotaiStore);

function AppContent() {
  const { colorScheme, theme } = useTheme();
  const { status, user } = useAuth();

  // Check if user is authenticated AND has username
  const isFullyAuthenticated = isAuthenticated(status) && !!user?.username;
  // Check if user is authenticated but missing username
  const needsUsername = isAuthenticated(status) && !user?.username;

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        edges={["top"]}
      >
        <AppStartGate>
          <DegradedBanner />
          <Stack
            screenOptions={{
              headerShown: true,
            }}
          >
            {/* Index route - redirects based on auth status */}
            <Stack.Screen name="index" options={{ headerShown: false }} />

            {/* Protected routes - only accessible when authenticated AND has username */}
            <Stack.Protected guard={isFullyAuthenticated}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="groups/[id]/index"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/games"
                options={{ title: "Group Games", headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/ranking"
                options={{ title: "Ranking", headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/predictions-overview"
                options={{ title: "Predictions Overview", headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/invite"
                options={{ title: "Invite", headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/member/[userId]"
                options={{ title: "Member Profile", headerShown: false }}
              />
              <Stack.Screen
                name="groups/join"
                options={{ title: "Joining...", headerShown: true }}
              />
              <Stack.Screen
                name="groups/discover"
                options={{ title: "Browse Public Groups", headerShown: true }}
              />
              <Stack.Screen
                name="profile/head-to-head"
                options={{ title: "Compare", headerShown: false }}
              />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", headerShown: true }}
              />
            </Stack.Protected>

            {/* Username selection - accessible when authenticated but missing username */}
            <Stack.Protected guard={needsUsername}>
              <Stack.Screen name="username" options={{ headerShown: false }} />
            </Stack.Protected>

            {/* Auth routes - only accessible when not authenticated */}
            <Stack.Protected guard={isUnauthenticated(status)}>
              <Stack.Screen name="sign-in" options={{ headerShown: false }} />
              <Stack.Screen name="sign-up" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>
        </AppStartGate>

        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </SafeAreaView>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  // Initialize global error handlers on mount
  useEffect(() => {
    initializeGlobalErrorHandlers();
  }, []);

  return (
    <JotaiProvider store={jotaiStore}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
}

/**
 * Root-level ErrorBoundary for Expo Router
 * Catches all unhandled errors in the app
 * 
 * Note: This component must be self-contained and not depend on any providers
 * (Theme, Auth, etc.) as it may run before they are initialized.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();

  // Handle the error
  useEffect(() => {
    handleError(error, {
      source: "rootErrorBoundary",
      route: "root",
    });
  }, [error]);

  const handleRetry = () => {
    if (retry) {
      retry();
    } else {
      // Fallback: navigate to home
      router.replace("/(tabs)/home");
    }
  };

  const handleGoHome = () => {
    router.replace("/(tabs)/home");
  };

  const userMessage = getUserFriendlyMessage(error);

  // Use inline styles to avoid dependency on ThemeProvider
  return (
    <View style={errorBoundaryStyles.container}>
      <View style={errorBoundaryStyles.content}>
        <Text style={errorBoundaryStyles.title}>Something went wrong</Text>
        <Text style={errorBoundaryStyles.message}>{userMessage}</Text>
        
        <Pressable
          style={errorBoundaryStyles.button}
          onPress={handleRetry}
        >
          <Text style={errorBoundaryStyles.buttonText}>Try Again</Text>
        </Pressable>
        
        <Pressable
          style={[errorBoundaryStyles.button, errorBoundaryStyles.buttonSecondary]}
          onPress={handleGoHome}
        >
          <Text style={[errorBoundaryStyles.buttonText, errorBoundaryStyles.buttonTextSecondary]}>
            Go to Home
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// Self-contained styles that don't depend on theme
const errorBoundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "#C7C7CC",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: "#000000",
  },
});
