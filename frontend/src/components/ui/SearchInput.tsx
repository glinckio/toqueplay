import React, { useState, useCallback } from "react";
import { View, TextInput, Pressable, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Icon } from "./Icon";

export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = "Buscar...",
  style,
}: SearchInputProps) {
  const { isDark, colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = focused
    ? isDark ? "rgba(139,92,246,0.25)" : "rgba(124,58,237,0.2)"
    : isDark ? "rgba(255,255,255,0.08)" : "rgba(26,16,48,0.08)";

  const iconColor = focused
    ? isDark ? "#8B5CF6" : "#7C3AED"
    : colors.text.muted;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? "#141019" : "#FFFFFF",
          borderWidth: 1,
          borderColor,
          borderRadius: 14,
          paddingHorizontal: 15,
          paddingVertical: 11,
          gap: 10,
        },
        style,
      ]}
    >
      <Icon name="search" size={16} color={iconColor} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          fontFamily: "Manrope_500Medium",
          fontSize: 14,
          fontWeight: "500",
          color: colors.text.primary,
          padding: 0,
        }}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Icon name="close" size={14} color={colors.text.muted} />
        </Pressable>
      )}
    </View>
  );
}
