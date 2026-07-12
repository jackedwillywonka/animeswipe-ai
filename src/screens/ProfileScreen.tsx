import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { useAppContext } from '@/state/AppContext';
import { getAnimeByIdAsync } from '@/services/animeRepository';
import { signOut } from '@/services/authService';
import { openCustomerPortal, getAiQuotaStatus } from '@/services/premiumService';
import { Pressable } from 'react-native';
import { pickAndUploadAvatar, getAvatarUrl } from '@/services/avatarService';
import { getUsername, setUsername as saveUsername } from '@/services/usernameService';
import type { UserStats } from '@/types';

interface ProfileScreenProps {
  username: string;
  stats: UserStats; // kept for compatibility; no longer displayed
}

export function ProfileScreen({ username }: ProfileScreenProps) {
  const { statusById, userId } = useAppContext();
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (userId) getAvatarUrl(userId).then(setAvatarUrl);
  }, [userId]);

  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);

  useEffect(() => {
    if (userId) getUsername(userId).then(setMyUsername);
  }, [userId]);

  async function handleSaveUsername() {
    if (savingUsername) return;
    setSavingUsername(true);
    setUsernameError(null);
    const result = await saveUsername(userId, usernameInput);
    if (result.ok) {
      setMyUsername(usernameInput.trim());
      setUsernameInput('');
      setEditingUsername(false);
    } else {
      setUsernameError(result.error ?? 'Try again.');
    }
    setSavingUsername(false);
  }

  const [isPremium, setIsPremium] = useState(false);
  useEffect(() => {
    if (userId) getAiQuotaStatus(userId).then((q) => setIsPremium(q.isPremium));
  }, [userId]);

  async function handleChangeAvatar() {
    if (!userId || uploadingAvatar) return;
    setUploadingAvatar(true);
    const url = await pickAndUploadAvatar(userId);
    if (url) setAvatarUrl(url);
    setUploadingAvatar(false);
  }

  const completedIds = Object.keys(statusById).filter(
    (id) => statusById[id] === 'completed'
  );

  // Sum episode counts for everything marked Completed.
  // Finished shows use their full count; ongoing shows (e.g. One Piece)
  // count all episodes aired so far - if you say you completed it, you earned it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let total = 0;
      for (const id of completedIds) {
        const anime = await getAnimeByIdAsync(id).catch(() => undefined);
        if (!anime) continue;
        if (anime.episodes > 0) {
          total += anime.episodes;
        } else if (anime.nextAiring?.episode) {
          total += anime.nextAiring.episode - 1;
        }
      }
      if (!cancelled) setEpisodesWatched(total);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(completedIds)]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={handleChangeAvatar} style={styles.avatar}>
            {uploadingAvatar ? (
              <ActivityIndicator color={colors.white} />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{username.charAt(0).toUpperCase()}</Text>
            )}
          </Pressable>
          <Pressable onPress={handleChangeAvatar}>
            <Text style={styles.avatarHint}>Tap photo to change</Text>
          </Pressable>
          {myUsername && !editingUsername ? (
            <Pressable onPress={() => { setUsernameInput(myUsername); setEditingUsername(true); }}>
              <Text style={styles.username}>@{myUsername}</Text>
              <Text style={styles.avatarHint}>Tap to edit</Text>
            </Pressable>
          ) : (
            <View style={styles.usernameSetBox}>
              {!myUsername && (
                <Text style={styles.usernameSetLabel}>Pick a username</Text>
              )}
              <View style={styles.usernameRow}>
                <TextInput
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  placeholder="username"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.usernameInput}
                />
                <Pressable
                  onPress={handleSaveUsername}
                  disabled={savingUsername}
                  style={styles.usernameSaveButton}
                >
                  <Text style={styles.usernameSaveText}>{savingUsername ? '…' : 'Save'}</Text>
                </Pressable>
              </View>
              {usernameError && <Text style={styles.usernameError}>{usernameError}</Text>}
            </View>
          )}
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>{episodesWatched.toLocaleString()}</Text>
          <Text style={styles.heroLabel}>Episodes Watched</Text>
        </View>

        <View style={styles.subCard}>
          <Text style={styles.subValue}>{completedIds.length.toLocaleString()}</Text>
          <Text style={styles.subLabel}>Anime Completed</Text>
        </View>

        <Pressable
          onPress={() => signOut()}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {isPremium && (
          <Pressable
            onPress={() => openCustomerPortal(userId)}
            style={styles.manageButton}
          >
            <Text style={styles.manageText}>Manage Subscription</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    overflow: 'hidden',
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.violetCore,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarHint: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  avatarInitial: {
    ...typography.display,
    color: colors.white,
    fontSize: 36,
  },
  usernameSetBox: { alignItems: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
  usernameSetLabel: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  usernameInput: {
    minWidth: 160,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    fontSize: 15,
  },
  usernameSaveButton: {
    height: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.violetCore,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameSaveText: { ...typography.bodyMedium, color: colors.white, fontSize: 14 },
  usernameError: {
    ...typography.body,
    color: colors.pass,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  username: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 20,
  },
  heroCard: {
    backgroundColor: colors.violetDeep,
    borderWidth: 1.5,
    borderColor: colors.violetCore,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroValue: {
    ...typography.display,
    color: colors.violetLight,
    fontSize: 56,
  },
  heroLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  subCard: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  subValue: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 34,
  },
  manageButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  manageText: {
    ...typography.body,
    color: colors.violetLight,
    fontSize: 13,
  },
  signOutButton: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutText: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
    fontSize: 14,
  },
  subLabel: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
