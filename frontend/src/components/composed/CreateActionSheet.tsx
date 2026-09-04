import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useNavigation } from "@react-navigation/native";
import { Icon, IconName } from "@/components/ui/Icon";
import Svg, { Path } from "react-native-svg";

interface CreateActionSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface ActionOption {
  icon: IconName;
  label: string;
  description: string;
  screen: string;
}

const OPTIONS: ActionOption[] = [
  { icon: "trophy", label: "Criar torneio", description: "Organize um evento competitivo", screen: "CreateTournament" },
  { icon: "volleyball", label: "Criar amistoso", description: "Desafie outro time para jogar", screen: "CreateFriendly" },
  { icon: "users", label: "Criar time", description: "Monte sua equipe de vôlei", screen: "CreateTeam" },
];

export function CreateActionSheet({ visible, onClose }: CreateActionSheetProps) {
  const { isDark } = useTheme();
  const navigation = useNavigation<any>();
  const accentColor = isDark ? "#C6F82A" : "#7C3AED";
  const titleColor = isDark ? "#F5F3FA" : "#1A1428";
  const metaColor = isDark ? "#948CA8" : "#847B98";
  const cardBg = isDark ? "#141019" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,.07)" : "rgba(26,16,48,.07)";
  const sheetBg = isDark ? "#161222" : "#FFFFFF";
  const handleColor = isDark ? "rgba(255,255,255,.15)" : "rgba(26,16,48,.12)";
  const infoBg = isDark ? "#1C1630" : "#F0ECFA";

  const handleSelect = (screen: string) => {
    onClose();
    setTimeout(() => navigation.navigate(screen), 150);
  };

  const screenHeight = Dimensions.get("window").height;
  const [rendered, setRendered] = useState(visible);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(screenHeight);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: screenHeight, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(6,4,10,.6)", justifyContent: "flex-end", opacity: overlayOpacity }}>
        <Pressable
          style={{ flex: 1, justifyContent: "flex-end" }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        >
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: sheetBg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: 40,
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: handleColor }} />
          </View>

          {/* Title */}
          <Text style={{
            color: titleColor,
            fontFamily: "SpaceGrotesk_700Bold",
            fontSize: 18,
            fontWeight: "700",
            paddingHorizontal: 22,
            marginBottom: 16,
          }}>
            O que você quer criar?
          </Text>

          {/* Options */}
          <View style={{ paddingHorizontal: 22, gap: 10 }}>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.screen}
                onPress={() => handleSelect(opt.screen)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: cardBorder,
                  borderRadius: 16,
                  padding: 16,
                  ...(isDark ? {} : {
                    shadowColor: "rgba(46,16,101,.15)",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 1,
                    shadowRadius: 10,
                    elevation: 1,
                  }),
                }}
              >
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: infoBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Icon name={opt.icon} size={20} color={isDark ? "#8B5CF6" : "#7C3AED"} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: titleColor,
                    fontFamily: "SpaceGrotesk_700Bold",
                    fontSize: 15,
                    fontWeight: "700",
                  }}>
                    {opt.label}
                  </Text>
                  <Text style={{
                    color: metaColor,
                    fontFamily: "Manrope_500Medium",
                    fontSize: 12,
                    fontWeight: "500",
                    marginTop: 2,
                  }}>
                    {opt.description}
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color={isDark ? "#6E6684" : "#C3BCD4"} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        </Pressable>
        </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
