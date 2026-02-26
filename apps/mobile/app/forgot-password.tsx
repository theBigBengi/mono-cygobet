// app/forgot-password.tsx
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sent ? (
            <View style={styles.form}>
              <AppText variant="display" style={styles.title}>
                {t("forgotPassword.successTitle")}
              </AppText>
              <AppText
                variant="body"
                color="secondary"
                style={styles.subtitle}
              >
                {t("forgotPassword.successMessage")}
              </AppText>
              <Pressable
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
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
              <AppText variant="display" style={styles.title}>
                {t("forgotPassword.title")}
              </AppText>
              <AppText
                variant="body"
                color="secondary"
                style={styles.subtitle}
              >
                {t("forgotPassword.subtitle")}
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
                  placeholder={t("forgotPassword.emailPlaceholder")}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={email}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!mutation.isPending}
                />

                {formError && (
                  <AppText
                    variant="caption"
                    color="danger"
                    style={styles.error}
                  >
                    {formError}
                  </AppText>
                )}

                <Pressable
                  style={[
                    styles.button,
                    { backgroundColor: theme.colors.primary },
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
                  style={styles.backLink}
                >
                  <AppText
                    variant="caption"
                    style={{ color: theme.colors.primary, fontWeight: "600" }}
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
  backLink: {
    alignSelf: "center",
    marginTop: 16,
  },
});
