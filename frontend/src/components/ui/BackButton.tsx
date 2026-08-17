import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { IconButton } from "./Button";

export interface BackButtonProps {
  title?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function BackButton({ title, onPress, style }: BackButtonProps) {
  const { isDark, colors, shadows } = useTheme();

  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 12 }, style]}>
      <IconButton
        icon="back"
        onPress={onPress}
        size={40}
        style={!isDark ? shadows.deeper : undefined}
      />
      {title && (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 18,
            fontWeight: "700",
            color: colors.text.primary,
          }}
        >
          {title}
        </Text>
      )}
    </View>
  );
}
