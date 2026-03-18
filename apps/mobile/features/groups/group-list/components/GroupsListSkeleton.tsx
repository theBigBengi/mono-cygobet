// features/groups/group-list/components/GroupsListSkeleton.tsx
// Skeleton loading state for the groups list tab.
// Extracted from app/(tabs)/groups.tsx to reduce file size and isolate loading UI.

import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Screen } from "@/components/ui";
import { useTheme, CARD_BORDER_BOTTOM_WIDTH, getShadowStyle } from "@/lib/theme";

export function GroupsListSkeleton() {
  const { theme } = useTheme();
  const skeletonColor = theme.colors.border;

  const skeletonOpacity = useSharedValue(0.5);
  React.useEffect(() => {
    skeletonOpacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true
    );
  }, [skeletonOpacity]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen
        scroll={false}
        contentContainerStyle={{
          alignItems: "stretch",
          flex: 1,
          padding: 0,
        }}
      >
        <Animated.View style={pulseStyle}>
          {/* Header skeleton */}
          <View
            style={[
              styles.header,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <View style={styles.headerTop}>
              <View
                style={{
                  width: 100,
                  height: 28,
                  backgroundColor: skeletonColor,
                  borderRadius: 8,
                }}
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: skeletonColor,
                    borderRadius: 14,
                  }}
                />
                <View
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: skeletonColor,
                    borderRadius: 14,
                  }}
                />
              </View>
            </View>
            {/* Search bar skeleton */}
            <View
              style={{
                height: 40,
                backgroundColor: skeletonColor,
                borderRadius: 14,
                marginTop: 10,
              }}
            />
          </View>

          {/* Filter tabs skeleton */}
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 10,
              gap: 8,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            {[70, 85, 60, 55, 60].map((w, i) => (
              <View
                key={i}
                style={{
                  width: w,
                  height: 32,
                  backgroundColor:
                    i === 0
                      ? theme.colors.primary + "20"
                      : skeletonColor,
                  borderRadius: 16,
                }}
              />
            ))}
          </View>

          {/* Cards skeleton */}
          <View style={{ paddingTop: 12 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 12,
                  borderRadius: 18,
                  ...getShadowStyle("sm"),
                }}
              >
                <View
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 18,
                    paddingTop: 14,
                    paddingHorizontal: 14,
                    overflow: "hidden",
                  }}
                >
                  {/* Top row skeleton */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    {/* Avatar */}
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        backgroundColor: skeletonColor,
                      }}
                    />
                    {/* Info */}
                    <View style={{ flex: 1, gap: 8 }}>
                      <View
                        style={{
                          width: "75%",
                          height: 18,
                          backgroundColor: skeletonColor,
                          borderRadius: 6,
                        }}
                      />
                      <View
                        style={{
                          width: 100,
                          height: 24,
                          backgroundColor: skeletonColor,
                          borderRadius: 8,
                        }}
                      />
                    </View>
                    {/* Right badges */}
                    <View style={{ gap: 6, alignItems: "center" }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: skeletonColor,
                        }}
                      />
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: skeletonColor,
                        }}
                      />
                    </View>
                  </View>

                  {/* Next game skeleton */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 14,
                      marginHorizontal: -14,
                      paddingHorizontal: 14,
                      paddingTop: 14,
                      paddingBottom: 12,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    <View style={{ flex: 1, gap: 6 }}>
                      <View
                        style={{
                          width: 100,
                          height: 12,
                          backgroundColor: skeletonColor,
                          borderRadius: 4,
                        }}
                      />
                      <View
                        style={{
                          width: 150,
                          height: 16,
                          backgroundColor: skeletonColor,
                          borderRadius: 4,
                        }}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <View style={{ alignItems: "center", gap: 2 }}>
                        <View
                          style={{
                            width: 20,
                            height: 10,
                            backgroundColor: skeletonColor,
                            borderRadius: 3,
                          }}
                        />
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 7,
                            backgroundColor: skeletonColor,
                            borderWidth: 1,
                            borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
                            borderColor: theme.colors.border,
                          }}
                        />
                      </View>
                      <View style={{ alignItems: "center", gap: 2 }}>
                        <View
                          style={{
                            width: 20,
                            height: 10,
                            backgroundColor: skeletonColor,
                            borderRadius: 3,
                          }}
                        />
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 7,
                            backgroundColor: skeletonColor,
                            borderWidth: 1,
                            borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
                            borderColor: theme.colors.border,
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Stats HUD skeleton */}
                  <View
                    style={{
                      flexDirection: "row",
                      paddingVertical: 12,
                      gap: 4,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    {[1, 2, 3].map((j) => (
                      <View
                        key={j}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          paddingVertical: 6,
                        }}
                      >
                        <View
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            backgroundColor: skeletonColor,
                          }}
                        />
                        <View
                          style={{
                            width: 28,
                            height: 14,
                            borderRadius: 4,
                            backgroundColor: skeletonColor,
                          }}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 0,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
