// app/sign-in.tsx
// Sign-in screen - always accessible, redirects to home after successful login

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

export default function SignInScreen() {
  const { t } = useTranslation("common");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, error } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleLogin = async () => {
    if (!emailOrUsername.trim() || !password.trim()) {
      Alert.alert(t("errors.error"), t("auth.errorBothFields"));
      return;
    }

    setIsLoading(true);
    try {
      await login(emailOrUsername.trim(), password);
      // After successful login, index.tsx will handle redirect
      // - If user has username: redirects to /(tabs)/home
      // - If user has no username: redirects to /username
      router.replace("/");
    } catch (err) {
      // Error is already set in auth context
      console.error("Login failed:", err);
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
        {t("auth.login")}
      </Text>
      <Text
        style={[
          styles.subtitle,
          {
            color: theme.colors.textSecondary,
          },
        ]}
      >
        {t("auth.enterCredentials")}
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
          placeholder={t("auth.emailOrUsername")}
          placeholderTextColor={theme.colors.textSecondary}
          value={emailOrUsername}
          onChangeText={setEmailOrUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surface,
            },
          ]}
          placeholder={t("auth.password")}
          placeholderTextColor={theme.colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        {error && (
          <Text
            style={[
              styles.error,
              {
                color: theme.colors.danger,
              },
            ]}
          >
            {error}
          </Text>
        )}

        <Pressable
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary,
            },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t("auth.login")}</Text>
          )}
        </Pressable>

        <View style={styles.toggleRow}>
          <Text
            style={[
              styles.toggleText,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            {t("auth.dontHaveAccount")}
          </Text>
          <Pressable
            onPress={() => router.replace("/sign-up")}
            disabled={isLoading}
          >
            <Text
              style={[
                styles.toggleLink,
                {
                  color: theme.colors.primary,
                },
              ]}
            >
              {t("auth.signUp")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
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
    marginBottom: 16,
  },
  error: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    paddingVertical: 14,
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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  toggleText: {
    fontSize: 14,
    marginEnd: 4,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
