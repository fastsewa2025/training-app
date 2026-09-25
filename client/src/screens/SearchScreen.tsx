import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { CourseCard } from "@/components/CourseCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { apiClient } from "@/lib/api";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/types";
import type { Course } from "@/types";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const POPULAR_SEARCHES = [
  "PPE", "Safety helmet", "Fire", "Electrical",
  "Plumbing", "Masonry", "First aid", "Tools",
];

export default function SearchScreen() {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: courses = [], isFetching } = useQuery<Course[]>({
    queryKey: ["search", submitted],
    queryFn: () => apiClient.get<Course[]>("/api/v1/courses"),
    enabled: true,
    staleTime: 5 * 60_000,
    select: (all) =>
      submitted
        ? all.filter(
            (c) =>
              c.title.toLowerCase().includes(submitted.toLowerCase()) ||
              (c.titleHi || "").includes(submitted) ||
              c.category.toLowerCase().includes(submitted.toLowerCase()) ||
              c.description.toLowerCase().includes(submitted.toLowerCase())
          )
        : [],
  });

  const doSearch = useCallback((q: string) => {
    Keyboard.dismiss();
    setSubmitted(q.trim());
  }, []);

  const getTitle = (c: Course) =>
    i18n.language === "hi" && c.titleHi ? c.titleHi : c.title;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}>
      {/* Search input */}
      <View style={[styles.searchRow, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={[styles.inputWrap, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Feather name="search" size={16} color={theme.textSecondary} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Search courses…"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => doSearch(query)}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); setSubmitted(""); }}>
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
        {query.length > 0 && (
          <Pressable style={styles.searchBtn} onPress={() => doSearch(query)}>
            <ThemedText style={{ color: Colors.light.primary, fontWeight: "700" }}>Search</ThemedText>
          </Pressable>
        )}
      </View>

      <FlatList
        data={courses}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          submitted === "" ? (
            <View>
              <ThemedText type="h4" style={styles.sectionTitle}>Popular Searches</ThemedText>
              <View style={styles.chipsRow}>
                {POPULAR_SEARCHES.map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.chip, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
                    onPress={() => { setQuery(s); doSearch(s); }}
                  >
                    <Feather name="trending-up" size={12} color={Colors.light.primary} />
                    <ThemedText type="small">{s}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : isFetching ? (
            <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 40 }} />
          ) : (
            <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {courses.length} result{courses.length !== 1 ? "s" : ""} for “{submitted}”
            </ThemedText>
          )
        }
        ListEmptyComponent={
          submitted !== "" && !isFetching ? (
            <EmptyState
              emoji="🔍"
              title="No courses found"
              subtitle={`No results for "${submitted}". Try a different keyword.`}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <CourseCard
            course={{ ...item, title: getTitle(item) }}
            onPress={() => navigation.navigate("CourseDetail", { courseId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { padding: Spacing.xs },
  inputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    paddingHorizontal: Spacing.md, height: 42,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15 },
  searchBtn: { paddingHorizontal: Spacing.sm },
  list: { padding: Spacing.lg, paddingBottom: 80 },
  sectionTitle: { fontWeight: "700", marginBottom: Spacing.md },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
});
