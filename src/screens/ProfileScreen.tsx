import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { useAppContext } from '@/state/AppContext';
import { getAnimeByIdAsync } from '@/services/animeRepository';
import { signOut } from '@/services/authService';
import { Pressable } from 'react-native';
import type { UserStats } from '@/types';

interface ProfileScreenProps {
  username: string;
  stats: UserStats; // kept for compatibility; no longer displayed
}

export function ProfileScreen({ username }: ProfileScreenProps) {
  const { statusById } = useAppContext();
  const [episodesWatched, setEpisodesWatched] = useState(0);

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
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{username.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>{username}</Text>
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
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.violetCore,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarInitial: {
    ...typography.display,
    color: colors.white,
    fontSize: 36,
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
