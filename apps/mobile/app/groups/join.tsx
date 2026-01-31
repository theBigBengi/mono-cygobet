// app/groups/join.tsx
// Join a group by invite code.
// - With ?code=XXX (deep link): auto-joins.
// - Without code: shows form to enter code (for in-app / dev testing).

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, ScreenWithHeader, AppText, Button } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useJoinGroupByCodeMutation } from "@/domains/groups";
import { useTheme } from "@/lib/theme";

export default function GroupJoinRoute() {
  const { t } = useTranslation("common");
  const params = useLocalSearchParams<{ code: string }>();
  const codeFromUrl = typeof params.code === "string" ? params.code.trim() : "";
  const [enteredCode, setEnteredCode] = useState("");
  const router = useRouter();
  const { theme } = useTheme();
  const joinMutation = useJoinGroupByCodeMutation();

  // When opened with ?code=XXX (deep link or after form submit)
  const code = codeFromUrl || undefined;

  useEffect(() => {
    if (!code) return;
    joinMutation.mutate(code, {
      onSuccess: (response) => {
        router.replace(`/groups/${response.data.id}`);
      },
    });
  }, [code]);

  const handleSubmitCode = () => {
    const trimmed = enteredCode.trim();
    if (!trimmed) return;
    router.replace(`/groups/join?code=${encodeURIComponent(trimmed)}`);
  };

  // No code in URL: show form (in-app "Join with code" flow / dev testing)
  if (!code) {
    return (
      <ScreenWithHeader title={t("groups.joinGroup")}>
        <Screen>
          <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.form}
        >
          <View style={[styles.formInner, { padding: theme.spacing.md }]}>
            <AppText variant="body" color="secondary" style={styles.hint}>
              Enter the invite code you received
            </AppText>
            <TextInput
              value={enteredCode}
              onChangeText={setEnteredCode}
              placeholder={t("groups.inviteCode")}
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                  marginTop: theme.spacing.sm,
                  marginBottom: theme.spacing.md,
                },
              ]}
            />
            <Button
              label={t("groups.joinGroup")}
              onPress={handleSubmitCode}
              disabled={!enteredCode.trim()}
            />
          </View>
        </KeyboardAvoidingView>
        </Screen>
      </ScreenWithHeader>
    );
  }

  if (joinMutation.isPending) {
    return (
      <ScreenWithHeader title={t("groups.joinGroup")}>
        <Screen>
          <QueryLoadingView message={t("groups.joining")} />
        </Screen>
      </ScreenWithHeader>
    );
  }

  if (joinMutation.isError) {
    return (
      <ScreenWithHeader title={t("groups.joinGroup")}>
        <Screen>
          <QueryErrorView
            message={joinMutation.error?.message ?? t("groups.failedJoinGroup")}
            onRetry={() => joinMutation.mutate(code)}
          />
        </Screen>
      </ScreenWithHeader>
    );
  }

  return (
    <ScreenWithHeader title={t("groups.joinGroup")}>
      <Screen>
        <QueryLoadingView message={t("groups.redirecting")} />
      </Screen>
    </ScreenWithHeader>
  );
}

const styles = StyleSheet.create({
  form: {
    flex: 1,
  },
  formInner: {
    flex: 1,
  },
  hint: {
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
});
