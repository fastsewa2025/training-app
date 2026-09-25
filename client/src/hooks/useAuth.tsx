import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiClient, storeTokens, clearTokens } from "@/lib/api";
import i18n from "@/i18n";
import type { AuthUser } from "@/types";

export type { AuthUser };

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<AuthUser, "displayName" | "preferredLang" | "phoneNumber" | "email">>) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

interface RegisterData {
  username: string;
  password: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  preferredLang?: "en" | "hi";
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyUserLang = (u: AuthUser) => {
    if (u.preferredLang && i18n.language !== u.preferredLang) {
      i18n.changeLanguage(u.preferredLang);
    }
  };

  useEffect(() => {
    apiClient
      .get<AuthUser>("/api/v1/auth/me")
      .then((u) => { setUser(u); applyUserLang(u); })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiClient.post<{
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    }>("/api/v1/auth/login", { username, password });
    await storeTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    applyUserLang(data.user);
  }, []);

  const register = useCallback(async (formData: RegisterData) => {
    const data = await apiClient.post<{
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    }>("/api/v1/auth/register", formData);
    await storeTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    applyUserLang(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/v1/auth/logout");
    } catch {}
    await clearTokens();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (data: Partial<Pick<AuthUser, "displayName" | "preferredLang" | "phoneNumber" | "email">>) => {
      const updated = await apiClient.patch<AuthUser>("/api/v1/auth/me", data);
      setUser((prev) => prev ? { ...prev, ...updated } : prev);
      if (data.preferredLang) i18n.changeLanguage(data.preferredLang);
    },
    []
  );

  // Pre-auth: no `user` state to touch either way. The screen decides what
  // to show; this just makes the call and lets errors propagate to it.
  const forgotPassword = useCallback(async (email: string) => {
    await apiClient.post("/api/v1/auth/forgot-password", { email });
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await apiClient.post("/api/v1/auth/reset-password", { email, code, newPassword });
    },
    []
  );

  // Server signs out every session (this one included) on success, so the
  // caller should follow up with logout() once this resolves.
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await apiClient.post("/api/v1/auth/change-password", { currentPassword, newPassword });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, updateProfile, forgotPassword, resetPassword, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
