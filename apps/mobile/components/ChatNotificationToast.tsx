// components/ChatNotificationToast.tsx
// In-app toast notification for new chat messages.
// Slides down from top, auto-dismisses, tap navigates to chat.

import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAtom } from "jotai";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import {
  chatNotificationAtom,
  type ChatNotification,
} from "@/lib/state/chatNotification.atom";

const TOAST_DURATION_MS = 4000;
const SLIDE_DURATION_MS = 300;
const DISMISS_THRESHOLD = -40;

export function ChatNotificationToast() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notification, setNotification] = useAtom(chatNotificationAtom);

  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentNotification = useRef<ChatNotification | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: SLIDE_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: SLIDE_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start(() => {
      currentNotification.current = null;
      setNotification(null);
    });
  }, [translateY, opacity, setNotification]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) {
          translateY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < DISMISS_THRESHOLD) {
          dismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!notification) return;

    currentNotification.current = notification;

    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: SLIDE_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(dismiss, TOAST_DURATION_MS);

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
  }, [notification, translateY, opacity, dismiss]);

  const handlePress = useCallback(() => {
    const n = currentNotification.current;
    if (!n) return;
    dismiss();
    router.push(`/groups/${n.groupId}/chat`);
  }, [dismiss, router]);

  if (!notification) return null;

  const truncatedBody =
    notification.body.length > 60
      ? notification.body.slice(0, 60) + "…"
      : notification.body;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 4,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[
          styles.toast,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.textPrimary,
          },
        ]}
      >
        {/* Avatar */}
        {notification.senderImage ? (
          <Image
            source={{ uri: notification.senderImage }}
            style={styles.avatar}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.avatarInitial, { color: theme.colors.primaryText }]}
            >
              {(notification.senderName?.charAt(0) || "?").toUpperCase()}
            </AppText>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <AppText
              variant="caption"
              style={[styles.groupName, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {notification.groupName}
            </AppText>
          </View>
          <AppText
            variant="body"
            style={[styles.senderName, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {notification.senderName}
          </AppText>
          <AppText
            variant="caption"
            style={{ color: theme.colors.textSecondary }}
            numberOfLines={1}
          >
            {truncatedBody}
          </AppText>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 1,
  },
  groupName: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 1,
  },
});
