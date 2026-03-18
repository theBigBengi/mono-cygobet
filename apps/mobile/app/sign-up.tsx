// app/sign-up.tsx
// Sign-up screen - always accessible, redirects to home after successful registration

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useRef, useState } from "react";
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
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { AppText, PasswordInput } from "@/components/ui";
import { getAuthErrorMessage } from "@/lib/errors/getAuthErrorMessage";
import * as authApi from "@/lib/auth/auth.api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  return (
    <ErrorBoundary feature="sign-up">
      <ScreenContent />
    </ErrorBoundary>
  );
}

function ScreenContent() {
  const { t } = useTranslation("common");
  const passwordInputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { applyAuthResult, error } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (formError) setFormError(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (formError) setFormError(null);
  };

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert(t("errors.error"), t("auth.errorEmailPassword"));
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert(t("errors.error"), t("auth.errorValidEmail"));
      return;
    }

    if (trimmedPassword.length < 8) {
      Alert.alert(t("errors.error"), t("auth.errorPasswordMin"));
      return;
    }

    setFormError(null);
    setIsLoading(true);
    try {
      const response = await authApi.register({
        email: trimmedEmail,
        password: trimmedPassword,
        name: null,
      });

      await applyAuthResult(response);
      router.replace("/");
    } catch (err) {
      setFormError(getAuthErrorMessage(err));
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
          <AppText variant="display" style={styles.title}>
            {t("auth.createAccount")}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {t("auth.signUpToGetStarted")}
          </AppText>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.cardBackground,
                },
              ]}
              placeholder={t("auth.email")}
              placeholderTextColor={theme.colors.textSecondary}
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
              accessibilityLabel={t("auth.email")}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              textContentType="emailAddress"
              autoComplete="email"
            />

            <PasswordInput
              ref={passwordInputRef}
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.cardBackground,
                },
              ]}
              placeholder={t("auth.password")}
              placeholderTextColor={theme.colors.textSecondary}
              value={password}
              onChangeText={handlePasswordChange}
              editable={!isLoading}
              accessibilityLabel={t("auth.password")}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              textContentType="newPassword"
              autoComplete="new-password"
            />
            <AppText
              variant="caption"
              color="secondary"
              style={styles.passwordHint}
            >
              {t("auth.passwordHint")}
            </AppText>

            {(formError || error) && (
              <AppText variant="caption" color="danger" style={styles.error}>
                {formError || error}
              </AppText>
            )}

            <Pressable
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText
                  variant="body"
                  color="onPrimary"
                  style={styles.buttonText}
                >
                  {t("auth.signUp")}
                </AppText>
              )}
            </Pressable>

            <View style={styles.toggleRow}>
              <AppText variant="caption" color="secondary">
                {t("auth.alreadyHaveAccount")}
              </AppText>
              <Pressable
                onPress={() => router.replace("/sign-in")}
                disabled={isLoading}
              >
                <AppText
                  variant="caption"
                  style={{ color: theme.colors.primary, fontWeight: "700" }}
                >
                  {t("auth.signIn")}
                </AppText>
              </Pressable>
            </View>
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
    padding: 24,
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    marginBottom: 40,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  input: {
    borderWidth: 0,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 14,
  },
  passwordHint: {
    marginTop: -10,
    marginBottom: 14,
    marginStart: 4,
  },
  error: {
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 4,
  },
});
