import React, { useState, useCallback } from "react";
import {
  View,
  TextInput,
  Text,
  Pressable,
  TextInputProps,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Icon, IconName } from "./Icon";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  style?: ViewStyle;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  secureTextEntry,
  style,
  ...rest
}: InputProps) {
  const { isDark, colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(secureTextEntry ?? false);

  const handleFocus = useCallback((e: any) => {
    setFocused(true);
    rest.onFocus?.(e);
  }, [rest.onFocus]);

  const handleBlur = useCallback((e: any) => {
    setFocused(false);
    rest.onBlur?.(e);
  }, [rest.onBlur]);

  const borderColor = error
    ? "#EF4444"
    : focused
      ? isDark ? "rgba(139,92,246,0.25)" : "rgba(124,58,237,0.2)"
      : isDark ? "rgba(255,255,255,0.08)" : "rgba(26,16,48,0.08)";

  const iconColor = focused
    ? isDark ? "#8B5CF6" : "#7C3AED"
    : colors.text.muted;

  return (
    <View style={style}>
      {label && (
        <Text
          style={{
            fontFamily: "Manrope_600SemiBold",
            fontSize: 12,
            fontWeight: "600",
            color: colors.text.tertiary,
            marginBottom: 8,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? "#141019" : "#FFFFFF",
          borderWidth: 1,
          borderColor,
          borderRadius: 14,
          paddingHorizontal: 15,
          paddingVertical: 13,
          gap: 10,
        }}
      >
        {leftIcon && <Icon name={leftIcon} size={15} color={iconColor} />}
        <TextInput
          {...rest}
          secureTextEntry={secure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.text.disabled}
          style={{
            flex: 1,
            fontFamily: "Manrope_500Medium",
            fontSize: 14,
            fontWeight: "500",
            color: colors.text.primary,
            padding: 0,
          }}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setSecure((s) => !s)} hitSlop={8}>
            <Icon name={secure ? "eye" : "eye-off"} size={15} color={iconColor} />
          </Pressable>
        )}
        {rightIcon && !secureTextEntry && (
          <Icon name={rightIcon} size={15} color={iconColor} />
        )}
      </View>
      {error && (
        <Text
          style={{
            fontFamily: "Manrope_500Medium",
            fontSize: 11,
            fontWeight: "500",
            color: "#EF4444",
            marginTop: 6,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
