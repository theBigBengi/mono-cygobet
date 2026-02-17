// Root layout for the Expo Router app.
// - Provides global providers (Theme, Query, Auth, etc.)
// - Returns Stack with (tabs) as the only screen
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, type ErrorBoundaryProps, usePathname } from "expo-router";
import "react-native-reanimated";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";
import { useRouter } from "expo-router";

import { Provider as JotaiProvider } from "jotai";
import { I18nBootstrap } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SocketProvider } from "@/lib/socket";
import {
  useAuth,
  isAuthenticated,
  isOnboarding,
  isUnauthenticated,
} from "@/lib/auth/useAuth";
import { queryClient } from "@/lib/query/queryClient";
import { StatusBar } from "expo-status-bar";
import { jotaiStore } from "@/lib/state/jotaiStore";
import { AppStartGate } from "@/components/AppStart/AppStartGate";
import { DegradedBanner } from "@/components/DegradedBanner";
import { initializeGlobalErrorHandlers } from "@/lib/errors/globalErrorHandlers";
import { handleError, getUserFriendlyMessage } from "@/lib/errors";
import { View, Text, StyleSheet, Pressable } from "react-native";
// Note: SafeAreaView import kept for ErrorBoundary, but root layout now uses View for transparency
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from "@sentry/react-native";
import * as NavigationBar from "expo-navigation-bar";
import { Platform } from "react-native";
import { analytics } from "@/lib/analytics";

SplashScreen.preventAutoHideAsync();

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: __DEV__ ? "development" : "production",
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    debug: __DEV__,
  });
}

function AppContent() {
  const { t } = useTranslation("common");
  const { colorScheme, theme } = useTheme();
  const { status, user } = useAuth();
  const pathname = usePathname();

  // Auto-track screen views on navigation
  useEffect(() => {
    if (pathname) {
      analytics.screen(pathname);
    }
  }, [pathname]);

  // Set Android navigation bar to transparent
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync("transparent");
      NavigationBar.setButtonStyleAsync(colorScheme === "dark" ? "light" : "dark");
    }
  }, [colorScheme]);

  // Check if user is authenticated AND has username
  const isFullyAuthenticated = isAuthenticated(status) && !!user?.username;
  // Check if user is authenticated but missing username
  const needsUsername =
    (isAuthenticated(status) || isOnboarding(status)) && !user?.username;

  // Create custom theme with transparent background to allow screens to control their own backgrounds
  const navigationTheme = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === "dark" ? DarkTheme : DefaultTheme).colors,
      background: "transparent",
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <View style={{ flex: 1 }}>
        <AppStartGate>
          <DegradedBanner />
          <Stack
            screenOptions={{
              headerShown: true,
              contentStyle: { backgroundColor: "transparent" },
            }}
          >
            {/* Index route - redirects based on auth status */}
            <Stack.Screen name="index" options={{ headerShown: false }} />

            {/* Protected routes - only accessible when authenticated AND has username */}
            <Stack.Protected guard={isFullyAuthenticated}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="fixtures/[id]"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/index"
                options={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "transparent" },
                }}
              />
              <Stack.Screen
                name="groups/[id]/games"
                options={{ title: t("groups.groupGames"), headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/fixtures/[fixtureId]"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/ranking"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/predictions-overview"
                options={{
                  title: t("groups.predictionsOverview"),
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="groups/[id]/invite"
                options={{ title: t("groups.invite"), headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/members"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/settings"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/chat"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="groups/[id]/member/[userId]"
                options={{
                  title: t("groups.memberProfile"),
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="groups/join"
                options={{ title: t("groups.joinGroup"), headerShown: false }}
              />
              <Stack.Screen
                name="groups/discover"
                options={{ title: t("groups.discover"), headerShown: false }}
              />
              <Stack.Screen
                name="profile/head-to-head"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="profile/groups"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="tooltip-demo"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", headerShown: true }}
              />
              <Stack.Screen
                name="change-password"
                options={{ headerShown: false }}
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
      </View>
    </NavigationThemeProvider>
  );
}

function RootLayout() {
  // Initialize global error handlers and analytics on mount
  useEffect(() => {
    initializeGlobalErrorHandlers();
    analytics.init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <JotaiProvider store={jotaiStore}>
        <QueryClientProvider client={queryClient}>
          <I18nBootstrap>
            <ThemeProvider>
              <BottomSheetModalProvider>
                <AuthProvider>
                  <SocketProvider>
                    <AppContent />
                  </SocketProvider>
                </AuthProvider>
              </BottomSheetModalProvider>
            </ThemeProvider>
          </I18nBootstrap>
        </QueryClientProvider>
      </JotaiProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

/**
 * Root-level ErrorBoundary for Expo Router
 * Catches all unhandled errors in the app
 *
 * Note: This component must be self-contained and not depend on any providers
 * (Theme, Auth, etc.) as it may run before they are initialized.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();
  const t = (key: string): string =>
    i18n.isInitialized ? String((i18n as any).t(key, { ns: "common" })) : key;

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
        <Text style={errorBoundaryStyles.title}>
          {t("errors.somethingWentWrongTitle") || "Something went wrong"}
        </Text>
        <Text style={errorBoundaryStyles.message}>{userMessage}</Text>

        <Pressable style={errorBoundaryStyles.button} onPress={handleRetry}>
          <Text style={errorBoundaryStyles.buttonText}>
            {t("errors.tryAgain") || "Try Again"}
          </Text>
        </Pressable>

        <Pressable
          style={[
            errorBoundaryStyles.button,
            errorBoundaryStyles.buttonSecondary,
          ]}
          onPress={handleGoHome}
        >
          <Text
            style={[
              errorBoundaryStyles.buttonText,
              errorBoundaryStyles.buttonTextSecondary,
            ]}
          >
            {t("errors.goToHome") || "Go to Home"}
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
