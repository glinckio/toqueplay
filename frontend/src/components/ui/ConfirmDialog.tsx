import React from "react";
import { Modal, View, Text, Pressable, ActivityIndicator } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

/**
 * DNA custom confirm dialog — replaces native Alert.alert.
 * Card, Anton title, Manrope body, purple notched action button.
 */
function useDialogColors() {
  const { isDark, colors } = useTheme();
  return {
    card: isDark ? "#16181C" : colors.bg.card,
    cardBorder: colors.border.card,
    purple: "#7C3AED",
    lime: "#C6F82A",
    danger: "#FF4D5E",
    tx: colors.text.primary,
    tx2: colors.text.tertiary,
    // Always white — sits on the fixed-color purple/danger confirm button, not the card bg.
    onAccent: "#FFFFFF",
    cancelBorder: colors.border.ghost,
    overlay: isDark ? "rgba(0,0,0,0.72)" : "rgba(26,16,48,0.4)",
  };
}

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  children?: React.ReactNode;
  /** `null` esconde o botao de cancelar — util para dialogo de aviso, com uma acao so. */
  cancelLabel?: string | null;
  actionLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  danger?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  children,
  cancelLabel = "Cancelar",
  actionLabel,
  onCancel,
  onConfirm,
  loading = false,
  danger = false,
}: ConfirmDialogProps) {
  const D = useDialogColors();
  const accent = danger ? D.danger : D.purple;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Alguns dialogos tem campo de texto (ex.: codigo de arbitro). Sem isto o teclado sobe
          por cima do card, que fica centralizado e nao tem como escapar. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: D.overlay, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <Pressable onPress={onCancel} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} accessibilityLabel="Fechar" />

        <View style={{ width: "100%", maxWidth: 380, backgroundColor: D.card, borderWidth: 1, borderColor: D.cardBorder, borderRadius: 22, padding: 22 }}>
          <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: accent, marginBottom: 14 }} />

          <Text style={{ color: D.tx, fontFamily: "Anton_400Regular", fontSize: 20, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 10 }}>
            {title}
          </Text>

          {children ? (
            children
          ) : message ? (
            <Text style={{ color: D.tx2, fontFamily: "Manrope_500Medium", fontSize: 13.5, lineHeight: 20 }}>
              {message}
            </Text>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
            {cancelLabel !== null && (
            <Pressable
              onPress={onCancel}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: D.cancelBorder, alignItems: "center", justifyContent: "center", opacity: loading ? 0.5 : 1 }}
            >
              <Text style={{ color: D.tx2, fontFamily: "Oswald_700Bold", fontSize: 12.5, letterSpacing: 1, textTransform: "uppercase" }}>{cancelLabel}</Text>
            </Pressable>
            )}
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: accent, alignItems: "center", justifyContent: "center", opacity: loading ? 0.7 : 1, flexDirection: "row", gap: 6 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={D.onAccent} />
              ) : (
                <>
                  <Text style={{ color: D.onAccent, fontFamily: "Oswald_700Bold", fontSize: 12.5, letterSpacing: 1, textTransform: "uppercase" }}>{actionLabel}</Text>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={D.onAccent} strokeWidth={2.8}><Path d="M5 12h14M13 6l6 6-6 6" /></Svg>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
