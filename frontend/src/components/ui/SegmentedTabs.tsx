import React, { useCallback } from "react";
import { View, Pressable, Text, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { timing } from "@/theme/animations";

export interface SegmentedTabsProps {
  tabs: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedTabs({ tabs, activeIndex, onChange }: SegmentedTabsProps) {
  const { isDark } = useTheme();
  const tabWidths = useSharedValue<number[]>([]);
  const tabOffsets = useSharedValue<number[]>([]);

  const handleLayout = useCallback(
    (index: number) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      const newWidths = [...(tabWidths.value.length ? tabWidths.value : new Array(tabs.length).fill(0))];
      const newOffsets = [...(tabOffsets.value.length ? tabOffsets.value : new Array(tabs.length).fill(0))];
      newWidths[index] = width;
      newOffsets[index] = x;
      tabWidths.value = newWidths;
      tabOffsets.value = newOffsets;
    },
    [tabs.length, tabWidths, tabOffsets],
  );

  const pillStyle = useAnimatedStyle(() => {
    if (!tabWidths.value.length || !tabOffsets.value.length) {
      return { width: 0, transform: [{ translateX: 0 }] };
    }
    return {
      width: withTiming(tabWidths.value[activeIndex] ?? 0, { duration: timing.segmentedTabs }),
      transform: [
        { translateX: withTiming(tabOffsets.value[activeIndex] ?? 0, { duration: timing.segmentedTabs }) },
      ],
    };
  });

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: isDark ? "#141019" : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(26,16,48,0.06)",
        borderRadius: 14,
        padding: 4,
        position: "relative",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 4,
            bottom: 4,
            borderRadius: 11,
            backgroundColor: isDark ? "#C6F82A" : "#7C3AED",
          },
          pillStyle,
        ]}
      />
      {tabs.map((tab, i) => (
        <Pressable
          key={tab}
          onLayout={handleLayout(i)}
          onPress={() => onChange(i)}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: i === activeIndex ? "SpaceGrotesk_700Bold" : "SpaceGrotesk_600SemiBold",
              fontSize: 12,
              fontWeight: i === activeIndex ? "700" : "600",
              color:
                i === activeIndex
                  ? isDark ? "#12100A" : "#FFFFFF"
                  : isDark ? "#948CA8" : "#8A829E",
            }}
          >
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
