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
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
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
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
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
          <AppText
            variant="title"
            style={styles.title}
          >
            {t("auth.completeProfile")}
          </AppText>
          <AppText
            variant="body"
            color="secondary"
            style={styles.subtitle}
          >
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

            <AppText
              variant="caption"
              color="secondary"
              style={styles.hint}
            >
              {t("auth.usernameHint")}
            </AppText>

            <Pressable
              style={[
                styles.button,
                { backgroundColor: theme.colors.primary },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleComplete}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText variant="body" color="onPrimary" style={styles.buttonText}>
                  {t("auth.complete")}
                </AppText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
