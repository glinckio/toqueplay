import React, { useCallback } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Icon, IconName } from "./Icon";
import { timing } from "@/theme/animations";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = "primary" | "ghost" | "tertiary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  variant = "primary",
  size = "lg",
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  onPress,
  children,
  style,
}: ButtonProps) {
  const { isDark, brand, colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: timing.buttonPress });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: timing.buttonPress });
  }, [scale]);

  const isDisabled = disabled || loading;

  const containerStyle = getContainerStyle(variant, size, isDark, isDisabled);
  const textStyle = getTextStyle(variant, size, isDark, isDisabled);
  const iconColor = textStyle.color as string;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[animatedStyle, containerStyle, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <>
          {leftIcon && <Icon name={leftIcon} size={size === "sm" ? 14 : 16} color={iconColor} />}
          <Text style={textStyle}>{children}</Text>
          {rightIcon && <Icon name={rightIcon} size={size === "sm" ? 14 : 16} color={iconColor} />}
        </>
      )}
    </AnimatedPressable>
  );
}

function getContainerStyle(
  variant: ButtonVariant,
  size: ButtonSize,
  isDark: boolean,
  disabled: boolean,
): ViewStyle {
  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: size === "sm" ? 12 : 16,
    paddingVertical: size === "sm" ? 11 : 16,
    paddingHorizontal: size === "sm" ? 16 : 24,
  };

  switch (variant) {
    case "primary":
      if (disabled) {
        return {
          ...base,
          backgroundColor: isDark ? "rgba(198,248,42,0.25)" : "rgba(124,58,237,0.25)",
        };
      }
      return {
        ...base,
        backgroundColor: isDark ? "#C6F82A" : "#7C3AED",
      };
    case "ghost":
      return {
        ...base,
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(26,16,48,0.1)",
        opacity: disabled ? 0.4 : 1,
      };
    case "tertiary":
      return {
        ...base,
        backgroundColor: isDark ? "rgba(139,92,246,0.12)" : "rgba(124,58,237,0.08)",
        opacity: disabled ? 0.4 : 1,
      };
    case "danger":
      return {
        ...base,
        backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)",
        opacity: disabled ? 0.4 : 1,
      };
  }
}

function getTextStyle(
  variant: ButtonVariant,
  size: ButtonSize,
  isDark: boolean,
  _disabled: boolean,
): TextStyle {
  const base: TextStyle = {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: size === "sm" ? 12 : 14,
    fontWeight: "700",
  };

  switch (variant) {
    case "primary": {
      const ls = size === "sm" ? 0.03 * 12 : 0.03 * 14;
      if (_disabled) {
        return { ...base, letterSpacing: ls, color: isDark ? "rgba(18,16,10,0.4)" : "rgba(255,255,255,0.5)" };
      }
      return { ...base, letterSpacing: ls, color: isDark ? "#12100A" : "#FFFFFF" };
    }
    case "ghost":
      return { ...base, color: isDark ? "#948CA8" : "#6B6480" };
    case "tertiary":
      return { ...base, color: isDark ? "#8B5CF6" : "#7C3AED" };
    case "danger":
      return { ...base, color: "#EF4444" };
  }
}

export interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  disabled = false,
  size = 44,
  color,
  style,
}: IconButtonProps) {
  const { isDark, colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = color ?? (isDark ? colors.text.primary : colors.text.primary);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.95, { duration: timing.buttonPress }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: timing.buttonPress }); }}
      disabled={disabled}
      style={[
        animatedStyle,
        {
          width: size,
          height: size,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? "#171320" : "#FFFFFF",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(26,16,48,0.08)",
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
    >
      <Icon name={icon} size={20} color={iconColor} />
    </AnimatedPressable>
  );
}
