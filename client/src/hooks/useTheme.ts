import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const base = isDark ? Colors.dark : Colors.light;
  const theme = {
    ...base,
    // backgroundRoot = outermost SafeAreaView color
    backgroundRoot: isDark ? Colors.dark.background : Colors.light.background,
  };
  return { theme, isDark };
}
