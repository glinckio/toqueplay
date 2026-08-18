import React from "react";
import { View, Text, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type BadgeStatus =
  | "paid"
  | "accepted"
  | "open"
  | "pending"
  | "rejected"
  | "cancelled"
  | "in_progress"
  | "captain"
  | "member";

export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  status: BadgeStatus;
  label?: string;
  size?: BadgeSize;
}

const STATUS_LABELS: Record<BadgeStatus, string> = {
  paid: "PAGO",
  accepted: "ACEITO",
  open: "ABERTO",
  pending: "PENDENTE",
  rejected: "RECUSADO",
  cancelled: "CANCELADO",
  in_progress: "EM ANDAMENTO",
  captain: "CAPITÃO",
  member: "MEMBRO",
};

function getStatusColors(status: BadgeStatus, isDark: boolean) {
  switch (status) {
    case "paid":
    case "accepted":
    case "open":
      return isDark
        ? { color: "#C6F82A", bg: "rgba(198,248,42,0.1)" }
        : { color: "#059669", bg: "rgba(5,150,105,0.08)" };
    case "pending":
      return isDark
        ? { color: "#FBBF24", bg: "rgba(251,191,36,0.12)" }
        : { color: "#D97706", bg: "rgba(217,119,6,0.08)" };
    case "rejected":
      return isDark
        ? { color: "#EF4444", bg: "rgba(239,68,68,0.1)" }
        : { color: "#EF4444", bg: "rgba(239,68,68,0.08)" };
    case "cancelled":
      return isDark
        ? { color: "#6E6684", bg: "rgba(110,102,132,0.1)" }
        : { color: "#8A829E", bg: "rgba(26,16,48,0.05)" };
    case "in_progress":
      return isDark
        ? { color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" }
        : { color: "#7C3AED", bg: "rgba(124,58,237,0.08)" };
    case "captain":
    case "member":
      return isDark
        ? { color: "#C6F82A", bg: "rgba(198,248,42,0.1)" }
        : { color: "#7C3AED", bg: "rgba(124,58,237,0.08)" };
  }
}

export function Badge({ status, label, size = "md" }: BadgeProps) {
  const { isDark } = useTheme();
  const { color, bg } = getStatusColors(status, isDark);
  const displayLabel = label ?? STATUS_LABELS[status];
  const isSm = size === "sm";

  const containerStyle: ViewStyle = {
    backgroundColor: bg,
    borderRadius: isSm ? 6 : 8,
    paddingVertical: isSm ? 4 : 5,
    paddingHorizontal: isSm ? 8 : 10,
    alignSelf: "flex-start",
  };

  const textStyle: TextStyle = {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: isSm ? 9 : 10,
    fontWeight: "700",
    letterSpacing: isSm ? 0.06 * 9 : 0.06 * 10,
    color,
    textTransform: "uppercase",
  };

  return (
    <View style={containerStyle} accessibilityRole="text">
      <Text style={textStyle}>{displayLabel}</Text>
    </View>
  );
}
