import React from "react";
import { View, Pressable, Text, ViewStyle } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { Icon, IconName } from "@/components/ui/Icon";

type TabConfig = {
  label: string;
  icon: IconName;
  isCentral?: boolean;
};

const MAIN_TABS: TabConfig[] = [
  { label: "Início", icon: "home" },
  { label: "Explorar", icon: "search" },
  { label: "Criar", icon: "plus", isCentral: true },
  { label: "Amistosos", icon: "volleyball" },
  { label: "Perfil", icon: "user" },
];

const VISITOR_TABS: TabConfig[] = [
  { label: "Início", icon: "home" },
  { label: "Explorar", icon: "search" },
  { label: "Entrar", icon: "user" },
];

export interface CustomBottomTabBarProps extends BottomTabBarProps {
  isVisitor?: boolean;
}

export function BottomTabBar({
  state,
  descriptors,
  navigation,
  isVisitor = false,
}: CustomBottomTabBarProps) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabs = isVisitor ? VISITOR_TABS : MAIN_TABS;
  const activeColor = isDark ? "#C6F82A" : "#7C3AED";
  const inactiveColor = isDark ? "#6E6684" : "#A29CB4";

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: isDark ? "#0C0A12" : "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(26,16,48,0.06)",
        paddingTop: 10,
        paddingHorizontal: 22,
        paddingBottom: Math.max(insets.bottom, 12) + 20,
      }}
    >
      {state.routes.map((route, index) => {
        const tab = tabs[index];
        if (!tab) return null;
        const isActive = state.index === index;
        const color = isActive ? activeColor : inactiveColor;

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
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: "#7C3AED",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -16,
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Icon
                  name={tab.icon}
                  size={22}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                />
              </Pressable>
              <Text
                style={{
                  fontFamily: "Manrope_600SemiBold",
                  fontSize: 10,
                  fontWeight: "600",
                  color,
                  marginTop: 4,
                }}
              >
                {tab.label}
              </Text>
            </View>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{ flex: 1, alignItems: "center" }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Icon name={tab.icon} size={22} color={color} />
            <Text
              style={{
                fontFamily: "Manrope_600SemiBold",
                fontSize: 10,
                fontWeight: "600",
                color,
                marginTop: 4,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
