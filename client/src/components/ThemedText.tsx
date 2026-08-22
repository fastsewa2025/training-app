import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

interface ThemedTextProps extends TextProps {
  type?: "h1" | "h2" | "h3" | "h4" | "body" | "small" | "caption";
}

export function ThemedText({ type = "body", style, ...props }: ThemedTextProps) {
  const { theme } = useTheme();
  return (
    <Text
      style={[{ color: theme.text }, Typography[type], style]}
      {...props}
    />
  );
}
