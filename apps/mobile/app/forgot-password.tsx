// app/forgot-password.tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import { useForgotPasswordMutation } from "@/lib/auth/auth.mutations";
import { getAuthErrorMessage } from "@/lib/errors/getAuthErrorMessage";

export default function ForgotPasswordScreen() {
  return (
    <ErrorBoundary feature="forgot-password">
      <ScreenContent />
    </ErrorBoundary>
  );
}

function ScreenContent() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const mutation = useForgotPasswordMutation();

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (formError) setFormError(null);
  };

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFormError(t("auth.errorValidEmail"));
      return;
    }

    setFormError(null);
    try {
      await mutation.mutateAsync({ email: trimmed });
      setSent(true);
    } catch (err) {
      setFormError(getAuthErrorMessage(err));
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
          {sent ? (
            <View style={styles.form}>
              <AppText variant="display" style={[styles.title, { marginBottom: theme.spacing.sm }]}>
                {t("forgotPassword.successTitle")}
              </AppText>
              <AppText
                variant="body"
                color="secondary"
                style={[styles.subtitle, { marginBottom: theme.spacing.xxl }]}
              >
                {t("forgotPassword.successMessage")}
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
                ]}
                onPress={() => router.replace("/sign-in")}
              >
                <AppText
                  variant="body"
                  color="onPrimary"
                  style={styles.buttonText}
                >
                  {t("forgotPassword.backToSignIn")}
                </AppText>
              </Pressable>
            </View>
          ) : (
            <>
              <AppText variant="display" style={[styles.title, { marginBottom: theme.spacing.sm }]}>
                {t("forgotPassword.title")}
              </AppText>
              <AppText
                variant="body"
                color="secondary"
                style={[styles.subtitle, { marginBottom: theme.spacing.xxl }]}
              >
                {t("forgotPassword.subtitle")}
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
                      marginBottom: theme.spacing.md,
                    },
                  ]}
                  placeholder={t("forgotPassword.emailPlaceholder")}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={email}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!mutation.isPending}
                  accessibilityLabel={t("forgotPassword.emailPlaceholder")}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  textContentType="emailAddress"
                  autoComplete="email"
                />

                {formError && (
                  <AppText
                    variant="caption"
                    color="danger"
                    style={[styles.error, { marginBottom: theme.spacing.md }]}
                  >
                    {formError}
                  </AppText>
                )}

                <Pressable
                  style={[
                    styles.button,
                    {
                      backgroundColor: theme.colors.primary,
                      shadowColor: theme.colors.primary,
                      paddingVertical: theme.spacing.md,
                      borderRadius: theme.radius.md,
                    },
                    mutation.isPending && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <AppText
                      variant="body"
                      color="onPrimary"
                      style={styles.buttonText}
                    >
                      {t("forgotPassword.sendResetLink")}
                    </AppText>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => router.back()}
                  disabled={mutation.isPending}
                  style={[styles.backLink, { marginTop: theme.spacing.md }]}
                >
                  <AppText
                    variant="caption"
                    style={{ color: theme.colors.primary, fontWeight: "700" }}
                  >
                    {t("forgotPassword.backToSignIn")}
                  </AppText>
                </Pressable>
              </View>
            </>
          )}
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
  error: {
    textAlign: "center",
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
  backLink: {
    alignSelf: "center",
  },
});
