import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View } from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import { MainTabNavigator } from "./MainTabNavigator";
import CourseDetailScreen from "@/screens/CourseDetailScreen";
import ModuleDetailScreen from "@/screens/ModuleDetailScreen";
import LessonDetailScreen from "@/screens/LessonDetailScreen";
import QuizScreen from "@/screens/QuizScreen";
import SearchScreen from "@/screens/SearchScreen";

export type RootStackParamList = {
  Tabs: undefined;
  CourseDetail: { courseId: string };
  ModuleDetail: { moduleId: string };
  LessonDetail: { lessonId: string };
  Quiz: { moduleId: string };
  Search: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStackNavigator() {
  const { user, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const [showRegister, setShowRegister] = useState(false);

  if (isLoading) {
    return <LoadingScreen message="Loading FastSewa…" />;
  }

  if (!user) {
    return showRegister ? (
      <RegisterScreen onNavigateLogin={() => setShowRegister(false)} />
    ) : (
      <LoginScreen onNavigateRegister={() => setShowRegister(true)} />
    );
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
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
