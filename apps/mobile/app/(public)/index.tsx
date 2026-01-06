// app/(public)/index.tsx
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/useAuth";

export default function PublicIndex() {
  const { status } = useAuth();
  const router = useRouter();

  const handleGoToAccount = () => {
    if (status === "guest") {
      router.push("/(auth)/login" as any);
    } else {
      router.push("/(protected)/account" as any);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Public Screen</Text>
      <Pressable style={styles.button} onPress={handleGoToAccount}>
        <Text style={styles.buttonText}>Go to Account</Text>
      </Pressable>
      {status === "guest" && (
        <Text style={styles.hint}>You&apos;ll be redirected to login</Text>
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
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
});
