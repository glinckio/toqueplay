import React, { useEffect } from "react";
import { View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { timing, easing } from "@/theme/animations";

const { height: SCREEN_H } = Dimensions.get("window");

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const { isDark, colors } = useTheme();
  const translateY = useSharedValue(SCREEN_H);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: timing.bottomSheetOverlay });
      translateY.value = withTiming(0, {
        duration: timing.bottomSheet,
        easing: Easing.bezier(
          easing.bottomSheet[0],
          easing.bottomSheet[1],
          easing.bottomSheet[2],
          easing.bottomSheet[3],
        ),
      });
    } else {
      translateY.value = withTiming(SCREEN_H, { duration: timing.bottomSheet / 2 });
      overlayOpacity.value = withTiming(0, { duration: timing.bottomSheetOverlay });
    }
  }, [visible, translateY, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(6,4,10,0.6)" }]}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: isDark ? "#161222" : "#FFFFFF",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 12,
            paddingHorizontal: 22,
            paddingBottom: 34,
            maxHeight: SCREEN_H * 0.85,
          },
          sheetStyle,
        ]}
      >
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(26,16,48,0.1)",
            }}
          />
        </View>

        {title && (
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 16,
              fontWeight: "700",
              color: colors.text.primary,
              marginBottom: 16,
            }}
          >
            {title}
          </Text>
        )}

        {children}
      </Animated.View>
    </View>
  );
}
