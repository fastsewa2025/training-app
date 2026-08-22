import React from "react";
import {
  View, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";

interface CertItem {
  id: string;
  certificateNumber: string;
  courseTitle: string;
  courseTitleHi?: string;
  courseCategory: string;
  earnedAt: string;
}

const CAT_COLORS: Record<string, string> = {
  safety: "#E74C3C", basics: "#3498DB", tools: "#F39C12",
  discipline: "#9B59B6", electrical: "#F1C40F", plumbing: "#1ABC9C",
  masonry: "#E67E22", equipment: "#2ECC71",
};

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const { theme } = useTheme();

  const { data: certs = [], isLoading: certsLoading } = useQuery<CertItem[]>({
    queryKey: ["certificates"],
    queryFn: () => apiClient.get("/api/v1/certificates"),
  });

  const { data: stats } = useQuery<{
    modulesCompleted: number;
    lessonsCompleted: number;
    certificatesEarned: number;
    coursesEnrolled: number;
  }>({
    queryKey: ["stats"],
    queryFn: () => apiClient.get("/api/v1/progress/stats"),
  });

  const downloadMut = useMutation({
    mutationFn: (certId: string) =>
      apiClient.get<{ url: string }>(`/api/v1/certificates/${certId}/pdf`),
    onSuccess: (_data, certId) => {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/v1/certificates/${certId}/pdf`;
      Linking.openURL(url);
    },
  });

  const handleLogout = () => {
    Alert.alert(t("logout"), "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: t("logout"), style: "destructive", onPress: logout },
    ]);
  };

  const handleLangSwitch = (lang: "en" | "hi") => {
    updateProfile({ preferredLang: lang });
    i18n.changeLanguage(lang);
  };

  const memberDate = user?.createdAt
    ? new Date(user.createdAt as any).toLocaleDateString("en-IN", {
        month: "short", year: "numeric",
      })
    : "";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: Colors.light.primary }]}>
            <ThemedText style={styles.avatarInitial}>
              {user?.displayName?.[0]?.toUpperCase() || "W"}
            </ThemedText>
          </View>
          <ThemedText type="h2">{user?.displayName}</ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>@{user?.username}</ThemedText>
          {memberDate && (
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {t("memberSince", { date: memberDate })}
            </ThemedText>
          )}
          {user?.role !== "worker" && (
            <View style={[styles.roleBadge, { backgroundColor: Colors.light.primary + "20" }]}>
              <ThemedText type="caption" style={{ color: Colors.light.primary, fontWeight: "700", textTransform: "uppercase" }}>
                {user?.role}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsGrid}>
            {[
              { label: t("coursesEnrolled"), value: stats.coursesEnrolled, icon: "book-open" },
              { label: t("modulesCompleted"), value: stats.modulesCompleted, icon: "check-circle" },
              { label: t("certificates"), value: stats.certificatesEarned, icon: "award" },
            ].map((s) => (
              <View key={s.label} style={[styles.statBox, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name={s.icon as any} size={22} color={Colors.light.primary} />
                <ThemedText type="h2">{s.value}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
                  {s.label}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Language */}
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4" style={styles.sectionTitle}>{t("language")}</ThemedText>
          <View style={styles.langRow}>
            {(["en", "hi"] as const).map((lang) => (
              <Pressable
                key={lang}
                onPress={() => handleLangSwitch(lang)}
                style={[
                  styles.langBtn,
                  {
                    backgroundColor:
                      i18n.language === lang ? Colors.light.primary : theme.backgroundSecondary,
                    borderColor:
                      i18n.language === lang ? Colors.light.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.langText,
                    { color: i18n.language === lang ? "#fff" : theme.text },
                  ]}
                >
                  {lang === "en" ? "🇬🇧 English" : "🇮🇳 हिन्दी"}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Certificates */}
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.sectionHeader}>
            <Feather name="award" size={20} color={Colors.light.primary} />
            <ThemedText type="h4">{t("certificates")}</ThemedText>
          </View>

          {certsLoading ? (
            <ActivityIndicator color={Colors.light.primary} style={{ padding: Spacing.lg }} />
          ) : certs.length === 0 ? (
            <View style={styles.emptyCerts}>
              <ThemedText style={{ fontSize: 40 }}>🏆</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, textAlign: "center" }}>
                {t("completeCourses")}
              </ThemedText>
            </View>
          ) : (
            certs.map((cert) => {
              const catColor = CAT_COLORS[cert.courseCategory] || Colors.light.primary;
              const certTitle =
                i18n.language === "hi" && cert.courseTitleHi ? cert.courseTitleHi : cert.courseTitle;
              return (
                <View
                  key={cert.id}
                  style={[styles.certCard, { borderLeftColor: catColor, borderLeftWidth: 4 }]}
                >
                  <View style={[styles.certIcon, { backgroundColor: catColor }]}>
                    <Feather name="award" size={18} color="#fff" />
                  </View>
                  <View style={styles.certInfo}>
                    <ThemedText style={{ fontWeight: "600" }} numberOfLines={2}>
                      {certTitle}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {t("earnedOn", {
                        date: new Date(cert.earnedAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        }),
                      })}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {t("certNo", { number: cert.certificateNumber })}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => downloadMut.mutate(cert.id)}
                    style={[styles.downloadBtn, { backgroundColor: catColor + "20" }]}
                  >
                    <Feather name="download" size={16} color={catColor} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          style={[styles.logoutBtn, { borderColor: Colors.light.error }]}
        >
          <Feather name="log-out" size={18} color={Colors.light.error} />
          <ThemedText style={{ color: Colors.light.error, fontWeight: "600" }}>
            {t("logout")}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  avatarSection: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.lg },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "700", color: "#fff" },
  roleBadge: {
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderRadius: BorderRadius.full, marginTop: 4,
  },
  statsGrid: { flexDirection: "row", gap: Spacing.sm },
  statBox: {
    flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md,
    alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  section: {
    borderRadius: BorderRadius.md, padding: Spacing.lg, gap: Spacing.md,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  sectionTitle: {},
  langRow: { flexDirection: "row", gap: Spacing.md },
  langBtn: {
    flex: 1, height: 48, borderRadius: BorderRadius.sm, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  langText: { ...Typography.body, fontWeight: "600" },
  emptyCerts: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.xl },
  certCard: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    backgroundColor: "transparent",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  certIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  certInfo: { flex: 1, gap: 2 },
  downloadBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  logoutBtn: {
    height: 52, borderRadius: BorderRadius.full, borderWidth: 1.5,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
});
