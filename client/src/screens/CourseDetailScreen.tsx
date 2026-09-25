import React from "react";
import {
  View, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { apiClient } from "@/lib/api";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RoutePropType = RouteProp<RootStackParamList, "CourseDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function CourseDetailScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavProp>();
  const qc = useQueryClient();

  const { courseId } = route.params;

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => apiClient.get<any>(`/api/v1/courses/${courseId}`),
  });

  const enrollMut = useMutation({
    mutationFn: () => apiClient.post(`/api/v1/courses/${courseId}/enroll`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  if (isLoading || !course) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  const title = i18n.language === "hi" && course.titleHi ? course.titleHi : course.title;
  const desc = i18n.language === "hi" && course.descriptionHi ? course.descriptionHi : course.description;
  const isEnrolled = !!course.enrollment;

  const DIFF_COLOR: Record<string, string> = {
    beginner: "#2ECC71",
    intermediate: "#F39C12",
    advanced: "#E74C3C",
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={[styles.heroBox, { backgroundColor: Colors.light.primary + "20" }]}>
          <ThemedText style={styles.heroEmoji}>
            {course.category === "safety" ? "🦺" :
              course.category === "electrical" ? "⚡" :
              course.category === "plumbing" ? "🔧" :
              course.category === "tools" ? "🔨" : "📚"}
          </ThemedText>
        </View>

        <View style={styles.content}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: Colors.light.primary + "20" }]}>
              <ThemedText style={[styles.badgeText, { color: Colors.light.primary }]}>
                {t(course.category as any)}
              </ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: DIFF_COLOR[course.difficulty] + "20" }]}>
              <ThemedText style={[styles.badgeText, { color: DIFF_COLOR[course.difficulty] }]}>
                {t(course.difficulty as any)}
              </ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="clock" size={12} color={theme.textSecondary} />
              <ThemedText style={[styles.badgeText, { color: theme.textSecondary }]}>
                {t("duration", { min: course.durationMinutes })}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="h2" style={styles.title}>{title}</ThemedText>
          <ThemedText style={[styles.desc, { color: theme.textSecondary }]}>{desc}</ThemedText>

          {/* Progress bar if enrolled */}
          {isEnrolled && (
            <View style={styles.progressSection}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <ThemedText style={{ ...Typography.small, fontWeight: "600" }}>Progress</ThemedText>
                <ThemedText style={{ ...Typography.small, color: Colors.light.primary }}>
                  {Math.round(course.enrollment.completionPercent)}%
                </ThemedText>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${course.enrollment.completionPercent}%`, backgroundColor: Colors.light.primary },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Enroll / enrolled button */}
          <Pressable
            style={[
              styles.enrollBtn,
              { backgroundColor: isEnrolled ? theme.backgroundSecondary : Colors.light.primary },
            ]}
            onPress={() => !isEnrolled && enrollMut.mutate()}
            disabled={isEnrolled || enrollMut.isPending}
          >
            {enrollMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather
                  name={isEnrolled ? "check-circle" : "plus-circle"}
                  size={20}
                  color={isEnrolled ? Colors.light.primary : "#fff"}
                />
                <ThemedText
                  style={[styles.enrollText, { color: isEnrolled ? Colors.light.primary : "#fff" }]}
                >
                  {isEnrolled ? t("enrolled") : t("enroll")}
                </ThemedText>
              </>
            )}
          </Pressable>

          {/* Modules list */}
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>Modules</ThemedText>
          {(course.modules || []).map((mod: any, idx: number) => (
            <Pressable
              key={mod.id}
              style={[styles.moduleRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
              onPress={() => isEnrolled && navigation.navigate("ModuleDetail", { moduleId: mod.id })}
              disabled={!isEnrolled}
            >
              <View style={[styles.modNumber, { backgroundColor: Colors.light.primary }]}>
                <ThemedText style={styles.modNumberText}>{idx + 1}</ThemedText>
              </View>
              <View style={styles.modInfo}>
                <ThemedText style={{ fontWeight: "600" }}>
                  {i18n.language === "hi" && mod.titleHi ? mod.titleHi : mod.title}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t("lessons", { count: mod.lessons?.length || 0 })}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 100 },
  heroBox: { height: 180, alignItems: "center", justifyContent: "center" },
  heroEmoji: { fontSize: 80 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  badges: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  badgeText: { ...Typography.caption, fontWeight: "600" },
  title: {},
  desc: { lineHeight: 22 },
  progressSection: { gap: Spacing.xs },
  progressBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  enrollBtn: {
    height: 56, borderRadius: BorderRadius.full,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  enrollText: { ...Typography.body, fontWeight: "700" },
  moduleRow: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  modNumber: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  modNumberText: { color: "#fff", fontWeight: "700" },
  modInfo: { flex: 1 },
});
