import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { UserStats } from '@/types';

interface ProfileScreenProps {
  username: string;
  stats: UserStats;
}

const BADGES = [
  { id: 'first_anime', label: 'First Watch', emoji: '🎬', unlocked: true },
  { id: 'hundred_eps', label: '100 Episodes', emoji: '💯', unlocked: true },
  { id: 'hidden_gem', label: 'Hidden Gem Hunter', emoji: '💎', unlocked: false },
  { id: 'streak_100', label: '100-Day Streak', emoji: '🔥', unlocked: false },
];

export function ProfileScreen({ username, stats }: ProfileScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{username.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>{username}</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Watched" value={stats.animeWatched} />
          <StatCard label="Liked" value={stats.animeLiked} />
          <StatCard label="Skipped" value={stats.animeSkipped} />
          <StatCard label="Hours Watched" value={stats.hoursWatched} />
          <StatCard label="Watch Streak" value={`${stats.watchStreakDays}d`} />
        </View>

        <Section title="Favorite Genres">
          <View style={styles.pillRow}>
            {stats.favoriteGenres.length > 0 ? (
              stats.favoriteGenres.map((genre) => (
                <View key={genre} style={styles.pill}>
                  <Text style={styles.pillText}>{genre}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Keep swiping to build your taste profile.</Text>
            )}
          </View>
        </Section>

        <Section title="Favorite Studios">
          <View style={styles.pillRow}>
            {stats.favoriteStudios.length > 0 ? (
              stats.favoriteStudios.map((studio) => (
                <View key={studio} style={styles.pill}>
                  <Text style={styles.pillText}>{studio}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No standout studio yet.</Text>
            )}
          </View>
        </Section>

        <Section title="Badges">
          <View style={styles.badgeGrid}>
            {BADGES.map((badge) => (
              <View
                key={badge.id}
                style={[styles.badge, !badge.unlocked && styles.badgeLocked]}
              >
                <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                <Text style={[styles.badgeLabel, !badge.unlocked && styles.badgeLabelLocked]}>
                  {badge.label}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    ...typography.display,
    color: colors.violetLight,
    fontSize: 22,
  },
  statLabel: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 13,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.violetDeep,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  badgeLocked: {
    backgroundColor: colors.surfaceGlass,
    opacity: 0.5,
  },
  badgeEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  badgeLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 12,
    textAlign: 'center',
  },
  badgeLabelLocked: {
    color: colors.textTertiary,
  },
});
