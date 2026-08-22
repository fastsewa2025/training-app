import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle } from "react-native";
import { ThemedText } from "./ThemedText";
import { Colors } from "@/constants/theme";

interface Props {
  percent: number;           // 0–100
  height?: number;
  color?: string;
  showLabel?: boolean;
  style?: ViewStyle;
  animate?: boolean;
}

export function ProgressBar({
  percent,
  height = 8,
  color = Colors.light.primary,
  showLabel = false,
  style,
  animate = true,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      Animated.timing(anim, {
        toValue: Math.min(Math.max(percent, 0), 100),
        duration: 600,
        useNativeDriver: false,
      }).start();
    } else {
      anim.setValue(Math.min(Math.max(percent, 0), 100));
    }
  }, [percent]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={style}>
      {showLabel && (
        <View style={styles.labelRow}>
          <ThemedText type="small" style={{ fontWeight: "600" }}>Progress</ThemedText>
          <ThemedText type="small" style={{ color, fontWeight: "700" }}>
            {Math.round(percent)}%
          </ThemedText>
        </View>
      )}
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <Animated.View
          style={[
            styles.fill,
            { width, height, borderRadius: height / 2, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  track: { backgroundColor: "#E5E7EB", overflow: "hidden" },
  fill: {},
});
