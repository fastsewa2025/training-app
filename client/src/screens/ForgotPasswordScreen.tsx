import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";

export default function ForgotPasswordScreen({
  onCodeSent,
  onBackToLogin,
}: {
  onCodeSent: (email: string) => void;
  onBackToLogin: () => void;
}) {
  const { t } = useTranslation();
  const { forgotPassword } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      // Same response whether or not the email is registered — the app
      // always moves forward to the code-entry screen either way.
      Alert.alert(t("codeSentTitle"), t("codeSentMessage"), [
        { text: "OK", onPress: () => onCodeSent(trimmed) },
      ]);
    } catch {
      // Network/server error only — the endpoint itself never reports
      // "email not found" (that would leak which emails are registered).
      Alert.alert(t("somethingWrong"), t("tryAgainLater"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={[styles.logoBox, { backgroundColor: Colors.light.primary }]}>
              <ThemedText style={styles.logoText}>🔑</ThemedText>
            </View>
            <ThemedText type="h1" style={styles.appName}>{t("resetPasswordTitle")}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
              {t("forgotPasswordPrompt")}
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("email")}</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder={t("email")}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="go"
                onSubmitEditing={handleSend}
              />
            </View>

            <Pressable
              style={[styles.btn, { backgroundColor: Colors.light.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.btnText}>{t("sendCodeBtn")}</ThemedText>
              )}
            </Pressable>

            <Pressable onPress={onBackToLogin} style={styles.switchLink}>
              <ThemedText style={[styles.switchText, { color: Colors.light.primary }]}>
                {t("backToLogin")}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing["2xl"], justifyContent: "center" },
  header: { alignItems: "center", marginBottom: Spacing["3xl"] },
  logoBox: { width: 80, height: 80, borderRadius: BorderRadius.xl, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  logoText: { fontSize: 40 },
  appName: { marginBottom: Spacing.xs, textAlign: "center" },
  form: { gap: Spacing.lg },
  field: { gap: Spacing.xs },
  label: { ...Typography.small, fontWeight: "600" },
  input: {
    height: 52,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
  },
  btn: {
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  btnText: { ...Typography.body, fontWeight: "700", color: "#fff" },
  switchLink: { alignItems: "center", paddingVertical: Spacing.md },
  switchText: { ...Typography.body },
});
