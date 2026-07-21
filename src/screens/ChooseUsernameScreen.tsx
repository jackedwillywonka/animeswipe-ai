import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { setUsername as saveUsername } from '@/services/usernameService';

interface ChooseUsernameScreenProps {
  userId: string;
  onDone: () => void;
}

export function ChooseUsernameScreen({ userId, onDone }: ChooseUsernameScreenProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (busy) return;
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    const result = await saveUsername(userId, value);
    if (result.ok) {
      onDone();
    } else {
      setError(result.error ?? 'Try again.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Pick a username</Text>
        <Text style={styles.subtitle}>
          This is how you'll show up in AnimeSwipe. You can change it later.
        </Text>

        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="username"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          onSubmitEditing={handleSave}
        />

        <Text style={styles.rules}>3–20 characters · letters, numbers, underscores</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={busy}
          style={[styles.button, busy && { opacity: 0.6 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: spacing.xl,
  },
  input: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 17,
  },
  rules: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  error: {
    ...typography.body,
    color: colors.pass,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  button: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.violetCore,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { ...typography.bodyMedium, color: colors.white, fontSize: 16 },
});
