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
import { ApiError } from "@/lib/api";

export default function ResetPasswordScreen({
  email,
  onSuccess,
  onBackToLogin,
}: {
  email: string;
  onSuccess: () => void;
  onBackToLogin: () => void;
}) {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const { theme } = useTheme();

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!code.trim() || !newPassword.trim()) return;
    setLoading(true);
    try {
      await resetPassword(email, code.trim().toUpperCase(), newPassword);
      Alert.alert(t("resetSuccessTitle"), t("resetSuccessMessage"), [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("invalidCode");
      Alert.alert(t("resetPasswordTitle"), msg);
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
              <ThemedText style={styles.logoText}>✉️</ThemedText>
            </View>
            <ThemedText type="h1" style={styles.appName}>{t("resetPasswordTitle")}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
              {email}
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("resetCode")}</ThemedText>
              <TextInput
                style={[styles.input, styles.codeInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={code}
                onChangeText={setCode}
                placeholder="ABCD1234"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("newPassword")}</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t("newPassword")}
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleReset}
              />
            </View>

            <Pressable
              style={[styles.btn, { backgroundColor: Colors.light.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.btnText}>{t("resetPasswordBtn")}</ThemedText>
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
  codeInput: { letterSpacing: 2, fontWeight: "700" },
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
