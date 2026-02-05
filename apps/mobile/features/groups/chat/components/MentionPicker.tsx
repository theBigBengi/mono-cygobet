// features/groups/chat/components/MentionPicker.tsx
// Dropdown picker for @mentions — members and fixtures with section headers, icons, empty state, close button.

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, SectionList, Pressable, StyleSheet, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
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
        styles.option,
        { backgroundColor: pressed ? theme.colors.border : "transparent" },
      ]}
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={styles.optionAvatar}
          accessibilityIgnoresInvertColors
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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <AppText variant="caption" color="secondary" style={styles.headerTitle}>
          @
        </AppText>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={({ pressed }) => [
            styles.closeButton,
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
        <View style={styles.emptyWrap}>
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
          renderSectionHeader={({ section: { title } }) => (
            <View
              style={[
                styles.sectionHeader,
                { backgroundColor: theme.colors.surface },
              ]}
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
          )}
          renderItem={({ item }) => (
            <OptionRow
              item={item}
              onPress={() => onSelect(item)}
              theme={theme}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 260,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
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
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
  },
});
