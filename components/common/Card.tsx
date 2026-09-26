// CMP-001

import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";

import { darkColors, lightColors, radius, shadows, spacing } from "../../theme";

import { useAppAppearance } from "../../lib/appearance";

type CardProps = ViewProps & {
  children: React.ReactNode;
};

export default function Card({
  children,
  style,
  ...props
}: CardProps) {
  const { isDark } = useAppAppearance();
  const colors = isDark ? darkColors : lightColors;
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.surface,

    borderRadius: radius.xl,

    borderWidth: 1,
    borderColor: lightColors.border,

    padding: spacing.lg,

    ...shadows.card,
  },
});