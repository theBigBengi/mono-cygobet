// features/groups/chat/components/MentionPicker.tsx
// Dropdown picker for @mentions — members and fixtures with section headers, icons, empty state, close button.

import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, SectionList, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
import { AppText } from "@/components/ui";

export interface MentionOption {
  type: "user" | "fixture";
  id: number;
  display: string;
  image?: string | null;
}

interface MentionPickerProps {
  query: string;
  members: MentionOption[];
  fixtures: MentionOption[];
  onSelect: (option: MentionOption) => void;
  onClose: () => void;
}

const ICON_SIZE = 20;
const AVATAR_SIZE = 28;

function OptionRow({
  item,
  onPress,
  theme,
}: {
  item: MentionOption;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const isUser = item.type === "user";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          gap: theme.spacing.ms,
        },
        { backgroundColor: pressed ? theme.colors.background : "transparent" },
      ]}
    >
      {item.image ? (
        <Image
          source={item.image}
          style={styles.optionAvatar}
          cachePolicy="disk"
        />
      ) : (
        <View
          style={[
            styles.optionIconWrap,
            { backgroundColor: theme.colors.border },
          ]}
        >
          <MaterialIcons
            name={isUser ? "person" : "sports-soccer"}
            size={ICON_SIZE}
            color={theme.colors.textSecondary}
          />
        </View>
      )}
      <AppText variant="body" style={styles.optionDisplay} numberOfLines={1}>
        {item.display}
      </AppText>
    </Pressable>
  );
}

export function MentionPicker({
  query,
  members,
  fixtures,
  onSelect,
  onClose,
}: MentionPickerProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const sections = useMemo(() => {
    const q = query.toLowerCase();
    const matchedMembers = members.filter((m) =>
      m.display.toLowerCase().includes(q)
    );
    const matchedFixtures = fixtures.filter((f) =>
      f.display.toLowerCase().includes(q)
    );
    const result: { title: string; data: MentionOption[] }[] = [];
    if (matchedMembers.length > 0) {
      result.push({
        title: t("chat.mentionMembers"),
        data: matchedMembers.slice(0, 6),
      });
    }
    if (matchedFixtures.length > 0) {
      result.push({
        title: t("chat.mentionGames"),
        data: matchedFixtures.slice(0, 6),
      });
    }
    return result;
  }, [query, members, fixtures, t]);

  const hasQuery = query.length >= 0;
  const showEmpty = hasQuery && sections.length === 0;

  const renderSectionHeader = useCallback(
    ({ section: { title } }: { section: { title: string } }) => (
      <View
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.xs,
          backgroundColor: theme.colors.cardBackground,
        }}
      >
        <AppText
          variant="caption"
          style={[
            styles.sectionTitle,
            { color: theme.colors.textSecondary },
          ]}
        >
          {title}
        </AppText>
      </View>
    ),
    [theme],
  );

  const renderMentionItem = useCallback(
    ({ item }: { item: MentionOption }) => (
      <OptionRow
        item={item}
        onPress={() => onSelect(item)}
        theme={theme}
      />
    ),
    [onSelect, theme],
  );

  return (
    <View
      style={[
        {
          maxHeight: 260,
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          backgroundColor: theme.colors.surface,
        },
        getShadowStyle("md"),
      ]}
    >
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: theme.spacing.ms,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
      }}>
        <AppText variant="caption" color="secondary" style={styles.headerTitle}>
          @
        </AppText>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={({ pressed }) => [
            { padding: theme.spacing.xs },
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialIcons
            name="close"
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>
      {showEmpty ? (
        <View style={{ paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.md, alignItems: "center" }}>
          <AppText variant="body" color="secondary" style={styles.emptyText}>
            {t("chat.noMentionResults")}
          </AppText>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          keyboardShouldPersistTaps="always"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderMentionItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  optionIconWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  optionDisplay: {
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
  },
});
