import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface Props {
  emoji: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, subtitle, actionLabel, onAction }: Props) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      <ThemedText type="h4" style={styles.title}>{title}</ThemedText>
      {subtitle && (
        <ThemedText style={[styles.sub, { color: theme.textSecondary }]}>
          {subtitle}
        </ThemedText>
      )}
      {actionLabel && onAction && (
        <Pressable
          style={[styles.btn, { backgroundColor: Colors.light.primary }]}
          onPress={onAction}
        >
          <ThemedText style={styles.btnText}>{actionLabel}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center", paddingTop: 64,
    paddingHorizontal: Spacing["2xl"], gap: Spacing.sm,
  },
  emoji: { fontSize: 56, marginBottom: Spacing.xs },
  title: { textAlign: "center" },
  sub: { textAlign: "center", lineHeight: 22, fontSize: 14 },
  btn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
