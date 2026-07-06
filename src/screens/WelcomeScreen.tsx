import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, spacing, typography } from '@/theme/tokens';

interface WelcomeScreenProps {
  onChooseAI: () => void;
  onChooseBrowse: () => void;
}

export function WelcomeScreen({ onChooseAI, onChooseBrowse }: WelcomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>What should we{'\n'}watch today?</Text>
        <Text style={styles.subtitle}>
          Tell the AI exactly what you're in the mood for, or browse on your own.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onChooseAI} style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient
            colors={gradients.wordmark}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiButton}
          >
            <Text style={styles.aiButtonEmoji}>✨</Text>
            <View style={styles.aiButtonTextWrap}>
              <Text style={styles.aiButtonTitle}>Let AI find my next anime</Text>
              <Text style={styles.aiButtonSub}>
                Describe a vibe, a show you loved, anything
              </Text>
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={onChooseBrowse}
          style={({ pressed }) => [styles.browseButton, pressed && styles.pressed]}
        >
          <Text style={styles.browseButtonText}>Browse on my own</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 20,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  aiButtonEmoji: {
    fontSize: 28,
  },
  aiButtonTextWrap: {
    flex: 1,
  },
  aiButtonTitle: {
    ...typography.heading,
    color: colors.white,
    fontSize: 17,
    marginBottom: 2,
  },
  aiButtonSub: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  browseButton: {
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  browseButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
