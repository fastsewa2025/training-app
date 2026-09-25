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

export default function LoginScreen({
  onNavigateRegister,
  onForgotPassword,
}: {
  onNavigateRegister: () => void;
  onForgotPassword: () => void;
}) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { theme } = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("loginError");
      Alert.alert(t("login"), msg);
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
          {/* Logo / header */}
          <View style={styles.header}>
            <View style={[styles.logoBox, { backgroundColor: Colors.light.primary }]}>
              <ThemedText style={styles.logoText}>🦺</ThemedText>
            </View>
            <ThemedText type="h1" style={styles.appName}>FastSewa</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
              Construction Training Platform
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <ThemedText type="h2" style={styles.title}>{t("login")}</ThemedText>

            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("username")}</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={username}
                onChangeText={setUsername}
                placeholder={t("username")}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("password")}</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={password}
                onChangeText={setPassword}
                placeholder={t("password")}
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
            </View>

            <Pressable
              style={[styles.btn, { backgroundColor: Colors.light.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.btnText}>{t("loginBtn")}</ThemedText>
              )}
            </Pressable>

            <Pressable onPress={onForgotPassword} style={styles.switchLink}>
              <ThemedText style={[styles.switchText, { color: theme.textSecondary }]}>
                {t("forgotPassword")}
              </ThemedText>
            </Pressable>

            <Pressable onPress={onNavigateRegister} style={styles.switchLink}>
              <ThemedText style={[styles.switchText, { color: Colors.light.primary }]}>
                {t("noAccount")}
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
  appName: { marginBottom: Spacing.xs },
  form: { gap: Spacing.lg },
  title: { marginBottom: Spacing.sm },
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
