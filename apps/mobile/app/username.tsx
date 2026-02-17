// app/username.tsx
// Username selection screen - required for users without username

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
  const { t } = useTranslation("common");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const availabilityStatus = useUsernameAvailability(username);
  const { loadUser } = useAuth();
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="title" style={styles.title}>
            {t("auth.completeProfile")}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {t("auth.chooseUsername")}
          </AppText>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              placeholder={t("auth.username")}
              placeholderTextColor={theme.colors.textSecondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            {/* Availability indicator */}
            {username.trim().length >= 3 && (
              <View style={styles.availabilityRow}>
                {availabilityStatus === "checking" && (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textSecondary}
                    />
                    <AppText
                      variant="caption"
                      color="secondary"
                      style={styles.availabilityText}
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
                        { color: theme.colors.success },
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
                        { color: theme.colors.danger },
                      ]}
                    >
                      {t("auth.usernameTaken")}
                    </AppText>
                  </>
                )}
              </View>
            )}

            <AppText variant="caption" color="secondary" style={styles.hint}>
              {t("auth.usernameHint")}
            </AppText>

            <Pressable
              style={[
                styles.button,
                { backgroundColor: theme.colors.primary },
                (isLoading || !canSubmit) && styles.buttonDisabled,
              ]}
              onPress={handleComplete}
              disabled={!canSubmit}
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
    padding: 20,
    justifyContent: "center",
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    marginBottom: 32,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  availabilityText: {
    marginLeft: 6,
  },
  hint: {
    marginBottom: 24,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: "600",
  },
});
