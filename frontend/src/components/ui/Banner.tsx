import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Icon, IconName } from "./Icon";

export type BannerVariant = "warning" | "error" | "info";

export interface BannerProps {
  variant: BannerVariant;
  message: string;
  icon?: IconName;
  style?: ViewStyle;
}

function getBannerStyle(variant: BannerVariant, isDark: boolean) {
  switch (variant) {
    case "warning":
      return {
        bg: isDark ? "rgba(251,191,36,0.06)" : "rgba(251,191,36,0.06)",
        border: isDark ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.15)",
        color: isDark ? "#FBBF24" : "#D97706",
        radius: 12,
        iconSize: 14,
        paddingV: 10,
        fontSize: 11.5,
        fontWeight: "500" as const,
        fontFamily: "Manrope_500Medium",
        defaultIcon: "info-circle" as IconName,
      };
    case "error":
      return {
        bg: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.05)",
        border: isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)",
        color: isDark ? "#FF9CA6" : "#EF4444",
        radius: 14,
        iconSize: 18,
        paddingV: 12,
        fontSize: 12.5,
        fontWeight: "600" as const,
        fontFamily: "Manrope_600SemiBold",
        defaultIcon: "info-circle" as IconName,
      };
    case "info":
      return {
        bg: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.04)",
        border: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)",
        color: isDark ? "#948CA8" : "#6B6480",
        radius: 14,
        iconSize: 18,
        paddingV: 12,
        fontSize: 12.5,
        fontWeight: "500" as const,
        fontFamily: "Manrope_500Medium",
        defaultIcon: "info-circle" as IconName,
      };
  }
}

export function Banner({ variant, message, icon, style }: BannerProps) {
  const { isDark } = useTheme();
  const s = getBannerStyle(variant, isDark);

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: s.bg,
          borderWidth: 1,
          borderColor: s.border,
          borderRadius: s.radius,
          paddingVertical: s.paddingV,
          paddingHorizontal: 14,
        },
        style,
      ]}
      accessibilityRole="alert"
    >
      <Icon name={icon ?? s.defaultIcon} size={s.iconSize} color={s.color} />
      <Text
        style={{
          flex: 1,
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          color: s.color,
          lineHeight: s.fontSize * 1.4,
        }}
      >
        {message}
      </Text>
    </View>
  );
}
