import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';

interface LoginScreenProps {
  onLoginGoogle: () => void;
  onLoginApple: () => void;
  onLoginEmail: () => void;
}

export function LoginScreen({ onLoginGoogle, onLoginApple, onLoginEmail }: LoginScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.wordmark}>
          Anime<Text style={{ color: colors.pink }}>Swipe</Text> AI
        </Text>
        <Text style={styles.tagline}>Swipe your way to your next obsession.</Text>
      </View>

      <View style={styles.actions}>
        <AuthButton label="Continue with Google" onPress={onLoginGoogle} variant="filled" />
        <AuthButton label="Continue with Email" onPress={onLoginEmail} variant="outline" />
        <Text style={styles.hint}>
          An in-app browser can sometimes block Google sign-in — use email, or open in Safari to continue with Google.
        </Text>
      </View>

      <Text style={styles.legal}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </SafeAreaView>
  );
}

function AuthButton({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant: 'filled' | 'outline';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'filled' ? styles.buttonFilled : styles.buttonOutline,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={variant === 'filled' ? styles.buttonTextFilled : styles.buttonTextOutline}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: spacing.lg,
  },
  wordmark: {
    ...typography.display,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
  },
  actions: {
    gap: spacing.md,
  },
  button: {
    height: 52,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonFilled: {
    backgroundColor: colors.textPrimary,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceGlass,
  },
  buttonTextFilled: {
    ...typography.bodyMedium,
    color: colors.background,
    fontSize: 16,
  },
  buttonTextOutline: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 16,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  legal: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
  },
});
