import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { useAppContext } from '@/state/AppContext';
import type { FranchiseSeason } from '@/services/anilistService';

interface SeasonsScreenProps {
  franchiseTitle: string;
  seasons: FranchiseSeason[];
  onBack: () => void;
  onSelectSeason: (season: FranchiseSeason) => void;
}

export function SeasonsScreen({
  franchiseTitle,
  seasons,
  onBack,
  onSelectSeason,
}: SeasonsScreenProps) {
  const { setStatus, statusById } = useAppContext();
  const [addingAll, setAddingAll] = useState(false);
  const [addedAll, setAddedAll] = useState(false);

  async function handleAddAll() {
    if (addingAll) return;
    setAddingAll(true);
    for (const s of seasons) {
      // Don't overwrite a season the user already tracked.
      if (!statusById[s.id]) {
        await setStatus(s.id, 'plan_to_watch');
      }
    }
    setAddingAll(false);
    setAddedAll(true);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={{ width: 64 }}>
          <Text style={styles.headerAction} numberOfLines={1}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          All Seasons
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.franchiseTitle}>{franchiseTitle}</Text>
        <Text style={styles.subtitle}>
          {seasons.length} season{seasons.length === 1 ? '' : 's'}
        </Text>

                {seasons.map((s) => {
          const status = statusById[s.id];
          return (
            <Pressable
              key={s.id}
              style={styles.row}
              onPress={() => onSelectSeason(s)}
            >
              <Image source={{ uri: s.posterUrl }} style={styles.poster} />
              <View style={styles.rowInfo}>
                <Text style={styles.seasonLabel}>Season {s.seasonNumber}</Text>
                <Text style={styles.seasonTitle} numberOfLines={2}>
                  {s.title}
                </Text>
                <Text style={styles.seasonMeta}>
                  {s.episodes > 0 ? `${s.episodes} eps` : 'Ongoing'}
                  {s.year ? ` · ${s.year}` : ''}
                </Text>
                {status && (
                  <Text style={styles.statusBadge}>
                    {status === 'plan_to_watch'
                      ? 'Plan to Watch'
                      : status === 'watching'
                      ? 'Watching'
                      : status === 'completed'
                      ? 'Completed'
                      : 'Dropped'}
                  </Text>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        })}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerAction: { ...typography.bodyMedium, color: colors.violetLight, fontSize: 16 },
  headerTitle: { ...typography.heading, color: colors.textPrimary, fontSize: 17 },
  content: { paddingHorizontal: spacing.lg },
  franchiseTitle: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  addAllButton: {
    backgroundColor: colors.violetCore,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addAllDisabled: { opacity: 0.6 },
  addAllText: { ...typography.bodyMedium, color: colors.white, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  rowInfo: { flex: 1 },
  seasonLabel: {
    ...typography.bodyMedium,
    color: colors.violetLight,
    fontSize: 12,
    marginBottom: 2,
  },
  seasonTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 2,
  },
  seasonMeta: { ...typography.body, color: colors.textSecondary, fontSize: 13 },
  statusBadge: {
    ...typography.body,
    color: colors.like,
    fontSize: 12,
    marginTop: 4,
  },
  chevron: { color: colors.textTertiary, fontSize: 22 },
});
