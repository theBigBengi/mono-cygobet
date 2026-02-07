// features/groups/group-lobby/components/LobbyPredictionsCTA.tsx
// Primary CTA for predictions - next game (optional), progress bar, and CTA button.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatKickoffDate, formatKickoffTime } from "@/utils/fixture";

export interface LobbyPredictionsCTANextGame {
  homeTeam: { name: string; imagePath: string | null };
  awayTeam: { name: string; imagePath: string | null };
  kickoffAt: string;
}

export interface LobbyPredictionsCTAProps {
  predictionsCount: number;
  totalFixtures: number;
  onPress: () => void;
  nextGame?: LobbyPredictionsCTANextGame | null;
  isLoading?: boolean;
}

const LOGO_SIZE = 40;

export function LobbyPredictionsCTA({
  predictionsCount,
  totalFixtures,
  onPress,
  nextGame,
  isLoading = false,
}: LobbyPredictionsCTAProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const progress =
    totalFixtures > 0 ? Math.min(1, predictionsCount / totalFixtures) : 0;
  const hasNextGame = nextGame != null;

  const kickoffLabel = hasNextGame
    ? `${formatKickoffDate(nextGame.kickoffAt)} ${formatKickoffTime(nextGame.kickoffAt)}`
    : "";

  if (isLoading) {
    return (
      <View style={[styles.wrapper, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.content}>
          <View style={styles.teamsRow}>
            <View
              style={[
                styles.skeletonLogo,
                { backgroundColor: theme.colors.border },
              ]}
            />
            <View
              style={[
                styles.skeletonVs,
                { backgroundColor: theme.colors.border },
              ]}
            />
            <View
              style={[
                styles.skeletonLogo,
                { backgroundColor: theme.colors.border },
              ]}
            />
          </View>
          <View
            style={[
              styles.skeletonText,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <View
            style={[styles.track, { backgroundColor: theme.colors.border }]}
          />
          <View
            style={[
              styles.skeletonButton,
              { backgroundColor: theme.colors.border },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.content}>
        {hasNextGame ? (
          <>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.sectionLabel}
            >
              {t("lobby.nextGameLabel")}
            </AppText>
            <View style={styles.teamsRow}>
              <View style={styles.teamBlock}>
                <View
                  style={[
                    styles.logoWrap,
                    { backgroundColor: theme.colors.background },
                  ]}
                >
                  <TeamLogo
                    imagePath={nextGame.homeTeam.imagePath}
                    teamName={nextGame.homeTeam.name}
                    size={LOGO_SIZE}
                  />
                </View>
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  style={[styles.teamName, { color: theme.colors.textPrimary }]}
                >
                  {nextGame.homeTeam.name}
                </AppText>
              </View>
              <AppText
                variant="body"
                style={[styles.vs, { color: theme.colors.textSecondary }]}
              >
                {t("lobby.vs")}
              </AppText>
              <View style={styles.teamBlock}>
                <View
                  style={[
                    styles.logoWrap,
                    { backgroundColor: theme.colors.background },
                  ]}
                >
                  <TeamLogo
                    imagePath={nextGame.awayTeam.imagePath}
                    teamName={nextGame.awayTeam.name}
                    size={LOGO_SIZE}
                  />
                </View>
                <AppText
                  variant="caption"
                  numberOfLines={1}
                  style={[styles.teamName, { color: theme.colors.textPrimary }]}
                >
                  {nextGame.awayTeam.name}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color="secondary" style={styles.kickoff}>
              {kickoffLabel}
            </AppText>
          </>
        ) : (
          <View style={styles.titleRow}>
            <MaterialIcons
              name="sports-soccer"
              size={24}
              color={theme.colors.primary}
            />
            <AppText
              variant="body"
              style={[styles.title, { color: theme.colors.textPrimary }]}
            >
              {t("groups.predictions")}
            </AppText>
          </View>
        )}

        <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${progress * 100}%`,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        </View>
        <View style={styles.progressLabel}>
          <View style={styles.progressRow}>
            <AppText variant="caption" color="secondary">
              {predictionsCount}/{totalFixtures}
            </AppText>
            <AppText variant="caption" color="secondary">
              {Math.round(progress * 100)}%
            </AppText>
          </View>
        </View>

        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: theme.colors.primary },
            pressed && styles.pressed,
          ]}
        >
          <AppText
            variant="body"
            style={[styles.ctaText, { color: theme.colors.primaryText }]}
          >
            {hasNextGame ? t("lobby.makePredictions") : t("lobby.viewAllGames")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  content: {
    padding: 16,
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 4,
  },
  teamBlock: {
    alignItems: "center",
    maxWidth: 100,
  },
  logoWrap: {
    width: LOGO_SIZE + 8,
    height: LOGO_SIZE + 8,
    borderRadius: (LOGO_SIZE + 8) / 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    overflow: "hidden",
  },
  teamName: {
    fontWeight: "600",
    textAlign: "center",
  },
  vs: {
    fontWeight: "700",
    fontSize: 14,
  },
  kickoff: {
    textAlign: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontWeight: "700",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ctaButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontWeight: "700",
  },
  skeletonLogo: {
    width: LOGO_SIZE + 8,
    height: LOGO_SIZE + 8,
    borderRadius: (LOGO_SIZE + 8) / 2,
  },
  skeletonVs: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  skeletonText: {
    width: 120,
    height: 14,
    borderRadius: 4,
    alignSelf: "center",
    marginVertical: 8,
  },
  skeletonButton: {
    height: 44,
    borderRadius: 10,
    marginTop: 12,
  },
});
