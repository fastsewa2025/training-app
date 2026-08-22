import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import LearnScreen from "@/screens/LearnScreen";
import TasksScreen from "@/screens/TasksScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.backgroundDefault,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Learn: "book-open",
            Tasks: "check-square",
            Profile: "user",
          };
          return (
            <Feather
              name={(icons[route.name] || "circle") as any}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Learn"   component={LearnScreen}   options={{ tabBarLabel: t("learn") }} />
      <Tab.Screen name="Tasks"   component={TasksScreen}   options={{ tabBarLabel: t("tasks") }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t("profile") }} />
    </Tab.Navigator>
  );
}
