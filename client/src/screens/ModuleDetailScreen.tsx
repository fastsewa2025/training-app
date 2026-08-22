import React from "react";
import {
  View, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { apiClient } from "@/lib/api";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RoutePropType = RouteProp<RootStackParamList, "ModuleDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ModuleDetailScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavProp>();

  const { moduleId } = route.params;

  const { data: module, isLoading } = useQuery({
    queryKey: ["module", moduleId],
    queryFn: () => apiClient.get<any>(`/api/v1/courses/module/${moduleId}`),
  });

  const { data: progress } = useQuery({
    queryKey: ["module-progress", moduleId],
    queryFn: () => apiClient.get<any[]>(`/api/v1/progress/lesson?moduleId=${moduleId}`),
  });

  if (isLoading || !module) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  const progressMap = new Map((progress || []).map((p: any) => [p.lessonId, p]));
  const lessons = module.lessons || [];
  const completedCount = lessons.filter((l: any) => progressMap.get(l.id)?.completed).length;

  const CONTENT_ICONS: Record<string, string> = {
    video: "play-circle",
    text: "file-text",
    image: "image",
    quiz: "help-circle",
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="h2">
            {i18n.language === "hi" && module.titleHi ? module.titleHi : module.title}
          </ThemedText>
          {module.description && (
            <ThemedText style={{ color: theme.textSecondary, marginTop: 6 }}>
              {i18n.language === "hi" && module.descriptionHi ? module.descriptionHi : module.description}
            </ThemedText>
          )}

          {/* Progress */}
          <View style={styles.progressRow}>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: lessons.length > 0 ? `${(completedCount / lessons.length) * 100}%` : "0%",
                    backgroundColor: Colors.light.primary,
                  },
                ]}
              />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {completedCount}/{lessons.length}
            </ThemedText>
          </View>
        </View>

        {/* Lessons */}
        <View style={styles.lessons}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Lessons</ThemedText>
          {lessons.map((lesson: any, idx: number) => {
            const prog = progressMap.get(lesson.id);
            const done = prog?.completed;
            const lessonTitle = i18n.language === "hi" && lesson.titleHi ? lesson.titleHi : lesson.title;

            return (
              <Pressable
                key={lesson.id}
                style={[
                  styles.lessonRow,
                  {
                    backgroundColor: done ? Colors.light.success + "15" : theme.backgroundDefault,
                    borderColor: done ? Colors.light.success : theme.border,
                  },
                ]}
                onPress={() => navigation.navigate("LessonDetail", { lessonId: lesson.id })}
              >
                <View
                  style={[
                    styles.lessonIcon,
                    { backgroundColor: done ? Colors.light.success : Colors.light.primary + "20" },
                  ]}
                >
                  <Feather
                    name={(CONTENT_ICONS[lesson.contentType] || "file") as any}
                    size={18}
                    color={done ? "#fff" : Colors.light.primary}
                  />
                </View>
                <View style={styles.lessonInfo}>
                  <ThemedText style={{ fontWeight: "600", flex: 1 }} numberOfLines={2}>
                    {lessonTitle}
                  </ThemedText>
                  <View style={styles.lessonMeta}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, textTransform: "capitalize" }}>
                      {lesson.contentType}
                    </ThemedText>
                    {lesson.videoDurationSeconds && (
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        · {Math.ceil(lesson.videoDurationSeconds / 60)} min
                      </ThemedText>
                    )}
                    {prog?.videoProgressSeconds > 0 && !done && (
                      <ThemedText type="caption" style={{ color: Colors.light.warning }}>
                        · {t("continueModule")}
                      </ThemedText>
                    )}
                  </View>
                </View>
                {done ? (
                  <Feather name="check-circle" size={22} color={Colors.light.success} />
                ) : (
                  <Feather name="chevron-right" size={22} color={theme.textSecondary} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Take Quiz button if all required lessons done */}
        {completedCount === lessons.length && lessons.length > 0 && (
          <View style={styles.quizSection}>
            <View style={[styles.quizBanner, { backgroundColor: Colors.light.primary + "15" }]}>
              <ThemedText style={{ fontSize: 32 }}>🎯</ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText type="h4">{t("quizTitle")}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Complete the quiz to earn your certificate
                </ThemedText>
              </View>
            </View>
            <Pressable
              style={[styles.quizBtn, { backgroundColor: Colors.light.primary }]}
              onPress={() => navigation.navigate("Quiz", { moduleId })}
            >
              <Feather name="help-circle" size={20} color="#fff" />
              <ThemedText style={styles.quizBtnText}>{t("quizTitle")}</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 100 },
  header: { padding: Spacing.lg, gap: Spacing.md },
  progressRow: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: 4,
  },
  progressBar: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  lessons: { paddingHorizontal: Spacing.lg },
  lessonRow: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  lessonIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  lessonInfo: { flex: 1 },
  lessonMeta: { flexDirection: "row", gap: 4, marginTop: 2 },
  quizSection: { padding: Spacing.lg, gap: Spacing.md },
  quizBanner: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    padding: Spacing.lg, borderRadius: BorderRadius.md,
  },
  quizBtn: {
    height: 56, borderRadius: BorderRadius.full,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  quizBtnText: { ...Typography.body, fontWeight: "700", color: "#fff" },
});
