// app/groups/join.tsx
// Join a group by invite code.
// - With ?code=XXX (deep link): auto-joins.
// - Without code: shows form to enter code (for in-app / dev testing).

import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, AppText, Button } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useJoinGroupByCodeMutation } from "@/domains/groups";
import { useTheme } from "@/lib/theme";

export default function GroupJoinRoute() {
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
              placeholder="Invite code"
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
              label="Join group"
              onPress={handleSubmitCode}
              disabled={!enteredCode.trim()}
            />
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  if (joinMutation.isPending) {
    return (
      <Screen>
        <QueryLoadingView message="Joining..." />
      </Screen>
    );
  }

  if (joinMutation.isError) {
    return (
      <Screen>
        <QueryErrorView
          message={joinMutation.error?.message ?? "Failed to join group"}
          onRetry={() => joinMutation.mutate(code)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <QueryLoadingView message="Redirecting..." />
    </Screen>
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
