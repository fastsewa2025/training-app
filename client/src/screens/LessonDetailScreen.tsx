import React, { useEffect, useRef, useState } from "react";
import {
  View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { apiClient } from "@/lib/api";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RoutePropType = RouteProp<RootStackParamList, "LessonDetail">;

function getYouTubeEmbedUrl(url: string, startSeconds: number): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?/]+)/
  );
  const id = match?.[1];
  if (!id) return null;
  const start = startSeconds > 5 ? `&start=${Math.floor(startSeconds)}` : "";
  return `https://www.youtube.com/embed/${id}?playsinline=1&rel=0&modestbranding=1${start}`;
}

export default function LessonDetailScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { lessonId } = route.params;

  const videoProgress = useRef(0);
  const saveInterval = useRef<ReturnType<typeof setInterval>>();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiClient.get<any>(`/api/v1/courses/lesson/${lessonId}`),
  });

  const { data: resumeData } = useQuery({
    queryKey: ["lesson-progress", lessonId],
    queryFn: () => apiClient.get<any>(`/api/v1/progress/lesson/${lessonId}`),
    enabled: !!lesson,
  });

  const progressMut = useMutation({
    mutationFn: (data: { videoProgressSeconds?: number; completed?: boolean }) =>
      apiClient.post("/api/v1/progress/lesson", { lessonId, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson-progress", lessonId] });
      qc.invalidateQueries({ queryKey: ["module-progress"] });
    },
  });

  // Save video progress every 5 seconds
  useEffect(() => {
    if (lesson?.contentType === "video") {
      saveInterval.current = setInterval(() => {
        if (videoProgress.current > 0 && !resumeData?.completed) {
          progressMut.mutate({ videoProgressSeconds: videoProgress.current });
        }
      }, 5000);
    }
    return () => clearInterval(saveInterval.current);
  }, [lesson, resumeData?.completed]);

  const handleMarkComplete = () => {
    progressMut.mutate(
      { completed: true, videoProgressSeconds: videoProgress.current },
      {
        onSuccess: () => navigation.goBack(),
      }
    );
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "progress") videoProgress.current = data.seconds;
      if (data.type === "complete") {
        clearInterval(saveInterval.current);
        progressMut.mutate({ completed: true, videoProgressSeconds: videoProgress.current });
        qc.invalidateQueries({ queryKey: ["module-progress"] });
      }
    } catch {}
  };

  if (isLoading || !lesson) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  const isCompleted = !!resumeData?.completed;
  const resumeFrom = resumeData?.videoProgressSeconds || 0;
  const title = i18n.language === "hi" && lesson.titleHi ? lesson.titleHi : lesson.title;
  const content = i18n.language === "hi" && lesson.contentHi ? lesson.contentHi : lesson.content;

  const ytUrl =
    lesson.videoProvider === "youtube" && lesson.videoUrl
      ? getYouTubeEmbedUrl(lesson.videoUrl, resumeFrom)
      : null;

  const ytJS = `
    (function() {
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = function() {
        var p = new YT.Player('player', {
          events: {
            onStateChange: function(e) {
              if (e.data === YT.PlayerState.ENDED) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'complete' }));
              }
            }
          }
        });
        setInterval(function() {
          if (p && p.getCurrentTime) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'progress', seconds: Math.floor(p.getCurrentTime()) }));
          }
        }, 2000);
      };
    })(); true;
  `;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Video */}
        {lesson.contentType === "video" && ytUrl && (
          <View style={styles.videoContainer}>
            <WebView
              source={{ uri: ytUrl }}
              style={styles.video}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              injectedJavaScript={ytJS}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
            />
            {resumeFrom > 5 && !isCompleted && (
              <View style={[styles.resumeBanner, { backgroundColor: Colors.light.primary + "20" }]}>
                <Feather name="clock" size={14} color={Colors.light.primary} />
                <ThemedText type="small" style={{ color: Colors.light.primary }}>
                  Resuming from {Math.floor(resumeFrom / 60)}:{String(resumeFrom % 60).padStart(2, "0")}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Direct video (Cloudinary/S3) */}
        {lesson.contentType === "video" && lesson.videoProvider !== "youtube" && lesson.videoUrl && (
          <View style={styles.videoContainer}>
            <WebView
              source={{ uri: lesson.videoUrl }}
              style={styles.video}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
            />
          </View>
        )}

        {/* Image */}
        {lesson.contentType === "image" && lesson.imageUrl && (
          <Image source={{ uri: lesson.imageUrl }} style={styles.lessonImage} resizeMode="contain" />
        )}

        {/* Content */}
        <View style={styles.content}>
          <ThemedText type="h2">{title}</ThemedText>

          {isCompleted && (
            <View style={[styles.completedBanner, { backgroundColor: Colors.light.success + "15" }]}>
              <Feather name="check-circle" size={18} color={Colors.light.success} />
              <ThemedText style={{ color: Colors.light.success, fontWeight: "600" }}>
                {t("lessonComplete")}
              </ThemedText>
            </View>
          )}

          {content && (
            <ThemedText style={[styles.textContent, { color: theme.text }]}>
              {content}
            </ThemedText>
          )}

          {/* Mark complete */}
          {!isCompleted && (
            <Pressable
              style={[styles.completeBtn, { backgroundColor: Colors.light.primary }]}
              onPress={handleMarkComplete}
              disabled={progressMut.isPending}
            >
              {progressMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={20} color="#fff" />
                  <ThemedText style={styles.completeBtnText}>{t("markComplete")}</ThemedText>
                </>
              )}
            </Pressable>
          )}

          {isCompleted && (
            <Pressable
              style={[styles.completeBtn, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={20} color={theme.text} />
              <ThemedText style={[styles.completeBtnText, { color: theme.text }]}>
                {t("previous")}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 100 },
  videoContainer: { aspectRatio: 16 / 9, backgroundColor: "#000" },
  video: { flex: 1 },
  resumeBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    padding: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  lessonImage: { width: "100%", height: 240 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  completedBanner: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.sm,
  },
  textContent: { ...Typography.body, lineHeight: 26 },
  completeBtn: {
    height: 56, borderRadius: BorderRadius.full,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  completeBtnText: { ...Typography.body, fontWeight: "700", color: "#fff" },
});
