import React, { useEffect } from "react";
import { View, Text, Image, ImageStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { ProgressBar } from "@/components/ui/ProgressBar";

const C = {
  bg: "#000000",
  lime: "#C6F82A",
  tx: "#FFFFFF",
  tx2: "#9A94A8",
  tx3: "#6E6684",
};

export interface SplashScreenProps {
  subtitle?: string;
  progress?: number;
}

export function SplashScreen({ subtitle = "Vôlei na palma da mão", progress = 1 }: SplashScreenProps = {}) {
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ alignItems: "center" }, logoStyle]}>
          <Image
            source={require("@/../assets/splash-logo.png")}
            style={{ width: 120, height: 120, backgroundColor: 'transparent' } as ImageStyle}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={[{ marginTop: 40 }, textStyle]}>
          <ProgressBar progress={progress} animated width={160} />
        </Animated.View>
      </View>

      {/* Bottom version */}
      <View style={{ position: "absolute", bottom: 44, left: 0, right: 0, alignItems: "center" }}>
        <Text style={{ fontFamily: "Manrope_500Medium", fontSize: 11, color: C.tx3 }}>
          v1.0.0
        </Text>
      </View>
    </View>
  );
}
