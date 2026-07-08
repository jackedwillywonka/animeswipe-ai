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
import { signInWithEmail, signUpWithEmail } from '@/services/authService';

interface EmailAuthScreenProps {
  onBack: () => void;
  onAuthenticated: () => void;
}

export function EmailAuthScreen({ onBack, onAuthenticated }: EmailAuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleSubmit() {
    Keyboard.dismiss();
    const e = email.trim().toLowerCase();
    if (!e || password.length < 6) {
      setIsError(true);
      setMessage('Enter a valid email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signup') {
        const { session } = await signUpWithEmail(e, password);
        if (!session) {
          setIsError(false);
          setMessage('Almost there! Check your email for a confirmation link, then come back and sign in.');
        } else {
          onAuthenticated();
        }
      } else {
        const session = await signInWithEmail(e, password);
        if (session) onAuthenticated();
      }
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>‹ Back</Text>
      </Pressable>

      <View style={styles.form}>
        <Text style={styles.title}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (6+ characters)"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          secureTextEntry
        />

        {message && (
          <Text style={[styles.message, isError ? styles.messageError : styles.messageInfo]}>
            {message}
          </Text>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={busy}
          style={[styles.submitButton, busy && { opacity: 0.6 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>
              {mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setMessage(null);
          }}
        >
          <Text style={styles.switchText}>
            {mode === 'signin'
              ? "New here? Create an account"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    ...typography.bodyMedium,
    color: colors.violetLight,
    fontSize: 16,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 26,
    marginBottom: spacing.sm,
  },
  input: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 15,
  },
  message: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
  messageError: { color: colors.pass },
  messageInfo: { color: colors.like },
  submitButton: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.violetCore,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontSize: 16,
  },
  switchText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
