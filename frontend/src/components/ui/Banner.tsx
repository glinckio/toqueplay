import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Icon, IconName } from "./Icon";

export type BannerVariant = "warning" | "error" | "info";

export interface BannerProps {
  variant: BannerVariant;
  message: string;
  icon?: IconName;
}

function getBannerStyle(variant: BannerVariant, isDark: boolean) {
  switch (variant) {
    case "warning":
      return {
        bg: isDark ? "rgba(251,191,36,0.06)" : "rgba(251,191,36,0.06)",
        border: isDark ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.15)",
        color: isDark ? "#FBBF24" : "#D97706",
        radius: 12,
        defaultIcon: "shield" as IconName,
      };
    case "error":
      return {
        bg: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.05)",
        border: isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)",
        color: isDark ? "#FF9CA6" : "#EF4444",
        radius: 14,
        defaultIcon: "close" as IconName,
      };
    case "info":
      return {
        bg: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.04)",
        border: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)",
        color: isDark ? "#948CA8" : "#6B6480",
        radius: 14,
        defaultIcon: "shield" as IconName,
      };
  }
}

export function Banner({ variant, message, icon }: BannerProps) {
  const { isDark } = useTheme();
  const style = getBannerStyle(variant, isDark);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: style.bg,
        borderWidth: 1,
        borderColor: style.border,
        borderRadius: style.radius,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
      accessibilityRole="alert"
    >
      <Icon name={icon ?? style.defaultIcon} size={16} color={style.color} />
      <Text
        style={{
          flex: 1,
          fontFamily: "Manrope_500Medium",
          fontSize: 12,
          fontWeight: "500",
          color: style.color,
          lineHeight: 18,
        }}
      >
        {message}
      </Text>
    </View>
  );
}
