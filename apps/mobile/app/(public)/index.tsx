// app/(public)/index.tsx
// Public "home" screen:
// - Never calls protected endpoints.
// - Shows "Go to Login" for guests, "Go to Profile" for authed users.
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/useAuth";

export default function PublicIndex() {
  const router = useRouter();
  const { status } = useAuth();

  const handleGoToLogin = () => {
    router.push("/(auth)/login" as any);
  };

  const handleGoToProfile = () => {
    router.push("/(protected)/profile" as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>This is the public home screen</Text>

      {status === "guest" && (
        <Pressable style={styles.button} onPress={handleGoToLogin}>
          <Text style={styles.buttonText}>Go to Login</Text>
        </Pressable>
      )}

      {status === "authed" && (
        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={handleGoToProfile}
        >
          <Text style={styles.buttonText}>Go to Profile</Text>
        </Pressable>
      )}
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
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#555",
  },
});
