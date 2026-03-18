import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme";

/**
 * Skeleton layout that mirrors the real GroupGamesScreen.
 * Dimensions match MatchPredictionCardVertical exactly.
 */

const SKELETON_CARDS = [0, 1, 2, 3, 4];

export function GroupGamesSkeleton({ cardLayout = "vertical" }: { cardLayout?: "vertical" | "horizontal" }) {
  const { theme } = useTheme();
  const c = theme.colors.border;
  const bg = theme.colors.textSecondary + "12";

  const opacity = useSharedValue(0.5);
  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (cardLayout === "horizontal") {
    return (
      <Animated.View style={pulse}>
        {SKELETON_CARDS.map((ci) => (
          <View key={ci} style={s.hOuter}>
            {/* Left: time col — matches width:30 */}
            <View style={s.hLeftCol}>
              <View style={[s.bar, { width: 24, height: 9, backgroundColor: c }]} />
              <View style={[s.bar, { width: 20, height: 9, backgroundColor: c, marginTop: 2 }]} />
            </View>

            {/* Center: hRow — matches flex:1, height:50, borderRadius:8, paddingHorizontal:8, gap:6 */}
            <View style={[s.hRow, { backgroundColor: bg }]}>
              {/* Home: logo 18 + name flex + result 18 */}
              <View style={[s.hLogo, { backgroundColor: c }]} />
              <View style={[s.bar, { width: 36 + (ci % 3) * 14, height: 11, backgroundColor: c }]} />
              <View style={{ flex: 1 }} />
              {/* ScoreInputPair: digitSlot(14x22) + sep + digitSlot(14x22) ≈ 32x22 */}
              <View style={[s.bar, { width: 14, height: 18, borderRadius: 4, backgroundColor: c }]} />
              <View style={[s.bar, { width: 4, height: 4, borderRadius: 2, backgroundColor: c }]} />
              <View style={[s.bar, { width: 14, height: 18, borderRadius: 4, backgroundColor: c }]} />
              <View style={{ flex: 1 }} />
              <View style={[s.bar, { width: 32 + (ci % 3) * 16, height: 11, backgroundColor: c }]} />
              <View style={[s.hLogo, { backgroundColor: c }]} />
            </View>

            {/* Right: status col — matches width:30 */}
            <View style={s.hRightCol}>
              <View style={[{ width: 18, height: 18, borderRadius: 9, backgroundColor: c }]} />
            </View>
          </View>
        ))}
      </Animated.View>
    );
  }

  // ── Vertical ──
  return (
    <Animated.View style={pulse}>
      {SKELETON_CARDS.map((ci) => (
        <View key={ci} style={s.vOuter}>
          {/* Left: statusCol w:42 → statusBox 42x42 br:6 */}
          <View style={[s.vStatusBox, { backgroundColor: c + "30" }]}>
            <View style={[s.bar, { width: 20, height: 15, backgroundColor: c }]} />
            <View style={[s.bar, { width: 16, height: 9, backgroundColor: c }]} />
          </View>

          {/* Center: cardContent flex:1, borderRadius:8, pv:6, ph:8 */}
          <View style={[s.vCard, { backgroundColor: bg }]}>
            {/* Home: teamRow(row, gap:0) → matchPressable(flex:1, row, gap:8) [teamPressable(flex:1) + resultColumn(w:36)] + predictionColumn(w:36) */}
            <View style={s.vTeamRow}>
              <View style={s.vMatchPressable}>
                <View style={s.vTeamPressable}>
                  <View style={[s.vLogo, { backgroundColor: c }]} />
                  <View style={[s.bar, { flex: 1, height: 12, maxWidth: 80 + (ci % 3) * 25, backgroundColor: c }]} />
                </View>
                <View style={s.vResultCol} />
              </View>
              <View style={s.vScoreCol}>
                <View style={[s.vScore, { backgroundColor: c }]} />
              </View>
            </View>
            {/* Away */}
            <View style={s.vTeamRow}>
              <View style={s.vMatchPressable}>
                <View style={s.vTeamPressable}>
                  <View style={[s.vLogo, { backgroundColor: c }]} />
                  <View style={[s.bar, { flex: 1, height: 12, maxWidth: 70 + (ci % 3) * 20, backgroundColor: c }]} />
                </View>
                <View style={s.vResultCol} />
              </View>
              <View style={s.vScoreCol}>
                <View style={[s.vScore, { backgroundColor: c }]} />
              </View>
            </View>
          </View>

          {/* Right: statusCol w:42 — check/plus circle */}
          <View style={s.vRightCol}>
            <View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: c }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bar: { borderRadius: 3 },

  /* ── Vertical (matches MatchPredictionCardVertical default) ── */
  // outerRow: marginBottom: 8
  vOuter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10, // cardRow gap
    marginBottom: 8,
  },
  // statusBox: 42x42 br:6
  vStatusBox: {
    width: 42,
    height: 42,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  // cardContent + hRowBorder: flex:1 br:14 pv:6 ph:8
  vCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  // teamRow(row, gap:0) → matchPressable(flex:1, row, gap:8) [teamPressable(flex:1) + resultColumn(w:36)] + predictionColumn(w:36)
  vTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 22,
    gap: 0,
    marginBottom: 4,
  },
  // matchPressable: flex:1, row, gap:8
  vMatchPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // teamPressable: flex:1, row, gap:10
  vTeamPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  vLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  // resultColumn w:36 (empty spacer for actual result)
  vResultCol: {
    width: 36,
  },
  // predictionColumn w:36
  vScoreCol: {
    width: 36,
    alignItems: "center",
  },
  // ScoreInput: 28x18 br:6
  vScore: {
    width: 28,
    height: 18,
    borderRadius: 6,
  },
  // right statusCol w:42
  vRightCol: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Horizontal (matches MatchPredictionCardVertical horizontal) ── */
  // outerRow mb:8, cardRow row gap:10
  hOuter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  // left time col w:30
  hLeftCol: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  // hRow: flex:1, h:50, br:14, ph:8, gap:6
  hRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 8,
    gap: 6,
  },
  // TeamLogo size:18
  hLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  // right col w:30
  hRightCol: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});
