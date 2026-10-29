import { normalizeEmail } from "@shared/validation";
import React, { useRef, useState } from "react";
import { TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { Banner, Button, FormScroll, Screen, TextField } from "@/components/ui";
import { useAuth, useUser } from "@/hooks/useAuth";
import { errorMessage, fieldErrors, isFieldError } from "@/lib/errors";
import { onlyProblems, validateDisplayName, validateEmail, validatePhone, validateRequired } from "@/lib/validation";

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const user = useUser();
  const { updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [phone, setPhone] = useState(user.phoneNumber ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [password, setPassword] = useState("");
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Password-reset codes go to this address, so pointing it somewhere new needs the password (the server checks it too).
  const emailChanging = normalizeEmail(email) !== "" && normalizeEmail(email) !== (user.email ?? "");

  const edit = (setter: (v: string) => void, field: string) => (value: string) => {
    setter(value);
    setSaved(false);
    setProblems((p) => ({ ...p, [field]: "" }));
  };

  const submit = async () => {
    const found = onlyProblems({
      displayName: validateDisplayName(displayName),
      phoneNumber: validatePhone(phone),
      email: validateEmail(email),
      currentPassword: emailChanging ? validateRequired(password) : null,
    });
    const translated = Object.fromEntries(Object.entries(found).map(([field, key]) => [field, t(key)]));
    setProblems(translated);
    if (Object.keys(translated).length > 0) return;
    setBusy(true);
    setError(null);
    try {
      await updateProfile({
        displayName,
        phoneNumber: phone.trim() === "" ? null : phone,
        email: email.trim() === "" ? null : email,
        ...(emailChanging ? { currentPassword: password } : {}),
      });
      setSaved(true);
      setPassword("");
    } catch (e) {
      setProblems(fieldErrors(e, t));
      setError(isFieldError(e) ? null : e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={["bottom", "left", "right"]}>
      <FormScroll>
        {saved ? <Banner tone="success">{t("profile.saved")}</Banner> : null}
        {error ? <Banner tone="error">{errorMessage(error, t)}</Banner> : null}
        <TextField label={t("auth.register.name")} hint={t("auth.register.nameHint")} value={displayName} onChangeText={edit(setDisplayName, "displayName")} error={problems.displayName || undefined} autoComplete="name" textContentType="name" autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} />
        <TextField ref={phoneRef} label={t("auth.register.phone")} optional value={phone} onChangeText={edit(setPhone, "phoneNumber")} error={problems.phoneNumber || undefined} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
        <TextField ref={emailRef} label={t("auth.register.email")} hint={t("auth.register.emailHint")} optional value={email} onChangeText={edit(setEmail, "email")} error={problems.email || undefined} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType={emailChanging ? "next" : "done"} onSubmitEditing={() => (emailChanging ? passwordRef.current?.focus() : undefined)} />
        {emailChanging ? (
          <TextField ref={passwordRef} label={t("profile.emailPassword")} hint={t("profile.emailPasswordHint")} value={password} onChangeText={edit(setPassword, "currentPassword")} error={problems.currentPassword || undefined} secure autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="done" onSubmitEditing={() => void submit()} />
        ) : null}
        <Button label={t("profile.saveChanges")} onPress={() => void submit()} loading={busy} />
      </FormScroll>
    </Screen>
  );
}
