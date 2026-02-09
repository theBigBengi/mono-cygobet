// app/sign-in.tsx
// Sign-in screen - always accessible, redirects to home after successful login

import { useState, useCallback } from "react";
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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import { getAuthErrorMessage } from "@/lib/errors/getAuthErrorMessage";
import { useGoogleAuth, type GoogleAuthResult } from "@/lib/auth/useGoogleAuth";
import * as authApi from "@/lib/auth/auth.api";

// Google logo from official brand guidelines
const GOOGLE_LOGO_URI =
  "https://developers.google.com/identity/images/g-logo.png";

export default function SignInScreen() {
  const { t } = useTranslation("common");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { login, applyAuthResult, error } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleGoogleSuccess = useCallback(
    async (googleResult: GoogleAuthResult) => {
      setIsGoogleLoading(true);
      setFormError(null);
      try {
        // Use different API based on auth flow type
        const result =
          googleResult.type === "native"
            ? await authApi.google(googleResult.idToken)
            : await authApi.googleExchange(googleResult.otc);
        await applyAuthResult(result);
        router.replace("/");
      } catch (err) {
        setFormError(getAuthErrorMessage(err));
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [applyAuthResult, router]
  );

  const handleGoogleError = useCallback((err: Error) => {
    setFormError(err.message);
    setIsGoogleLoading(false);
  }, []);

  const { signIn: signInWithGoogle, isReady: isGoogleReady } = useGoogleAuth({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
  });

  const handleEmailOrUsernameChange = (text: string) => {
    setEmailOrUsername(text);
    if (formError) setFormError(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (formError) setFormError(null);
  };

  const handleLogin = async () => {
    if (!emailOrUsername.trim() || !password.trim()) {
      Alert.alert(t("errors.error"), t("auth.errorBothFields"));
      return;
    }

    setFormError(null);
    setIsLoading(true);
    try {
      await login(emailOrUsername.trim(), password);
      router.replace("/");
    } catch (err) {
      setFormError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const isAnyLoading = isLoading || isGoogleLoading;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
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
            {t("auth.login")}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {t("auth.enterCredentials")}
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
              placeholder={t("auth.emailOrUsername")}
              placeholderTextColor={theme.colors.textSecondary}
              value={emailOrUsername}
              onChangeText={handleEmailOrUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isAnyLoading}
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
              onChangeText={handlePasswordChange}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isAnyLoading}
            />

            {(formError || error) && (
              <AppText variant="caption" color="danger" style={styles.error}>
                {formError || error}
              </AppText>
            )}

            <Pressable
              style={[
                styles.button,
                { backgroundColor: theme.colors.primary },
                isAnyLoading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isAnyLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText
                  variant="body"
                  color="onPrimary"
                  style={styles.buttonText}
                >
                  {t("auth.login")}
                </AppText>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View
                style={[styles.dividerLine, { backgroundColor: theme.colors.border }]}
              />
              <AppText variant="caption" color="secondary" style={styles.dividerText}>
                {t("auth.or")}
              </AppText>
              <View
                style={[styles.dividerLine, { backgroundColor: theme.colors.border }]}
              />
            </View>

            {/* Google Sign-In Button */}
            <Pressable
              style={[
                styles.googleButton,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
                isAnyLoading && styles.buttonDisabled,
              ]}
              onPress={signInWithGoogle}
              disabled={!isGoogleReady || isAnyLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color={theme.colors.textPrimary} />
              ) : (
                <>
                  <Image
                    source={{ uri: GOOGLE_LOGO_URI }}
                    style={styles.googleLogo}
                  />
                  <AppText variant="body" style={styles.googleButtonText}>
                    {t("auth.continueWithGoogle")}
                  </AppText>
                </>
              )}
            </Pressable>

            <View style={styles.toggleRow}>
              <AppText variant="caption" color="secondary">
                {t("auth.dontHaveAccount")}
              </AppText>
              <Pressable
                onPress={() => router.replace("/sign-up")}
                disabled={isAnyLoading}
              >
                <AppText
                  variant="caption"
                  style={{ color: theme.colors.primary, fontWeight: "600" }}
                >
                  {t("auth.signUp")}
                </AppText>
              </Pressable>
            </View>
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
    justifyContent: "center",
    padding: 20,
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
    marginBottom: 16,
  },
  error: {
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
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  googleLogo: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontWeight: "500",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 4,
  },
});
