import React, { useState } from "react";
import {
  View, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { apiClient } from "@/lib/api";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RoutePropType = RouteProp<RootStackParamList, "Quiz">;

export default function QuizScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { moduleId } = route.params;

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz", moduleId],
    queryFn: () => apiClient.get<any>(`/api/v1/quiz/module/${moduleId}`),
  });

  const submitMut = useMutation({
    mutationFn: (ans: number[]) =>
      apiClient.post(`/api/v1/quiz/${data.quiz.id}/submit`, { answers: ans }),
    onSuccess: (res: any) => {
      setResult(res);
      qc.invalidateQueries({ queryKey: ["module-progress"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      Haptics.notificationAsync(
        res.passed
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    },
  });

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (result) return; // locked after submit
    Haptics.selectionAsync();
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmit = () => {
    if (!data) return;
    const ansArr = data.questions.map((_: any, i: number) => answers[i] ?? -1);
    submitMut.mutate(ansArr);
  };

  if (isLoading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  const allAnswered = data.questions.every((_: any, i: number) => answers[i] !== undefined);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="h2">{t("quizTitle")}</ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>
            {data.quiz.title} · Pass: {data.quiz.passingScore}%
          </ThemedText>
        </View>

        {/* Result banner */}
        {result && (
          <View
            style={[
              styles.resultBanner,
              {
                backgroundColor: result.passed
                  ? Colors.light.success + "20"
                  : Colors.light.error + "20",
              },
            ]}
          >
            <ThemedText style={styles.resultEmoji}>
              {result.passed ? "🎉" : "😔"}
            </ThemedText>
            <View style={{ flex: 1 }}>
              <ThemedText type="h3" style={{ color: result.passed ? Colors.light.success : Colors.light.error }}>
                {result.passed
                  ? t("quizPassed", { score: result.score })
                  : t("quizFailed", { score: result.score, passing: result.passingScore })}
              </ThemedText>
              {result.passed && (
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Certificate unlocked! Check your Profile.
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {/* Questions */}
        {data.questions.map((q: any, qIdx: number) => {
          const fb = result?.feedback?.[qIdx];
          const qText = i18n.language === "hi" && q.questionHi ? q.questionHi : q.question;
          const opts: string[] =
            i18n.language === "hi" && q.optionsHi ? q.optionsHi : q.options;

          return (
            <View key={q.id} style={[styles.questionCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 4 }}>
                {t("question", { current: qIdx + 1, total: data.questions.length })}
              </ThemedText>
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
                {qText}
              </ThemedText>

              {opts.map((opt, optIdx) => {
                const selected = answers[qIdx] === optIdx;
                const isCorrect = result && fb?.correctAnswer === optIdx;
                const isWrong = result && selected && !fb?.isCorrect;

                let bg = theme.backgroundSecondary;
                let border = theme.border;
                if (selected && !result) { bg = Colors.light.primary + "20"; border = Colors.light.primary; }
                if (isCorrect) { bg = Colors.light.success + "20"; border = Colors.light.success; }
                if (isWrong) { bg = Colors.light.error + "20"; border = Colors.light.error; }

                return (
                  <Pressable
                    key={optIdx}
                    onPress={() => handleSelect(qIdx, optIdx)}
                    style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}
                  >
                    <View style={[styles.optionDot, { borderColor: border, backgroundColor: selected || isCorrect ? border : "transparent" }]}>
                      {(selected || isCorrect) && (
                        <View style={[styles.optionDotInner, { backgroundColor: border }]} />
                      )}
                    </View>
                    <ThemedText style={{ flex: 1 }}>{opt}</ThemedText>
                    {result && isCorrect && <Feather name="check" size={16} color={Colors.light.success} />}
                    {result && isWrong && <Feather name="x" size={16} color={Colors.light.error} />}
                  </Pressable>
                );
              })}

              {/* Explanation */}
              {result && fb?.explanation && (
                <View style={[styles.explanation, { backgroundColor: theme.backgroundSecondary }]}>
                  <Feather name="info" size={14} color={theme.textSecondary} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                    {i18n.language === "hi" && fb.explanationHi ? fb.explanationHi : fb.explanation}
                  </ThemedText>
                </View>
              )}
            </View>
          );
        })}

        {/* Submit / retry */}
        {!result ? (
          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: allAnswered ? Colors.light.primary : theme.border },
            ]}
            onPress={handleSubmit}
            disabled={!allAnswered || submitMut.isPending}
          >
            {submitMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.submitText}>{t("submitQuiz")}</ThemedText>
            )}
          </Pressable>
        ) : (
          <View style={styles.resultActions}>
            {!result.passed && (
              <Pressable
                style={[styles.submitBtn, { backgroundColor: Colors.light.primary }]}
                onPress={() => { setResult(null); setAnswers({}); }}
              >
                <Feather name="refresh-cw" size={18} color="#fff" />
                <ThemedText style={styles.submitText}>{t("tryAgain")}</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={[styles.submitBtn, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => navigation.goBack()}
            >
              <ThemedText style={[styles.submitText, { color: theme.text }]}>
                ← Back to Module
              </ThemedText>
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
  scroll: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  header: { gap: 4 },
  resultBanner: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    padding: Spacing.lg, borderRadius: BorderRadius.md,
  },
  resultEmoji: { fontSize: 36 },
  questionCard: {
    padding: Spacing.lg, borderRadius: BorderRadius.md, gap: Spacing.sm,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  optionBtn: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1.5,
    minHeight: 52,
  },
  optionDot: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  optionDotInner: { width: 10, height: 10, borderRadius: 5 },
  explanation: {
    flexDirection: "row", gap: Spacing.sm, padding: Spacing.md,
    borderRadius: BorderRadius.xs, marginTop: 4,
  },
  submitBtn: {
    height: 56, borderRadius: BorderRadius.full,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  submitText: { ...Typography.body, fontWeight: "700", color: "#fff" },
  resultActions: { gap: Spacing.md },
});
