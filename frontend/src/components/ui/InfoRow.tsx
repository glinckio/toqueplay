import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Icon, IconName } from "./Icon";

export interface InfoRowProps {
  icon: IconName;
  label: string;
  value: string;
  style?: ViewStyle;
}

export function InfoRow({ icon, label, value, style }: InfoRowProps) {
  const { isDark, colors } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: isDark ? "#141019" : "#FFFFFF",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(26,16,48,0.06)",
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 16,
        },
        style,
      ]}
    >
      <Icon
        name={icon}
        size={18}
        color={isDark ? "#8B5CF6" : "#7C3AED"}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Manrope_500Medium",
            fontSize: 11,
            fontWeight: "500",
            color: colors.text.muted,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: "Manrope_600SemiBold",
            fontSize: 14,
            fontWeight: "600",
            color: colors.text.primary,
            marginTop: 2,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
