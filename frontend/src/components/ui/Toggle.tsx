import React, { useCallback } from "react";
import { Pressable, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { timing } from "@/theme/animations";

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const TRACK_W = 44;
const TRACK_H = 26;
const KNOB = 20;
const OFFSET = 3;

export function Toggle({ value, onValueChange, disabled = false, style }: ToggleProps) {
  const { isDark } = useTheme();

  const handlePress = useCallback(() => {
    if (!disabled) onValueChange(!value);
  }, [disabled, value, onValueChange]);

  const trackStyle = useAnimatedStyle(() => {
    const onColor = isDark ? "#C6F82A" : "#7C3AED";
    const offColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(26,16,48,0.1)";
    return {
      backgroundColor: withTiming(value ? onColor : offColor, { duration: timing.toggle }),
    };
  });

  const knobStyle = useAnimatedStyle(() => {
    const onColor = isDark ? "#12100A" : "#FFFFFF";
    const offColor = isDark ? "#6E6684" : "#A29CB4";
    return {
      transform: [
        {
          translateX: withTiming(value ? TRACK_W - KNOB - OFFSET : OFFSET, {
            duration: timing.toggle,
          }),
        },
      ],
      backgroundColor: withTiming(value ? onColor : offColor, { duration: timing.toggle }),
    };
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[{ opacity: disabled ? 0.4 : 1 }, style]}
    >
      <Animated.View
        style={[
          {
            width: TRACK_W,
            height: TRACK_H,
            borderRadius: 13,
            justifyContent: "center",
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: KNOB,
              height: KNOB,
              borderRadius: 10,
            },
            knobStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
