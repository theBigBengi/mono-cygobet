import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export default function ModalScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppText variant="title">Modal</AppText>
      <Link href="/" dismissTo style={styles.link}>
        <AppText variant="body" color="primary">Go to home screen</AppText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
