import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows } from '@/theme/tokens';

interface SwipeActionButtonsProps {
  onPass: () => void;
  onLike: () => void;
  disabled?: boolean;
}

export function SwipeActionButtons({ onPass, onLike, disabled }: SwipeActionButtonsProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPass}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          styles.passButton,
          shadows.glow(colors.pass),
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.icon, { color: colors.pass }]}>✕</Text>
      </Pressable>

      <Pressable
        onPress={onLike}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          styles.likeButton,
          shadows.glow(colors.like),
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.icon, { color: colors.like }]}>♥</Text>
      </Pressable>
    </View>
  );
}

const BUTTON_SIZE = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  passButton: {
    borderColor: colors.pass,
  },
  likeButton: {
    borderColor: colors.like,
  },
  icon: {
    fontSize: 28,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
