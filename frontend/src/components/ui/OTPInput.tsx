import React, { useRef, useCallback } from "react";
import { View, TextInput, Text, Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function OTPInput({ length = 6, value, onChange, error }: OTPInputProps) {
  const { isDark, colors } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const handlePress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      const digits = text.replace(/[^0-9]/g, "").slice(0, length);
      onChange(digits);
    },
    [length, onChange],
  );

  const digits = value.split("");

  return (
    <View>
      <Pressable
        onPress={handlePress}
        style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}
      >
        {Array.from({ length }, (_, i) => {
          const isActive = i === value.length && !error;
          const isFilled = i < value.length;
          const hasError = !!error;

          const borderColor = hasError
            ? "#EF4444"
            : isActive
              ? isDark ? "#C6F82A" : "rgba(124,58,237,0.3)"
              : isDark ? "rgba(255,255,255,0.08)" : "rgba(26,16,48,0.1)";

          return (
            <View
              key={i}
              style={{
                width: 40,
                height: 48,
                borderRadius: 14,
                borderWidth: isActive || hasError ? 2 : 1,
                borderColor,
                backgroundColor: isDark ? "#171320" : "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "SpaceGrotesk_700Bold",
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text.primary,
                }}
              >
                {digits[i] ?? ""}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
        autoComplete="one-time-code"
      />

      {error && (
        <Text
          style={{
            fontFamily: "Manrope_500Medium",
            fontSize: 11,
            fontWeight: "500",
            color: "#EF4444",
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
