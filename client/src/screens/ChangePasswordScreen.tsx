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

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const { changePassword, logout } = useAuth();
  const { theme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) return;
    if (newPassword.length < 8) {
      Alert.alert(t("changePassword"), "Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      // Server invalidated every session on success, current one included —
      // log out locally too so the app's state matches reality.
      Alert.alert(t("changePassword"), t("changePasswordSuccess"), [
        { text: "OK", onPress: () => logout() },
      ]);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? t("currentPasswordWrong")
          : e instanceof ApiError
            ? e.message
            : t("somethingWrong");
      Alert.alert(t("changePassword"), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("currentPassword")}</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t("currentPassword")}
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
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
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={handleChange}
              />
            </View>

            <Pressable
              style={[styles.btn, { backgroundColor: Colors.light.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleChange}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.btnText}>{t("changePasswordBtn")}</ThemedText>
              )}
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
});
