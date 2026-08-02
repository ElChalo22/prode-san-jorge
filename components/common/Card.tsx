// CMP-001

import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";

import { lightColors, radius, shadows, spacing } from "../../theme";

type CardProps = ViewProps & {
  children: React.ReactNode;
};

export default function Card({
  children,
  style,
  ...props
}: CardProps) {
  return (
    <View
      style={[styles.card, style]}
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