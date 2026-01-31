// app/username.tsx
// Username selection screen - required for users without username

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import * as authApi from "@/lib/auth/auth.api";

export default function UsernameScreen() {
  const { t } = useTranslation("common");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { loadUser } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleComplete = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || trimmedUsername.length < 3) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameMin"));
      return;
    }

    if (trimmedUsername.length > 50) {
      Alert.alert("Error", "Username must be at most 50 characters long");
      return;
    }

    // Validate format - allow Hebrew, English letters, numbers, underscore, hyphen
    // Hebrew Unicode range: \u0590-\u05FF
    // English letters: a-zA-Z
    // Numbers: 0-9
    // Special: _-
    const usernameRegex = /^[\u0590-\u05FFa-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameFormat"));
      return;
    }

    setIsLoading(true);
    try {
      await authApi.completeOnboarding(trimmedUsername);
      // Refresh user data to get updated username
      // Use loadUser instead of bootstrap to avoid resetting status to "loading"
      await loadUser();
      // Navigate to index which will redirect based on updated user state
      router.replace("/");
    } catch (err) {
      console.error("Onboarding completion failed:", err);
      if (err instanceof Error) {
        Alert.alert(t("errors.error"), err.message);
      } else {
        Alert.alert(
          t("errors.error"),
          t("auth.errorOnboardingFailed")
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
          },
        ]}
      >
        {t("auth.completeProfile")}
      </Text>
      <Text
        style={[
          styles.subtitle,
          {
            color: theme.colors.textSecondary,
          },
        ]}
      >
        {t("auth.chooseUsername")}
      </Text>

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

        <Text
          style={[
            styles.hint,
            {
              color: theme.colors.textSecondary,
            },
          ]}
        >
          {t("auth.usernameHint")}
        </Text>

        <Pressable
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary,
            },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleComplete}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t("auth.complete")}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
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
  hint: {
    fontSize: 12,
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
