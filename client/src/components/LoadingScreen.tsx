import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";

interface Props {
  message?: string;
}

export function LoadingScreen({ message }: Props) {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
      {message && (
        <ThemedText style={{ color: theme.textSecondary, marginTop: 16 }}>
          {message}
        </ThemedText>
      )}
    </View>
  );
}

export function InlineLoader() {
  return (
    <View style={styles.inline}>
      <ActivityIndicator size="small" color={Colors.light.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  inline: { padding: 40, alignItems: "center" },
});
