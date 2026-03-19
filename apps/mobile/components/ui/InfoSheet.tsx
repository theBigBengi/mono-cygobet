import React, { useCallback, useMemo, type ReactNode } from "react";
import { StyleSheet, View, Text, Pressable, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  useBottomSheet,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

interface InfoSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  snapPoints?: string[];
  enableDynamicSizing?: boolean;
  /** When true, renders children directly without BottomSheetScrollView wrapper */
  rawContent?: boolean;
  /** Optional title displayed as a header below the handle */
  headerTitle?: string;
  /** Show expand/close action arrows in header (without title) */
  showHeaderAction?: boolean;
  children: ReactNode;
}

const HANDLE_HEIGHT = 24;
const HEADER_HEIGHT = 25; // paddingTop 0 + paddingBottom 8 + fontSize 17

/** Header with animated action icon that changes based on snap index. */
function SheetHeader({ title, color, borderColor, secondaryColor }: { title?: string; color: string; borderColor: string; secondaryColor: string }) {
  const { animatedIndex, snapToIndex, close } = useBottomSheet();

  const chevronUpStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [0, 0.5], [1, 0], "clamp"),
  }));

  const chevronDownStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.value, [0.5, 1], [0, 1], "clamp"),
  }));

  const handleExpandPress = useCallback(() => {
    snapToIndex(1);
  }, [snapToIndex]);

  const handleClosePress = useCallback(() => {
    close();
  }, [close]);

  return (
    <View style={[styles.header, { borderBottomColor: borderColor }]}>
      {title ? <Text style={[styles.headerTitle, { color }]}>{title}</Text> : <View />}
      <View style={styles.headerAction}>
        <Animated.View style={[styles.headerIconAbsolute, chevronUpStyle]}>
          <Pressable onPress={handleExpandPress} style={({ pressed }) => pressed && { opacity: 0.5 }}>
            <Ionicons name="chevron-up" size={20} color={secondaryColor} />
          </Pressable>
        </Animated.View>
        <Animated.View style={[styles.headerIconAbsolute, chevronDownStyle]}>
          <Pressable onPress={handleClosePress} style={({ pressed }) => pressed && { opacity: 0.5 }}>
            <Ionicons name="chevron-down" size={20} color={secondaryColor} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

/** Wrapper that constrains content height to the current snap point position. */
function RawContentWrapper({ children, hasHeader }: { children: ReactNode; hasHeader: boolean }) {
  const { animatedPosition } = useBottomSheet();
  const { height: screenHeight } = useWindowDimensions();
  const extraOffset = HANDLE_HEIGHT + (hasHeader ? HEADER_HEIGHT : 0);

  const style = useAnimatedStyle(() => ({
    height: screenHeight - animatedPosition.value - extraOffset,
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export function InfoSheet({
  sheetRef,
  snapPoints: customSnapPoints,
  enableDynamicSizing = false,
  rawContent = false,
  headerTitle,
  showHeaderAction = false,
  children,
}: InfoSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(
    () => (enableDynamicSizing ? undefined : (customSnapPoints ?? ["50%"])),
    [customSnapPoints, enableDynamicSizing]
  );

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 16,
    }),
    [theme.colors.surfaceElevated, theme.radius.xl]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose
      enableContentPanningGesture={!rawContent}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary, width: 36, height: 4 }}
    >
      {(headerTitle || showHeaderAction) && (
        <SheetHeader
          title={headerTitle}
          color={theme.colors.textPrimary}
          borderColor={theme.colors.border}
          secondaryColor={theme.colors.textSecondary}
        />
      )}
      {rawContent ? (
        <RawContentWrapper hasHeader={!!headerTitle || showHeaderAction}>{children}</RawContentWrapper>
      ) : (
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.md) },
          ]}
        >
          {children}
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerAction: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconAbsolute: {
    position: "absolute",
  },
  content: {
    padding: 20,
  },
});
