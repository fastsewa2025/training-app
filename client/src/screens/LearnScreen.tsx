import React, { useState } from "react";
import {
  View, StyleSheet, FlatList, ScrollView,
  Pressable, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { CourseCard } from "@/components/CourseCard";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { key: "all", icon: "grid" },
  { key: "safety", icon: "shield" },
  { key: "basics", icon: "book" },
  { key: "tools", icon: "tool" },
  { key: "discipline", icon: "clock" },
  { key: "electrical", icon: "zap" },
  { key: "plumbing", icon: "droplet" },
  { key: "masonry", icon: "layers" },
  { key: "equipment", icon: "settings" },
] as const;

interface CourseItem {
  id: string;
  slug: string;
  title: string;
  titleHi?: string;
  description: string;
  category: string;
  difficulty: string;
  thumbnailUrl?: string;
  durationMinutes: number;
  enrolled: boolean;
  completionPercent: number;
}

export default function LearnScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();

  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { data: courses = [], isLoading, refetch, isRefetching } = useQuery<CourseItem[]>({
    queryKey: ["courses", activeCategory],
    queryFn: () =>
      apiClient.get<CourseItem[]>(
        activeCategory === "all"
          ? "/api/v1/courses"
          : `/api/v1/courses?category=${activeCategory}`
      ),
    staleTime: 2 * 60 * 1000,
  });

  const { data: stats } = useQuery<{
    coursesEnrolled: number;
    modulesCompleted: number;
    certificatesEarned: number;
  }>({
    queryKey: ["stats"],
    queryFn: () => apiClient.get("/api/v1/progress/stats"),
  });

  const getTitle = (c: CourseItem) =>
    i18n.language === "hi" && c.titleHi ? c.titleHi : c.title;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={courses}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <>
            {/* Greeting */}
            <View style={styles.header}>
              <ThemedText type="h2">
                {t("hello", { name: user?.displayName?.split(" ")[0] || "Worker" })}
              </ThemedText>
            </View>

            {/* Stats row */}
            {stats && (
              <View style={styles.statsRow}>
                {[
                  { label: t("coursesEnrolled"), value: stats.coursesEnrolled, icon: "book-open" },
                  { label: t("modulesCompleted"), value: stats.modulesCompleted, icon: "check-circle" },
                  { label: t("certificates"), value: stats.certificatesEarned, icon: "award" },
                ].map((s) => (
                  <View key={s.label} style={[styles.statBox, { backgroundColor: theme.backgroundDefault }]}>
                    <Feather name={s.icon as any} size={20} color={Colors.light.primary} />
                    <ThemedText type="h3">{s.value}</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
                      {s.label}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

            {/* Category filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}
              style={styles.catContainer}
            >
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => setActiveCategory(cat.key)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? Colors.light.primary : theme.backgroundDefault,
                        borderColor: active ? Colors.light.primary : theme.border,
                      },
                    ]}
                  >
                    <Feather
                      name={cat.icon as any}
                      size={14}
                      color={active ? "#fff" : theme.textSecondary}
                    />
                    <ThemedText
                      style={[
                        styles.catText,
                        { color: active ? "#fff" : theme.text },
                      ]}
                    >
                      {cat.key === "all" ? t("allCategories") : t(cat.key as any)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ThemedText type="h3" style={styles.sectionTitle}>
              {t("continueLearning")}
            </ThemedText>
          </>
        }
        renderItem={({ item }) => (
          <CourseCard
            course={{ ...item, title: getTitle(item) }}
            onPress={() => navigation.navigate("CourseDetail", { courseId: item.id })}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              size="large"
              color={Colors.light.primary}
              style={{ marginTop: 60 }}
            />
          ) : (
            <View style={styles.empty}>
              <ThemedText style={{ fontSize: 48 }}>📚</ThemedText>
              <ThemedText type="h4">{t("noCoursesYet")}</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, textAlign: "center" }}>
                {t("browseCourses")}
              </ThemedText>
            </View>
          )
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  statsRow: { flexDirection: "row", paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.lg },
  statBox: {
    flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md,
    alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  catContainer: { marginBottom: Spacing.md },
  catScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1,
    minHeight: 36,
  },
  catText: { ...Typography.small, fontWeight: "600" },
  sectionTitle: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  empty: { alignItems: "center", gap: Spacing.md, paddingTop: 60 },
});
