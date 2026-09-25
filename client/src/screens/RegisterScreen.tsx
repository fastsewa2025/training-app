import React, { useState } from "react";
import {
  View, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ApiError } from "@/lib/api";

export default function RegisterScreen({ onNavigateLogin }: { onNavigateLogin: () => void }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const { theme } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim() || !username.trim() || !password.trim()) {
      Alert.alert(t("register"), "Name, username and password are required");
      return;
    }
    if (password.length < 8) {
      Alert.alert(t("register"), "Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        password,
        email: email.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
        preferredLang: lang,
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("registerError");
      Alert.alert(t("register"), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="h1" style={styles.title}>{t("register")}</ThemedText>

          <View style={styles.form}>
            {[
              { label: t("displayName"), value: displayName, set: setDisplayName, placeholder: "e.g. Ramesh Kumar", secure: false, caps: "words" as const },
              { label: t("username"), value: username, set: setUsername, placeholder: "e.g. ramesh123", secure: false, caps: "none" as const },
              { label: t("password"), value: password, set: setPassword, placeholder: "Min 8 characters", secure: true, caps: "none" as const },
              { label: t("email") + " (optional)", value: email, set: setEmail, placeholder: "you@example.com", secure: false, caps: "none" as const },
              { label: t("phone"), value: phone, set: setPhone, placeholder: "+91 9876543210", secure: false, caps: "none" as const },
            ].map(({ label, value, set, placeholder, secure, caps }) => (
              <View key={label} style={styles.field}>
                <ThemedText style={styles.label}>{label}</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={value}
                  onChangeText={set}
                  placeholder={placeholder}
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={secure}
                  autoCapitalize={caps}
                  autoCorrect={false}
                  keyboardType={label === t("phone") ? "phone-pad" : label.startsWith(t("email")) ? "email-address" : "default"}
                />
              </View>
            ))}

            {/* Language picker */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("language")}</ThemedText>
              <View style={styles.langRow}>
                {(["en", "hi"] as const).map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => setLang(l)}
                    style={[
                      styles.langBtn,
                      {
                        backgroundColor: lang === l ? Colors.light.primary : theme.backgroundSecondary,
                        borderColor: lang === l ? Colors.light.primary : theme.border,
                      },
                    ]}
                  >
                    <ThemedText style={{ color: lang === l ? "#fff" : theme.text, fontWeight: "600" }}>
                      {l === "en" ? "English" : "हिन्दी"}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.btn, { backgroundColor: Colors.light.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <ThemedText style={styles.btnText}>{t("registerBtn")}</ThemedText>
              )}
            </Pressable>

            <Pressable onPress={onNavigateLogin} style={styles.switchLink}>
              <ThemedText style={[styles.switchText, { color: Colors.light.primary }]}>
                {t("alreadyAccount")}
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
  scroll: { flexGrow: 1, padding: Spacing["2xl"] },
  title: { marginBottom: Spacing["2xl"] },
  form: { gap: Spacing.lg },
  field: { gap: Spacing.xs },
  label: { ...Typography.small, fontWeight: "600" },
  input: { height: 52, borderRadius: BorderRadius.sm, borderWidth: 1, paddingHorizontal: Spacing.lg, ...Typography.body },
  langRow: { flexDirection: "row", gap: Spacing.md },
  langBtn: { flex: 1, height: 52, borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btn: { height: 56, borderRadius: BorderRadius.full, alignItems: "center", justifyContent: "center", marginTop: Spacing.sm },
  btnText: { ...Typography.body, fontWeight: "700", color: "#fff" },
  switchLink: { alignItems: "center", paddingVertical: Spacing.md },
  switchText: { ...Typography.body },
});
