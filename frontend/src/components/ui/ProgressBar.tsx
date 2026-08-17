import React, { useEffect } from "react";
import { View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { timing } from "@/theme/animations";

export interface ProgressBarProps {
  progress: number;
  animated?: boolean;
  width?: number;
  style?: ViewStyle;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function ProgressBar({
  progress,
  animated = true,
  width = 160,
  style,
}: ProgressBarProps) {
  const { isDark } = useTheme();
  const animProgress = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, progress));
    if (animated) {
      animProgress.value = withTiming(clamped, {
        duration: timing.splash,
        easing: Easing.inOut(Easing.ease),
      });
    } else {
      animProgress.value = clamped;
    }
  }, [progress, animated, animProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animProgress.value * 100}%` as any,
  }));

  return (
    <View
      style={[
        {
          width,
          height: 4,
          borderRadius: 4,
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(26,16,48,0.06)",
          overflow: "hidden",
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <AnimatedLinearGradient
        colors={["#8B5CF6", "#C6F82A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[{ height: 4, borderRadius: 4 }, fillStyle]}
      />
    </View>
  );
}
