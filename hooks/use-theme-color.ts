/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type ThemeColorProps = {
  light?: string;
  dark?: string;
};

type ThemeColorName =
  keyof typeof Colors.light &
  keyof typeof Colors.dark;

export function useThemeColor(
  props: ThemeColorProps,
  colorName: ThemeColorName,
) {
  const detectedTheme = useColorScheme();
  const theme = detectedTheme === "dark" ? "dark" : "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}