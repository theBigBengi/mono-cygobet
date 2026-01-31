// app/profile/head-to-head.tsx
// Head-to-head comparison route. Reads opponentId from query params.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { HeadToHeadScreen } from "@/features/profile/head-to-head/screens/HeadToHeadScreen";
import { GroupGamesHeader } from "@/features/groups/predictions/components/GroupGamesHeader";
import { useAuth } from "@/lib/auth/useAuth";

function parseNum(value: string | string[] | undefined): number | null {
  const s = Array.isArray(value) ? value[0] : value;
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function HeadToHeadRoute() {
  const params = useLocalSearchParams<{ opponentId?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const opponentId = parseNum(params.opponentId);
  const userId = user?.id ?? 0;

  return (
    <View style={styles.container}>
      <GroupGamesHeader
        backOnly
        onBack={() => router.back()}
      />
      <View style={styles.content}>
        <HeadToHeadScreen
          userId={userId}
          initialOpponentId={opponentId}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
