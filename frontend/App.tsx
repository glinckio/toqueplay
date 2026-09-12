import "./global.css";
import React, { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme, DarkTheme, LinkingOptions, getStateFromPath } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SplashScreen from "expo-splash-screen";
import * as ScreenOrientation from "expo-screen-orientation";
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
import { Anton_400Regular } from "@expo-google-fonts/anton";
import { Oswald_500Medium, Oswald_600SemiBold, Oswald_700Bold } from "@expo-google-fonts/oswald";
import { DesignLabScreen } from "@/screens/_designlab/DesignLabScreen";

// DEV toggle: set true to preview the new "Widelab DNA" design test screen.
// Reverte pra false quando terminar de avaliar. NÃO commitar como true.
const DESIGN_LAB = false;

// DEV toggle: força a tela de auth (Login/Register/Forgot) mesmo já logado,
// pra revisar o redesign sem precisar deslogar. NÃO commitar como true.
const FORCE_AUTH = false;
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { AuthNavigator } from "@/navigation/AuthNavigator";
import { RootNavigator } from "@/navigation/RootNavigator";
import { VisitorNavigator } from "@/navigation/VisitorNavigator";
import { SplashScreen as AppSplash } from "@/screens/splash/SplashScreen";
import { ConsentGateScreen } from "@/screens/consent/ConsentGateScreen";
import { privacyService } from "@/services/privacyService";
import { usersService } from "@/services/usersService";
import { registerForPushNotifications } from "@/hooks/usePushNotifications";

SplashScreen.preventAutoHideAsync();

const linkingConfig = {
  screens: {
    MainTabs: {
      screens: {
        Home: "home",
        Explore: "explore",
        Profile: "profile",
      },
    },
    TournamentDetail: "tournament/:id",
    AthleteProfile: "athlete/:id",
    TeamDetail: "team/:id",
  },
};

const linking: LinkingOptions<any> = {
  prefixes: ["toqueplay://", "exp://"],
  config: linkingConfig,
  getStateFromPath: (path, options) => {
    const cleanPath = path.includes("/--/") ? path.split("/--/")[1] : path;
    return getStateFromPath(cleanPath, options);
  },
};

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
    Anton_400Regular,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const visitorActive = useAuthStore((s) => s.visitorActive);
  const hasAcceptedTerms = useAuthStore((s) => s.hasAcceptedTerms);
  const themeMode = useThemeStore((s) => s.mode);
  // NavigationContainer defaults to a white background (DefaultTheme) —
  // without this, that white shows through any transparent gap (e.g. the
  // floating bottom tab bar's rounded-corner margins) instead of the app's
  // actual dark screens.
  const navTheme = {
    ...(themeMode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(themeMode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: themeMode === "dark" ? "#000000" : "#F6F4FC",
      card: themeMode === "dark" ? "#000000" : "#F6F4FC",
    },
  };

  const [appReady, setAppReady] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Pull the saved theme preference from the account on login — this is
  // what makes it follow the user to a new device, not just live in
  // AsyncStorage on the one they set it on.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    usersService.getProfile()
      .then((profile) => {
        if (!cancelled && (profile.themeMode === "dark" || profile.themeMode === "light")) {
          useThemeStore.getState().setMode(profile.themeMode);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // The Terms/Privacy modal must reflect the account's real consent record
  // (server), not just a local flag — otherwise every logout+login wipes it
  // and re-prompts a user who already accepted.
  useEffect(() => {
    if (!isAuthenticated) {
      setConsentChecked(false);
      return;
    }
    let cancelled = false;
    privacyService.getTermsStatus()
      .then((status) => {
        if (!cancelled) useAuthStore.getState().setHasAcceptedTerms(!status.termsOutdated);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setConsentChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Register the FCM device token once per session — but only if the user
  // already opted into push (LGPD gate). Best-effort: a denied OS permission
  // or missing Firebase config just means no push, not a crash.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    privacyService.getConsents()
      .then((consents) => {
        if (!cancelled && consents.notificationsPush) {
          registerForPushNotifications().catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Keep the app portrait by default; the referee scoring screen unlocks landscape itself.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

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

  if (DESIGN_LAB) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SafeAreaProvider>
          <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
            <DesignLabScreen />
            <StatusBar style="light" />
          </KeyboardProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        {/* KeyboardProvider alimenta os insets do teclado usados pelas telas. Precisa ficar
            acima da navegacao para valer em qualquer rota.
            As duas flags de translucent sao obrigatorias aqui: sem elas o modulo reserva as
            barras de status/navegacao em vez de desenhar sob elas, e o app (que e edge-to-edge)
            ganha faixas solidas em cima e embaixo. */}
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <NavigationContainer linking={linking} theme={navTheme}>
            {FORCE_AUTH ? (
              <AuthNavigator />
            ) : isAuthenticated ? (
              <>
                <RootNavigator />
                <ConsentGateScreen visible={consentChecked && !hasAcceptedTerms} />
              </>
            ) : visitorActive ? (
              <VisitorNavigator />
            ) : (
              <AuthNavigator />
            )}
          </NavigationContainer>
          <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
