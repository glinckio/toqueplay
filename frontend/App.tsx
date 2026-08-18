import "./global.css";
import React, { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { AuthNavigator } from "@/navigation/AuthNavigator";
import { RootNavigator } from "@/navigation/RootNavigator";
import { VisitorNavigator } from "@/navigation/VisitorNavigator";
import { SplashScreen as AppSplash } from "@/screens/splash/SplashScreen";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Manrope_300Light,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const visitorActive = useAuthStore((s) => s.visitorActive);
  const themeMode = useThemeStore((s) => s.mode);

  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasHydrated) {
        useAuthStore.getState().setHasHydrated(true);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [hasHydrated]);

  useEffect(() => {
    if (fontsLoaded && hasHydrated) {
      setAppReady(true);
    }
  }, [fontsLoaded, hasHydrated]);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    if (!fontsLoaded) return null;
    return <AppSplash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <NavigationContainer>
          {isAuthenticated ? (
            <RootNavigator />
          ) : visitorActive ? (
            <VisitorNavigator />
          ) : (
            <AuthNavigator />
          )}
        </NavigationContainer>
        <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
