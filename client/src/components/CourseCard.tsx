import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTranslation } from "react-i18next";

const CAT_EMOJI: Record<string, string> = {
  safety: "🦺",
  basics: "🧱",
  tools: "🔨",
  discipline: "⏰",
  electrical: "⚡",
  plumbing: "🔧",
  masonry: "🏗️",
  equipment: "⚙️",
};

const CAT_COLOR: Record<string, string> = {
  safety: "#E74C3C",
  basics: "#3498DB",
  tools: "#F39C12",
  discipline: "#9B59B6",
  electrical: "#F1C40F",
  plumbing: "#1ABC9C",
  masonry: "#E67E22",
  equipment: "#2ECC71",
};

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    durationMinutes: number;
    enrolled: boolean;
    completionPercent: number;
  };
  onPress: () => void;
}

export function CourseCard({ course, onPress }: CourseCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const catColor = CAT_COLOR[course.category] || Colors.light.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${course.title}, ${course.category} course`}
    >
      {/* Colour strip + emoji */}
      <View style={[styles.strip, { backgroundColor: catColor + "25" }]}>
        <ThemedText style={styles.emoji}>{CAT_EMOJI[course.category] || "📚"}</ThemedText>
        <View style={[styles.catBadge, { backgroundColor: catColor }]}>
          <ThemedText style={styles.catText}>{t(course.category as any)}</ThemedText>
        </View>
      </View>

      <View style={styles.body}>
        <ThemedText type="h4" numberOfLines={2}>{course.title}</ThemedText>
        <ThemedText
          type="small"
          numberOfLines={2}
          style={{ color: theme.textSecondary, marginTop: 2 }}
        >
          {course.description}
        </ThemedText>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {course.durationMinutes} min
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Feather name="bar-chart-2" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, textTransform: "capitalize" }}>
              {t(course.difficulty as any)}
            </ThemedText>
          </View>
          {course.enrolled && (
            <View style={[styles.enrolledBadge, { backgroundColor: Colors.light.success + "20" }]}>
              <Feather name="check" size={10} color={Colors.light.success} />
              <ThemedText type="caption" style={{ color: Colors.light.success, fontWeight: "600" }}>
                {t("enrolled")}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Progress bar */}
        {course.enrolled && (
          <View style={styles.progressRow}>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${course.completionPercent}%`, backgroundColor: Colors.light.primary },
                ]}
              />
            </View>
            <ThemedText type="caption" style={{ color: Colors.light.primary, fontWeight: "600" }}>
              {Math.round(course.completionPercent)}%
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  strip: {
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  emoji: { fontSize: 44 },
  catBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  catText: { ...Typography.caption, color: "#fff", fontWeight: "700" },
  body: { padding: Spacing.md, gap: Spacing.xs },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.xs,
    flexWrap: "wrap",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  enrolledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
});
