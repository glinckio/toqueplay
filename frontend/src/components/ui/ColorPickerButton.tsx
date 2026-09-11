import React, { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Modal, PanResponder, TextInput } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { hsvToHex, hexToHsv, isValidHex } from "@/utils/color";

const SQUARE = 240;
const HUE_STOPS = ["#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF", "#FF0000"] as const;

export function ColorPickerButton({
  value,
  onChange,
  defaultColor = "#C6F82A",
  accessibilityLabel,
}: {
  value: string | null | undefined;
  onChange: (color: string | null) => void;
  defaultColor?: string;
  accessibilityLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const swatchColor = value || defaultColor;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: swatchColor,
          borderWidth: 1.5, borderColor: "rgba(128,128,128,0.35)",
          alignItems: "center", justifyContent: "center",
        }}
      >
        {!value && (
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#12100A" strokeWidth={2}>
            <Path d="M12 2v20M2 12h20" strokeLinecap="round" />
          </Svg>
        )}
      </Pressable>

      {open && (
        <ColorPickerModal
          initial={value || defaultColor}
          onCancel={() => setOpen(false)}
          onConfirm={(hex) => { onChange(hex); setOpen(false); }}
          onReset={() => { onChange(null); setOpen(false); }}
          showReset={!!value}
        />
      )}
    </>
  );
}

function ColorPickerModal({
  initial,
  onCancel,
  onConfirm,
  onReset,
  showReset,
}: {
  initial: string;
  onCancel: () => void;
  onConfirm: (hex: string) => void;
  onReset: () => void;
  showReset: boolean;
}) {
  const initHsv = useMemo(() => hexToHsv(initial), [initial]);
  const [h, setH] = useState(initHsv.h);
  const [s, setS] = useState(initHsv.s);
  const [v, setV] = useState(initHsv.v);
  const [hexInput, setHexInput] = useState(initial.toUpperCase());

  const hex = hsvToHex(h, s, v);
  const hueColor = hsvToHex(h, 1, 1);

  const syncFromHex = (text: string) => {
    setHexInput(text);
    const withHash = text.startsWith("#") ? text : `#${text}`;
    if (isValidHex(withHash)) {
      const next = hexToHsv(withHash);
      setH(next.h); setS(next.s); setV(next.v);
    }
  };

  const squarePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const clampedX = Math.min(Math.max(locationX, 0), SQUARE);
        const clampedY = Math.min(Math.max(locationY, 0), SQUARE);
        const nextS = clampedX / SQUARE;
        const nextV = 1 - clampedY / SQUARE;
        setS(nextS); setV(nextV);
        setHexInput(hsvToHex(h, nextS, nextV));
      },
    })
  ).current;

  const hueBarPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const { locationX } = evt.nativeEvent;
        const clampedX = Math.min(Math.max(locationX, 0), SQUARE);
        const nextH = (clampedX / SQUARE) * 360;
        setH(nextH);
        setHexInput(hsvToHex(nextH, s, v));
      },
    })
  ).current;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      {/* O campo hex fica no rodape do card centralizado: sem isto o teclado cobre ele. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: "#16181C", borderRadius: 24, padding: 20, width: "100%", maxWidth: 320, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
          <Text style={{ color: "#FFFFFF", fontFamily: "Anton_400Regular", fontSize: 18, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 16 }}>Escolher cor</Text>

          {/* Saturation/Value square */}
          <View
            {...squarePan.panHandlers}
            style={{ width: SQUARE, height: SQUARE, borderRadius: 14, overflow: "hidden", backgroundColor: hueColor, alignSelf: "center" }}
          >
            <LinearGradient colors={["#FFFFFF", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
            <LinearGradient colors={["rgba(0,0,0,0)", "#000000"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
            <View pointerEvents="none" style={{ position: "absolute", left: s * SQUARE - 9, top: (1 - v) * SQUARE - 9, width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: "#FFFFFF", backgroundColor: hex }} />
          </View>

          {/* Hue bar */}
          <View {...hueBarPan.panHandlers} style={{ width: SQUARE, height: 24, borderRadius: 12, overflow: "hidden", alignSelf: "center", marginTop: 16 }}>
            <LinearGradient colors={HUE_STOPS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
            <View pointerEvents="none" style={{ position: "absolute", left: (h / 360) * SQUARE - 3, top: -2, width: 6, height: 28, borderRadius: 3, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.3)" }} />
          </View>

          {/* Preview + hex input */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: hex, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }} />
            <TextInput
              value={hexInput}
              onChangeText={syncFromHex}
              autoCapitalize="characters"
              maxLength={7}
              placeholder="#C6F82A"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={{ flex: 1, backgroundColor: "#0F1013", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, color: "#FFFFFF", fontFamily: "Manrope_600SemiBold", fontSize: 14 }}
              accessibilityLabel="Código hexadecimal da cor"
            />
          </View>

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            {showReset && (
              <Pressable onPress={onReset} accessibilityRole="button" accessibilityLabel="Remover cor customizada" style={{ paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Padrão</Text>
              </Pressable>
            )}
            <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancelar" style={{ flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Oswald_600SemiBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={() => onConfirm(isValidHex(hex) ? hex : initial)} accessibilityRole="button" accessibilityLabel="Confirmar cor" style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: "#7C3AED", alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontFamily: "Oswald_700Bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
