import React from "react";
import { View, Pressable, Text } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName } from "@/components/ui/Icon";
import { useTheme } from "@/hooks/useTheme";

type TabConfig = {
  name: string;
  label: string;
  icon: IconName;
  isCentral?: boolean;
};

const MAIN_TABS: TabConfig[] = [
  { name: "Home", label: "Início", icon: "home" },
  { name: "Explore", label: "Explorar", icon: "search" },
  { name: "Create", label: "Criar", icon: "plus", isCentral: true },
  { name: "Friendlies", label: "Amistosos", icon: "volleyball" },
  { name: "Profile", label: "Perfil", icon: "user" },
];

const VISITOR_TABS: TabConfig[] = [
  { name: "VisitorHome", label: "Início", icon: "home" },
  { name: "VisitorExplore", label: "Explorar", icon: "search" },
  { name: "VisitorLogin", label: "Entrar", icon: "user" },
];

export interface CustomBottomTabBarProps extends BottomTabBarProps {
  isVisitor?: boolean;
}

export function BottomTabBar({
  state,
  navigation,
  descriptors,
  isVisitor = false,
}: CustomBottomTabBarProps) {
  const { isDark, colors } = useTheme();
  const C = {
    bar: isDark ? "#1E2027" : colors.bg.card,
    border: isDark ? "rgba(198,248,42,0.16)" : colors.border.card,
    purple: "#7C3AED",
    lime: "#C6F82A",
    limeInk: "#12100A",
    active: colors.text.primary,
    inactive: colors.text.disabled,
  };
  const insets = useSafeAreaInsets();
  const tabs = isVisitor ? VISITOR_TABS : MAIN_TABS;

  // Screens can hide the floating bar while they're showing their own
  // full-screen state (e.g. Home's location-gate splash) via
  // navigation.setOptions({ tabBarStyle: { display: "none" } }).
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;
  if ((focusedOptions?.tabBarStyle as any)?.display === "none") {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 18,
        paddingBottom: Math.max(insets.bottom, 10) + 10,
        backgroundColor: "transparent",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: C.bar,
          borderWidth: 1.5,
          borderColor: C.border,
          borderRadius: 28,
          paddingTop: 10,
          paddingBottom: 10,
          paddingHorizontal: 8,
          shadowColor: "#000",
          shadowOpacity: 0.5,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 14,
        }}
      >
        {state.routes.map((route, index) => {
          const tab = tabs.find((t) => t.name === route.name) ?? tabs[index];
          if (!tab) return null;
          const isActive = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isActive && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (tab.isCentral) {
            return (
              <View key={route.key} style={{ flex: 1, alignItems: "center" }}>
                <Pressable
                  onPress={onPress}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: C.lime,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: -36,
                    borderWidth: 4,
                    borderColor: C.bar,
                    shadowColor: C.lime,
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <Icon name={tab.icon} size={28} color={C.limeInk} strokeWidth={2.8} />
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 }}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              <Icon name={tab.icon} size={21} color={isActive ? C.lime : C.inactive} strokeWidth={isActive ? 2.4 : 2} />
              <Text
                style={{
                  color: isActive ? C.active : C.inactive,
                  fontFamily: "Oswald_600SemiBold",
                  fontSize: 9.5,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
