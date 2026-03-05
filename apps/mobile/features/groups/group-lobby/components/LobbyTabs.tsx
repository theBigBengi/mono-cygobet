// features/groups/group-lobby/components/LobbyTabs.tsx
// Spotify-style tab bar with PagerView swipe between pages.

import React, { useCallback, useRef, useState } from "react";
import { View, StyleSheet, Pressable, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import PagerView from "react-native-pager-view";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export interface LobbyTab {
  key: string;
  label: string;
}

/* ─── Tab Bar ─── */

interface LobbyTabsBarProps {
  tabs: LobbyTab[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
}

function LobbyTabsBarInner({ tabs, activeIndex, onChangeIndex }: LobbyTabsBarProps) {
  const { theme } = useTheme();
  const indicatorLeft = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const [measured, setMeasured] = useState(false);
  const layouts = useRef<Record<number, { x: number; width: number }>>({});

  const moveIndicator = useCallback(
    (index: number, animate: boolean) => {
      const l = layouts.current[index];
      if (!l) return;
      if (animate) {
        indicatorLeft.value = withTiming(l.x, { duration: 200 });
        indicatorWidth.value = withTiming(l.width, { duration: 200 });
      } else {
        indicatorLeft.value = l.x;
        indicatorWidth.value = l.width;
      }
    },
    [indicatorLeft, indicatorWidth]
  );

  const handleLayout = useCallback(
    (index: number, e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      layouts.current[index] = { x, width };
      if (Object.keys(layouts.current).length === tabs.length && !measured) {
        setMeasured(true);
        moveIndicator(activeIndex, false);
      }
    },
    [tabs.length, measured, activeIndex, moveIndicator]
  );

  React.useEffect(() => {
    if (measured) moveIndicator(activeIndex, true);
  }, [activeIndex, measured, moveIndicator]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorLeft.value }],
    width: indicatorWidth.value,
  }));

  return (
    <View style={styles.bar}>
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChangeIndex(index)}
            onLayout={(e) => handleLayout(index, e)}
            style={styles.tab}
          >
            <AppText
              variant="label"
              style={[
                styles.tabText,
                {
                  color: isActive
                    ? theme.colors.textPrimary
                    : theme.colors.textSecondary,
                  fontWeight: isActive ? "700" : "500",
                },
              ]}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
      {measured && (
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: theme.colors.primary },
            indicatorStyle,
          ]}
        />
      )}
    </View>
  );
}

export const LobbyTabsBar = React.memo(LobbyTabsBarInner);

/* ─── Tab View (bar + PagerView) ─── */

export interface LobbyTabViewProps {
  tabs: LobbyTab[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  children: React.ReactNode[];
}

export function LobbyTabView({
  tabs,
  activeIndex,
  onChangeIndex,
  children,
}: LobbyTabViewProps) {
  const pagerRef = useRef<PagerView>(null);

  const handleTabPress = useCallback(
    (index: number) => {
      pagerRef.current?.setPage(index);
      onChangeIndex(index);
    },
    [onChangeIndex]
  );

  const handlePageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      onChangeIndex(e.nativeEvent.position);
    },
    [onChangeIndex]
  );

  return (
    <>
      <LobbyTabsBar
        tabs={tabs}
        activeIndex={activeIndex}
        onChangeIndex={handleTabPress}
      />
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={handlePageSelected}
      >
        {children.map((child, i) => (
          <View key={tabs[i]?.key ?? i} collapsable={false}>
            {child}
          </View>
        ))}
      </PagerView>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    gap: 24,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    position: "relative",
  },
  tab: {
    paddingBottom: 10,
  },
  tabText: {
    fontSize: 16,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 1.5,
  },
  pager: {
    flex: 1,
  },
});
