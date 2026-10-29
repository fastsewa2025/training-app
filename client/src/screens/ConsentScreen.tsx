import React, { useState } from "react";
import { Linking } from "react-native";
import { useTranslation } from "react-i18next";
import { ThemedText } from "@/components/ThemedText";
import { Banner, Button, Checkbox, FormScroll, Screen } from "@/components/ui";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage, fieldErrors, isFieldError } from "@/lib/errors";
import { useAppNavigation } from "@/navigation/hooks";

/**
 * Shown instead of the app while the learner has not accepted the privacy notice the server shows now:
 * an account a trainer created, an account from before consent was recorded, or a notice that has
 * changed since (CONSENT_VERSION). The same two confirmations as at registration; the learner may also
 * sign out, or delete the account instead of agreeing.
 */
export default function ConsentScreen() {
  const { t } = useTranslation();
  const navigation = useAppNavigation();
  const { acceptConsent, logout } = useAuth();
  const { config } = useAppConfig();
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const open = (url: string | null) => {
    if (url) void Linking.openURL(url);
  };

  const submit = async () => {
    const found: Record<string, string> = {};
    if (!adult) found.confirmAdult = t("consent.adultRequired");
    if (!terms) found.acceptTerms = t("errors.CONSENT_REQUIRED");
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setError(null);
    try {
      await acceptConsent({ acceptTerms: true, confirmAdult: true });
      // Accepted: the navigator now swaps this screen for the app.
    } catch (e) {
      setProblems(fieldErrors(e, t));
      setError(isFieldError(e) ? null : e);
      setBusy(false);
    }
  };

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <FormScroll>
        <Banner tone="info" icon="shield">
          {t("consent.intro")}
        </Banner>
        {error ? <Banner tone="error">{errorMessage(error, t)}</Banner> : null}
        <ThemedText type="small">{t("auth.register.whatWeKeep1")}</ThemedText>
        <ThemedText type="small">{t("auth.register.whatWeKeep2")}</ThemedText>
        <ThemedText type="small">{t("auth.register.whatWeKeep3")}</ThemedText>

        <Checkbox
          checked={adult}
          onChange={(v) => {
            setAdult(v);
            setProblems((p) => ({ ...p, confirmAdult: "" }));
          }}
          error={problems.confirmAdult || undefined}
        >
          <ThemedText>{t("auth.register.adult")}</ThemedText>
        </Checkbox>
        <Checkbox
          checked={terms}
          onChange={(v) => {
            setTerms(v);
            setProblems((p) => ({ ...p, acceptTerms: "" }));
          }}
          error={problems.acceptTerms || undefined}
        >
          <ThemedText>
            {t("auth.register.termsBefore")}
            <ThemedText accessibilityRole={config.termsUrl ? "link" : undefined} onPress={config.termsUrl ? () => open(config.termsUrl) : undefined} style={config.termsUrl ? { textDecorationLine: "underline", fontWeight: "700" } : undefined}>
              {t("auth.register.termsLink")}
            </ThemedText>
            {t("auth.register.termsAnd")}
            <ThemedText accessibilityRole={config.privacyPolicyUrl ? "link" : undefined} onPress={config.privacyPolicyUrl ? () => open(config.privacyPolicyUrl) : undefined} style={config.privacyPolicyUrl ? { textDecorationLine: "underline", fontWeight: "700" } : undefined}>
              {t("auth.register.privacyLink")}
            </ThemedText>
            {t("auth.register.termsAfter")}
          </ThemedText>
        </Checkbox>

        <Button label={t("consent.submit")} icon="check" onPress={() => void submit()} loading={busy} />
        <Button variant="ghost" label={t("profile.logout")} onPress={() => void logout()} />
        <Button variant="ghost" label={t("consent.decline")} onPress={() => navigation.navigate("DeleteAccount")} />
      </FormScroll>
    </Screen>
  );
}
