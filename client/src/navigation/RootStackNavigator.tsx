import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "@/screens/ResetPasswordScreen";
import { MainTabNavigator } from "./MainTabNavigator";
import CourseDetailScreen from "@/screens/CourseDetailScreen";
import ModuleDetailScreen from "@/screens/ModuleDetailScreen";
import LessonDetailScreen from "@/screens/LessonDetailScreen";
import QuizScreen from "@/screens/QuizScreen";
import SearchScreen from "@/screens/SearchScreen";
import ChangePasswordScreen from "@/screens/ChangePasswordScreen";
import type { RootStackParamList } from "@/types";

// Re-exported so existing `from "@/navigation/RootStackNavigator"` imports
// elsewhere keep working — @/types is the single source of truth now (this
// file used to keep its own drifted copy, which is how "Search" and
// "ChangePassword" ended up missing from whichever copy a given screen
// happened to import).
export type { RootStackParamList };

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStackNavigator() {
  const { user, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const [authScreen, setAuthScreen] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [resetEmail, setResetEmail] = useState("");

  if (isLoading) {
    return <LoadingScreen message="Loading FastSewa…" />;
  }

  if (!user) {
    switch (authScreen) {
      case "register":
        return <RegisterScreen onNavigateLogin={() => setAuthScreen("login")} />;
      case "forgot":
        return (
          <ForgotPasswordScreen
            onCodeSent={(email) => { setResetEmail(email); setAuthScreen("reset"); }}
            onBackToLogin={() => setAuthScreen("login")}
          />
        );
      case "reset":
        return (
          <ResetPasswordScreen
            email={resetEmail}
            onSuccess={() => setAuthScreen("login")}
            onBackToLogin={() => setAuthScreen("login")}
          />
        );
      default:
        return (
          <LoginScreen
            onNavigateRegister={() => setAuthScreen("register")}
            onForgotPassword={() => setAuthScreen("forgot")}
          />
        );
    }
  }

  return (
    <ErrorBoundary>
      <NavigationContainer
        theme={{
          dark: isDark,
          colors: {
            primary: Colors.light.primary,
            background: theme.backgroundRoot,
            card: theme.backgroundDefault,
            text: theme.text,
            border: theme.border,
            notification: Colors.light.primary,
          },
          fonts: {
            regular: { fontFamily: "System", fontWeight: "400" },
            medium: { fontFamily: "System", fontWeight: "500" },
            bold: { fontFamily: "System", fontWeight: "700" },
            heavy: { fontFamily: "System", fontWeight: "800" },
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: theme.backgroundDefault },
            headerTintColor: theme.text,
            headerTitleStyle: { fontWeight: "700" },
            headerBackTitle: "",
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="Tabs"         component={MainTabNavigator}   options={{ headerShown: false }} />
          <Stack.Screen name="Search"       component={SearchScreen}       options={{ headerShown: false }} />
          <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ title: "Course" }} />
          <Stack.Screen name="ModuleDetail" component={ModuleDetailScreen} options={{ title: "Module" }} />
          <Stack.Screen name="LessonDetail" component={LessonDetailScreen} options={{ title: "Lesson" }} />
          <Stack.Screen name="Quiz"         component={QuizScreen}         options={{ title: "Quiz", headerBackVisible: false }} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Change Password" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
