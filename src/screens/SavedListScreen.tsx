import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { fetchSavedList, getAnimeByIdAsync } from '@/services/animeRepository';
import { useAppContext } from '@/state/AppContext';
import { getAnimeById as getMockAnimeById } from '@/services/animeRepository';
import type { Anime, SavedAnime, WatchStatus } from '@/types';

const TABS: { key: WatchStatus; label: string }[] = [
  { key: 'watching', label: 'Watching' },
  { key: 'completed', label: 'Completed' },
  { key: 'plan_to_watch', label: 'Plan to Watch' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'dropped', label: 'Dropped' },
];

interface SavedListScreenProps {
  userId: string;
  onSelectAnime: (anime: Anime) => void;
}

export function SavedListScreen({ onSelectAnime }: SavedListScreenProps) {
  const { userId, savedAnimeIds } = useAppContext();
  const [activeTab, setActiveTab] = useState<WatchStatus>('plan_to_watch');
  const [savedItems, setSavedItems] = useState<SavedAnime[]>([]);
  const [resolvedAnime, setResolvedAnime] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchSavedList(userId)
      .then(setSavedItems)
      .finally(() => setIsLoading(false));
  }, [userId, savedAnimeIds]);

  useEffect(() => {
    let cancelled = false;
    const forTab = savedItems.filter((sv) => sv.status === activeTab);
    (async () => {
      const results = await Promise.all(
        forTab.map((sv) => getAnimeByIdAsync(sv.animeId))
      );
      if (!cancelled) {
        setResolvedAnime(results.filter((a): a is Anime => Boolean(a)));
      }
    })();
    return () => { cancelled = true; };
  }, [savedItems, activeTab]);

  const itemsForTab = resolvedAnime;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.header}>Saved</Text>

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!isLoading && itemsForTab.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Nothing here yet. Swipe right on anime you want to watch and they'll show up here.
          </Text>
        </View>
      )}

      <FlatList
        data={itemsForTab}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onSelectAnime(item)}>
            <Image source={{ uri: item.posterUrl }} style={styles.poster} />
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardMeta}>{item.episodes} eps</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 24,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.violetDeep,
    borderColor: colors.violetCore,
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    flex: 1,
    marginBottom: spacing.md,
  },
  poster: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 13,
  },
  cardMeta: {
    ...typography.body,
    color: colors.textTertiary,
    fontSize: 11,
  },
  emptyState: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
