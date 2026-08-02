import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { ReactNode, useRef } from "react";
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
    ViewStyle,
} from "react-native";

import { Colors } from "../../constants/colors";
import { Radius } from "../../constants/radius";
import { Spacing } from "../../constants/spacing";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  leftContent?: ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  leftContent,
  fullWidth = true,
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;

  const scale = useRef(new Animated.Value(1)).current;

  const isDisabled = disabled || loading;

  const animatePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 30,
      bounciness: 3,
    }).start();
  };

  const animatePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 5,
    }).start();
  };

  const handlePress = async () => {
    if (isDisabled) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getButtonStyle = (): ViewStyle => {
    switch (variant) {
      case "secondary":
        return {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
        };

      case "outline":
        return {
          backgroundColor: "transparent",
          borderColor: theme.border,
          borderWidth: 1,
        };

      case "ghost":
        return {
          backgroundColor: "transparent",
        };

      case "primary":
      default:
        return {
          backgroundColor: theme.primary,
        };
    }
  };

  const getTextColor = () => {
    if (variant === "primary") return "#FFFFFF";
    return theme.text;
  };

  return (
    <Animated.View
      style={[
        fullWidth && styles.fullWidth,
        {
          transform: [{ scale }],
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={animatePressIn}
        onPressOut={animatePressOut}
        disabled={isDisabled}
        style={[styles.button, getButtonStyle()]}
      >
        {loading ? (
          <ActivityIndicator color={getTextColor()} />
        ) : (
          <View style={styles.content}>
            {leftContent}

            {!leftContent && icon && (
              <Ionicons
                name={icon}
                size={21}
                color={getTextColor()}
                style={styles.icon}
              />
            )}

            <Text style={[styles.title, { color: getTextColor() }]}>
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },

  button: {
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },

  content: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  icon: {
    marginRight: Spacing.sm,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
  },
});