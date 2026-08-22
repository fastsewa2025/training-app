import React, { Component, ErrorInfo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "./ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.container}>
          <ThemedText style={styles.emoji}>⚠️</ThemedText>
          <ThemedText type="h3" style={styles.title}>Something went wrong</ThemedText>
          <ThemedText style={styles.msg} numberOfLines={4}>
            {this.state.error?.message || "Unknown error"}
          </ThemedText>
          <Pressable style={styles.btn} onPress={this.reset}>
            <ThemedText style={styles.btnText}>Try Again</ThemedText>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: Spacing["2xl"], gap: Spacing.md,
  },
  emoji: { fontSize: 52 },
  title: { textAlign: "center" },
  msg: {
    textAlign: "center", color: "#6B7280",
    fontSize: 13, lineHeight: 20,
  },
  btn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full, marginTop: Spacing.sm,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
