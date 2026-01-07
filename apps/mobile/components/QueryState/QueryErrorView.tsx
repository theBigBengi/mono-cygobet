// components/QueryState/QueryErrorView.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

interface QueryErrorViewProps {
  message: string;
  onRetry?: () => void;
  extraActions?: React.ReactNode;
}

export function QueryErrorView({
  message,
  onRetry,
  extraActions,
}: QueryErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>{message}</Text>

      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      ) : null}

      {extraActions}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
