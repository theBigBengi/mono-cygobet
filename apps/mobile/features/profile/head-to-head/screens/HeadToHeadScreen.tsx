// features/profile/head-to-head/screens/HeadToHeadScreen.tsx
// Full screen: selector + summary + shared groups list.

import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Screen } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useHeadToHeadQuery, useH2HOpponentsQuery } from "@/features/profile/profile.queries";
import { OpponentSelector } from "../components/OpponentSelector";
import { H2HSummaryCard } from "../components/H2HSummaryCard";
import { SharedGroupRow } from "../components/SharedGroupRow";
import { Card, AppText, Divider } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface HeadToHeadScreenProps {
  userId: number;
  initialOpponentId?: number | null;
}

export function HeadToHeadScreen({
  userId,
  initialOpponentId = null,
}: HeadToHeadScreenProps) {
  const { theme } = useTheme();
  const [opponentId, setOpponentId] = useState<number | null>(
    initialOpponentId ?? null
  );

  const opponentsQuery = useH2HOpponentsQuery(userId);
  const h2hQuery = useHeadToHeadQuery(userId, opponentId);

  const opponents = opponentsQuery.data?.data?.opponents ?? [];
  const data = h2hQuery.data?.data;

  useEffect(() => {
    if (initialOpponentId != null && initialOpponentId !== opponentId) {
      setOpponentId(initialOpponentId);
    }
  }, [initialOpponentId]);

  useEffect(() => {
    if (
      opponentId == null &&
      opponents.length > 0 &&
      opponentsQuery.isSuccess
    ) {
      setOpponentId(opponents[0].id);
    }
  }, [opponents, opponentsQuery.isSuccess, opponentId]);

  if (opponentsQuery.isLoading) {
    return (
      <Screen>
        <QueryLoadingView message="Loading..." />
      </Screen>
    );
  }

  if (opponentsQuery.isError) {
    return (
      <Screen>
        <QueryErrorView
          message="Failed to load opponents"
          onRetry={() => void opponentsQuery.refetch()}
        />
      </Screen>
    );
  }

  if (opponents.length === 0) {
    return (
      <Screen>
        <View style={[styles.content, { padding: theme.spacing.md }]}>
          <Card>
            <AppText variant="body" color="secondary">
              Join a group with other players to compare stats.
            </AppText>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { padding: theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <OpponentSelector
          opponents={opponents}
          selectedOpponentId={opponentId}
          onSelectOpponent={setOpponentId}
        />

        {opponentId != null && (
          <>
            {h2hQuery.isLoading && (
              <QueryLoadingView message="Loading comparison..." />
            )}
            {h2hQuery.isError && (
              <QueryErrorView
                message="Failed to load comparison"
                onRetry={() => void h2hQuery.refetch()}
              />
            )}
            {h2hQuery.isSuccess && data && (
              <>
                <H2HSummaryCard
                  userLabel={data.user.username ?? "You"}
                  opponentLabel={data.opponent.username ?? "Opponent"}
                  userWins={data.summary.userWins}
                  opponentWins={data.summary.opponentWins}
                  ties={data.summary.ties}
                  userTotalPoints={data.summary.userTotalPoints}
                  opponentTotalPoints={data.summary.opponentTotalPoints}
                  userExactScores={data.summary.userExactScores}
                  opponentExactScores={data.summary.opponentExactScores}
                  userAccuracy={data.summary.userAccuracy}
                  opponentAccuracy={data.summary.opponentAccuracy}
                />
                <Card>
                  <AppText variant="subtitle" style={styles.groupsTitle}>
                    By Group
                  </AppText>
                  {data.sharedGroups.map((group, i) => (
                    <View key={group.groupId}>
                      {i > 0 && (
                        <Divider
                          style={{ marginVertical: theme.spacing.sm }}
                        />
                      )}
                      <SharedGroupRow
                        group={group}
                        userLabel={data.user.username ?? "You"}
                        opponentLabel={data.opponent.username ?? "Opponent"}
                      />
                    </View>
                  ))}
                  {data.sharedGroups.length === 0 && (
                    <AppText variant="body" color="secondary">
                      No shared groups
                    </AppText>
                  )}
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  groupsTitle: {
    marginBottom: 12,
  },
});
