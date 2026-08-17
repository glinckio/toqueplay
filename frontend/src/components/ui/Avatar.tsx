import React from "react";
import { View, Text, Image, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { avatarPoolDark, avatarPoolLight } from "@/theme/colors";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface AvatarProps {
  initials?: string;
  size?: AvatarSize;
  colorIndex?: number;
  isCaptain?: boolean;
  imageUrl?: string | null;
  style?: ViewStyle;
}

const SIZE_MAP: Record<AvatarSize, { box: number; radius: number; font: number }> = {
  xs: { box: 28, radius: 9, font: 10 },
  sm: { box: 36, radius: 11, font: 12 },
  md: { box: 38, radius: 12, font: 13 },
  lg: { box: 42, radius: 13, font: 14 },
  xl: { box: 48, radius: 16, font: 16 },
  "2xl": { box: 56, radius: 18, font: 18 },
};

export function Avatar({
  initials = "?",
  size = "md",
  colorIndex = 0,
  isCaptain = false,
  imageUrl,
  style,
}: AvatarProps) {
  const { isDark } = useTheme();
  const dim = SIZE_MAP[size];
  const pool = isDark ? avatarPoolDark : avatarPoolLight;
  const colorPair = pool[colorIndex % pool.length];

  const containerStyle: ViewStyle = {
    width: dim.box,
    height: dim.box,
    borderRadius: dim.radius,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  };

  if (imageUrl) {
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: dim.box, height: dim.box }}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (isCaptain) {
    return (
      <LinearGradient
        colors={["#8B5CF6", "#C6F82A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[containerStyle, style]}
      >
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: dim.font,
            fontWeight: "700",
            color: "#FFFFFF",
          }}
        >
          {initials}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        containerStyle,
        { backgroundColor: colorPair.bg },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: "SpaceGrotesk_700Bold",
          fontSize: dim.font,
          fontWeight: "700",
          color: colorPair.text,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
