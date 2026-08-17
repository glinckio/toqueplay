import React from "react";
import { Pressable, View, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export type CardVariant = "standard" | "elevated";

export interface CardProps {
  variant?: CardVariant;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ variant = "standard", onPress, children, style }: CardProps) {
  const { isDark, shadows } = useTheme();

  const containerStyle: ViewStyle = {
    backgroundColor: isDark ? "#141019" : "#FFFFFF",
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(26,16,48,0.06)",
    borderRadius: 18,
    padding: 16,
    ...(variant === "elevated" && !isDark ? shadows.md : {}),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={[containerStyle, style]}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}
