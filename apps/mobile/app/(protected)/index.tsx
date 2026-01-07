// app/(protected)/index.tsx
// Protected home screen:
// - Entry point for authenticated + onboarded users.
// - Kept intentionally simple; domain data should come from feature hooks.
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function ProtectedHomeScreen() {
  const router = useRouter();

  const handleGoToProfile = () => {
    router.push("/(protected)/profile" as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Protected home screen</Text>

      <Pressable style={styles.button} onPress={handleGoToProfile}>
        <Text style={styles.buttonText}>Go to Profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});


