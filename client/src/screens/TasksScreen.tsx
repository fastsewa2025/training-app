import React, { useState, useMemo } from "react";
import {
  View, StyleSheet, FlatList, Pressable,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { apiClient } from "@/lib/api";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/types";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface LessonTask {
  lessonId: string;
  lessonTitle: string;
  lessonTitleHi?: string;
  moduleTitle: string;
  moduleTitleHi?: string;
  courseTitle: string;
  courseTitleHi?: string;
  contentType: string;
  completed: boolean;
  moduleId: string;
}

const CONTENT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  video: "play-circle",
  text: "file-text",
  image: "image",
  quiz: "help-circle",
};

const CONTENT_COLOR: Record<string, string> = {
  video: "#dbeafe",
  text: "#f3f4f6",
  image: "#fce7f3",
  quiz: "#fef9c3",
};

export default function TasksScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");

  // Fetch all courses (enrolled ones will have enrolled=true)
  const {
    data: courses = [],
    isLoading: coursesLoading,
    refetch: refetchCourses,
    isRefetching,
  } = useQuery<any[]>({
    queryKey: ["enrolled-courses"],
    queryFn: () => apiClient.get<any[]>("/api/v1/progress/enrolled-courses"),
    staleTime: 60_000,
  });

  // Fetch all lesson progress
  const { data: allProgress = [], refetch: refetchProgress } = useQuery<any[]>({
    queryKey: ["all-lesson-progress"],
    queryFn: () => apiClient.get<any[]>("/api/v1/progress/all-lessons"),
    staleTime: 30_000,
  });

  const refetch = () => { refetchCourses(); refetchProgress(); };

  const progressMap = useMemo(
    () => new Map(allProgress.map((p: any) => [p.lessonId, p])),
    [allProgress]
  );

  // Build flat task list from enrolled courses only
  const tasks = useMemo<LessonTask[]>(() => {
    const result: LessonTask[] = [];
    for (const course of courses) {
      
      for (const mod of course.modules || []) {
        for (const lesson of mod.lessons || []) {
          result.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonTitleHi: lesson.titleHi,
            moduleTitle: mod.title,
            moduleTitleHi: mod.titleHi,
            courseTitle: course.title,
            courseTitleHi: course.titleHi,
            contentType: lesson.contentType,
            completed: progressMap.get(lesson.id)?.completed ?? false,
            moduleId: mod.id,
          });
        }
      }
    }
    return result;
  }, [courses, progressMap]);

  const filtered = useMemo(() => {
    if (filter === "todo") return tasks.filter((t) => !t.completed);
    if (filter === "done") return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, filter]);

  const doneCnt = tasks.filter((t) => t.completed).length;
  const todoCnt = tasks.length - doneCnt;
  const pct = tasks.length > 0 ? Math.round((doneCnt / tasks.length) * 100) : 0;

  const markMut = useMutation({
    mutationFn: (lessonId: string) =>
      apiClient.post("/api/v1/progress/lesson", { lessonId, completed: true }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["all-lesson-progress"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const getTitle = (en: string, hi?: string) =>
    i18n.language === "hi" && hi ? hi : en;

  const FILTERS: Array<{ key: "all" | "todo" | "done"; label: string; count: number }> = [
    { key: "all", label: "All", count: tasks.length },
    { key: "todo", label: "To Do", count: todoCnt },
    { key: "done", label: "Done", count: doneCnt },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.lessonId}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.light.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Title */}
            <ThemedText type="h2">{t("tasks")}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, marginTop: 2 }}>
              {t("tasksDone", { done: doneCnt, total: tasks.length })}
            </ThemedText>

            {/* Overall progress */}
            {tasks.length > 0 && (
              <ProgressBar
                percent={pct}
                showLabel
                style={{ marginTop: Spacing.md }}
              />
            )}

            {/* Filter tabs */}
            <View style={styles.filterRow}>
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[
                      styles.filterTab,
                      {
                        backgroundColor: active ? Colors.light.primary : theme.backgroundDefault,
                        borderColor: active ? Colors.light.primary : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.filterText,
                        { color: active ? "#fff" : theme.textSecondary },
                      ]}
                    >
                      {f.label}{" "}
                      <ThemedText
                        style={[
                          styles.filterCount,
                          { color: active ? "rgba(255,255,255,0.7)" : theme.border },
                        ]}
                      >
                        {f.count}
                      </ThemedText>
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const iconBg = CONTENT_COLOR[item.contentType] || "#f3f4f6";
          const icon = CONTENT_ICONS[item.contentType] || "file";
          return (
            <Pressable
              style={[
                styles.taskRow,
                {
                  backgroundColor: item.completed
                    ? Colors.light.success + "10"
                    : theme.backgroundDefault,
                  borderColor: item.completed
                    ? Colors.light.success + "40"
                    : theme.border,
                },
              ]}
              onPress={() =>
                navigation.navigate("LessonDetail", { lessonId: item.lessonId })
              }
            >
              {/* Checkbox */}
              <Pressable
                hitSlop={12}
                disabled={item.completed || markMut.isPending}
                onPress={() => !item.completed && markMut.mutate(item.lessonId)}
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: item.completed ? Colors.light.success : "transparent",
                    borderColor: item.completed ? Colors.light.success : theme.border,
                  },
                ]}
              >
                {item.completed && <Feather name="check" size={13} color="#fff" />}
              </Pressable>

              {/* Content type icon */}
              <View style={[styles.typeIcon, { backgroundColor: iconBg }]}>
                <Feather name={icon} size={16} color={Colors.light.primary} />
              </View>

              {/* Text */}
              <View style={styles.taskInfo}>
                <ThemedText
                  style={[
                    styles.taskTitle,
                    item.completed && {
                      textDecorationLine: "line-through",
                      color: theme.textSecondary,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {getTitle(item.lessonTitle, item.lessonTitleHi)}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {getTitle(item.courseTitle, item.courseTitleHi)}
                  {" · "}
                  {getTitle(item.moduleTitle, item.moduleTitleHi)}
                </ThemedText>
              </View>

              <Feather name="chevron-right" size={16} color={theme.border} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          coursesLoading ? (
            <ActivityIndicator
              size="large"
              color={Colors.light.primary}
              style={{ marginTop: 60 }}
            />
          ) : tasks.length === 0 ? (
            <EmptyState
              emoji="📋"
              title={t("noTasks")}
              subtitle={t("noTasksDesc")}
            />
          ) : (
            <EmptyState
              emoji={filter === "done" ? "🎉" : "✅"}
              title={filter === "done" ? "No completed tasks yet" : "All tasks done!"}
              subtitle={
                filter === "done"
                  ? "Complete lessons to see them here"
                  : "You've finished everything. Great work! 🎉"
              }
            />
          )
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  filterTab: {
    flex: 1,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: { ...Typography.small, fontWeight: "600" },
  filterCount: { ...Typography.caption },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  taskInfo: { flex: 1 },
  taskTitle: { ...Typography.body, fontWeight: "600" },
});
