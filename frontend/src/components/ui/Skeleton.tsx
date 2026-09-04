import React, { useEffect, useRef } from "react";
import { Animated, View, ViewStyle, StyleProp, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * Shimmering placeholder block for loading states (Widelab DNA — dark).
 * Solid dark-gray base with a lighter highlight sweeping across on a loop —
 * plain opacity pulsing barely reads on such a dark base color, so the
 * "loading" motion needs an actual moving highlight instead.
 */
export function Skeleton({
  width,
  height,
  radius = 12,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const sweepWidth = screenWidth * 0.6;
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.delay(250),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  const translateX = x.interpolate({
    inputRange: [0, 1],
    outputRange: [-sweepWidth, screenWidth + sweepWidth],
  });

  return (
    <View
      style={[
        { width: width ?? "100%", height, borderRadius: radius, backgroundColor: isDark ? "#1C1C1E" : "#E8E6ED", overflow: "hidden" },
        style,
      ]}
    >
      <AnimatedGradient
        colors={isDark ? ["transparent", "rgba(255,255,255,0.06)", "transparent"] : ["transparent", "rgba(255,255,255,0.7)", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: sweepWidth,
          transform: [{ translateX }],
        }}
      />
    </View>
  );
}
