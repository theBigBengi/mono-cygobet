// app/username.tsx
// Username selection screen - required for users without username

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import { useUsernameAvailability } from "@/lib/auth/useUsernameAvailability";
import * as authApi from "@/lib/auth/auth.api";

export default function UsernameScreen() {
  return (
    <ErrorBoundary feature="username">
      <ScreenContent />
    </ErrorBoundary>
  );
}

function ScreenContent() {
  const { t } = useTranslation("common");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const availabilityStatus = useUsernameAvailability(username);
  const { loadUser, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const canSubmit =
    username.trim().length >= 3 &&
    availabilityStatus === "available" &&
    !isLoading;

  const handleComplete = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || trimmedUsername.length < 3) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameMin"));
      return;
    }

    if (trimmedUsername.length > 50) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameMax"));
      return;
    }

    // Validate format - allow Hebrew, English letters, numbers, underscore, hyphen
    const usernameRegex = /^[\u0590-\u05FFa-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameFormat"));
      return;
    }

    setIsLoading(true);
    try {
      await authApi.completeOnboarding(trimmedUsername);
      await loadUser();
      router.replace("/");
    } catch (err) {
      if (err instanceof Error) {
        Alert.alert(t("errors.error"), err.message);
      } else {
        Alert.alert(t("errors.error"), t("auth.errorOnboardingFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: theme.spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="title" style={[styles.title, { marginBottom: theme.spacing.sm }]}>
            {t("auth.completeProfile")}
          </AppText>
          <AppText variant="body" color="secondary" style={[styles.subtitle, { marginBottom: theme.spacing.xxl }]}>
            {t("auth.chooseUsername")}
          </AppText>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.sm,
                },
              ]}
              placeholder={t("auth.username")}
              placeholderTextColor={theme.colors.textSecondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              accessibilityLabel={t("auth.username")}
              returnKeyType="done"
              onSubmitEditing={canSubmit ? handleComplete : undefined}
              textContentType="username"
              autoComplete="username"
            />

            {/* Availability indicator */}
            {username.trim().length >= 3 && (
              <View style={[styles.availabilityRow, { marginTop: theme.spacing.xs, marginBottom: theme.spacing.sm }]}>
                {availabilityStatus === "checking" && (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textSecondary}
                    />
                    <AppText
                      variant="caption"
                      color="secondary"
                      style={[styles.availabilityText, { marginStart: theme.spacing.xs }]}
                    >
                      {t("auth.checkingUsername")}
                    </AppText>
                  </>
                )}
                {availabilityStatus === "available" && (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={theme.colors.success}
                    />
                    <AppText
                      variant="caption"
                      style={[
                        styles.availabilityText,
                        { color: theme.colors.success, marginStart: theme.spacing.xs },
                      ]}
                    >
                      {t("auth.usernameAvailable")}
                    </AppText>
                  </>
                )}
                {availabilityStatus === "taken" && (
                  <>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={theme.colors.danger}
                    />
                    <AppText
                      variant="caption"
                      style={[
                        styles.availabilityText,
                        { color: theme.colors.danger, marginStart: theme.spacing.xs },
                      ]}
                    >
                      {t("auth.usernameTaken")}
                    </AppText>
                  </>
                )}
              </View>
            )}

            <AppText variant="caption" color="secondary" style={[styles.hint, { marginBottom: theme.spacing.lg }]}>
              {t("auth.usernameHint")}
            </AppText>

            <Pressable
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                  paddingVertical: theme.spacing.md,
                  borderRadius: theme.radius.md,
                },
                (isLoading || !canSubmit) && styles.buttonDisabled,
              ]}
              onPress={handleComplete}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel={t("auth.complete")}
              accessibilityState={{ disabled: !canSubmit }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText
                  variant="body"
                  color="onPrimary"
                  style={styles.buttonText}
                >
                  {t("auth.complete")}
                </AppText>
              )}
            </Pressable>

            <Pressable
              onPress={() => logout()}
              disabled={isLoading}
              style={[styles.logoutLink, { marginTop: theme.spacing.md, padding: theme.spacing.sm }]}
              accessibilityRole="button"
              accessibilityLabel={t("accessibility.logout")}
            >
              <AppText
                variant="caption"
                color="secondary"
              >
                {t("accessibility.logout")}
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  input: {
    borderWidth: 0,
    fontSize: 16,
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  availabilityText: {
  },
  hint: {
  },
  button: {
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: "600",
  },
  logoutLink: {
    alignSelf: "center",
  },
});
