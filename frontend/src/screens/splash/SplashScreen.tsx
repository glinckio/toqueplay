import React, { useEffect } from "react";
import { View, Text, Image, ImageStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function SplashScreen() {
  const { isDark, colors, brand } = useTheme();
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    logoScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    textOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, [logoOpacity, logoScale, textOpacity]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#0C0A12" : "#F6F4FC",
      }}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Purple glow behind logo */}
        <View
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: isDark
              ? "rgba(124,58,237,0.2)"
              : "rgba(124,58,237,0.1)",
          }}
        />

        <Animated.View style={[{ alignItems: "center" }, logoStyle]}>
          <Image
            source={require("@/../assets/splash-logo.png")}
            style={{ width: 120, height: 120 } as ImageStyle}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={[{ alignItems: "center", marginTop: 16 }, textStyle]}>
          <Text
            style={{
              fontFamily: "SpaceGrotesk_700Bold",
              fontSize: 28,
              fontWeight: "700",
              color: colors.text.primary,
              letterSpacing: -0.02 * 28,
            }}
          >
            ToquePlay
          </Text>
          <Text
            style={{
              fontFamily: "Manrope_500Medium",
              fontSize: 13,
              fontWeight: "500",
              color: isDark ? "#6E6684" : "#8A829E",
              marginTop: 6,
            }}
          >
            Vôlei na palma da mão
          </Text>
        </Animated.View>

        <Animated.View style={[{ marginTop: 40 }, textStyle]}>
          <ProgressBar progress={1} animated width={160} />
        </Animated.View>
      </View>

      {/* Bottom version */}
      <View style={{ position: "absolute", bottom: 44, left: 0, right: 0, alignItems: "center" }}>
        <Text
          style={{
            fontFamily: "Manrope_500Medium",
            fontSize: 11,
            fontWeight: "500",
            color: isDark ? "rgba(110,102,132,0.5)" : "rgba(26,16,48,0.3)",
          }}
        >
          v2.4.0
        </Text>
      </View>
    </View>
  );
}
