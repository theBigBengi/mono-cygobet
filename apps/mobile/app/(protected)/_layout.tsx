// app/(protected)/_layout.tsx
import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "@/lib/auth/useAuth";

export default function ProtectedLayout() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (status === "guest") {
    return <Redirect href={"/(auth)/login" as any} />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
