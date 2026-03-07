// features/group-creation/components/CreateSheetSkeletons.tsx
// Extracted skeleton renderers from CreateGroupFlow.tsx

import React from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

type SkeletonType = "list" | "grid" | "fixtureList" | "fixtureGrid";

interface CreateSheetSkeletonsProps {
  type: SkeletonType;
  pulseStyle: any;
  skeletonColor: string;
}

export function CreateSheetSkeletons({ type, pulseStyle, skeletonColor }: CreateSheetSkeletonsProps) {
  switch (type) {
    case "list":
      return (
        <Animated.View style={pulseStyle}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: skeletonColor }} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ width: "60%", height: 14, borderRadius: 6, backgroundColor: skeletonColor }} />
                <View style={{ width: "35%", height: 10, borderRadius: 4, backgroundColor: skeletonColor }} />
              </View>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: skeletonColor }} />
            </View>
          ))}
        </Animated.View>
      );

    case "grid":
      return (
        <Animated.View style={[pulseStyle, { flexDirection: "row", flexWrap: "wrap", gap: 10 }]}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={{ width: "48%", padding: 12, borderRadius: 10, backgroundColor: skeletonColor + "30", gap: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: skeletonColor }} />
              <View style={{ width: "70%", height: 12, borderRadius: 5, backgroundColor: skeletonColor }} />
              <View style={{ width: "45%", height: 10, borderRadius: 4, backgroundColor: skeletonColor }} />
            </View>
          ))}
        </Animated.View>
      );

    case "fixtureList":
      return (
        <Animated.View style={pulseStyle}>
          {Array.from({ length: 5 }, (_, i) => (
            <View key={i} style={{ marginBottom: 10, gap: 4 }}>
              <View style={{ width: "45%", height: 10, borderRadius: 4, backgroundColor: skeletonColor, marginBottom: 4 }} />
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: skeletonColor }} />
                    <View style={{ width: "50%", height: 13, borderRadius: 5, backgroundColor: skeletonColor }} />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: skeletonColor }} />
                    <View style={{ width: "45%", height: 13, borderRadius: 5, backgroundColor: skeletonColor }} />
                  </View>
                </View>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: skeletonColor }} />
              </View>
            </View>
          ))}
        </Animated.View>
      );

    case "fixtureGrid":
      return (
        <Animated.View style={[pulseStyle, { flexDirection: "row", flexWrap: "wrap", gap: 10 }]}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={{ width: "48%", padding: 10, borderRadius: 10, backgroundColor: skeletonColor + "30", gap: 6 }}>
              <View style={{ width: 28, height: 9, borderRadius: 3, backgroundColor: skeletonColor }} />
              <View style={{ width: "50%", height: 9, borderRadius: 3, backgroundColor: skeletonColor }} />
              <View style={{ gap: 4, marginTop: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: skeletonColor }} />
                  <View style={{ width: "55%", height: 11, borderRadius: 4, backgroundColor: skeletonColor }} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: skeletonColor }} />
                  <View style={{ width: "50%", height: 11, borderRadius: 4, backgroundColor: skeletonColor }} />
                </View>
              </View>
            </View>
          ))}
        </Animated.View>
      );
  }
}
