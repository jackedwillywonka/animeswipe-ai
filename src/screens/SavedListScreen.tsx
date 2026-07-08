import React, { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { fetchSavedList, getAnimeByIdAsync } from '@/services/animeRepository';
import {
  fetchFranchiseInfo,
  getCachedFranchiseInfo,
  type FranchiseInfo,
} from '@/services/anilistService';
import { useAppContext } from '@/state/AppContext';
import type { Anime, SavedAnime, WatchStatus } from '@/types';

const TABS: { key: WatchStatus; label: string }[] = [
  { key: 'watching', label: 'Watching' },
  { key: 'completed', label: 'Completed' },
  { key: 'plan_to_watch', label: 'Plan to Watch' },
  { key: 'dropped', label: 'Dropped' },
];

interface SavedListScreenProps {
  onSelectAnime: (anime: Anime) => void;
}

interface ResolvedItem {
  anime: Anime;
  savedAt: string;
}

export function SavedListScreen({ onSelectAnime }: SavedListScreenProps) {
  const { userId, savedAnimeIds, favoriteIds, statusById, statusChangedAt, restoreDroppedAnime } = useAppContext();
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WatchStatus>('plan_to_watch');
  const [savedItems, setSavedItems] = useState<SavedAnime[]>([]);
  const [resolvedItems, setResolvedItems] = useState<ResolvedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [franchiseById, setFranchiseById] = useState<Record<string, FranchiseInfo>>({});

  // Load franchise info for visible cards: cache first (instant), then fill
  // gaps one at a time with a delay so we never hammer AniList.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing: string[] = [];
      const fromCache: Record<string, FranchiseInfo> = {};
      for (const item of resolvedItems) {
        const cached = getCachedFranchiseInfo(item.anime.id);
        if (cached) fromCache[item.anime.id] = cached;
        else missing.push(item.anime.id);
      }
      if (Object.keys(fromCache).length > 0 && !cancelled) {
        setFranchiseById((prev) => ({ ...prev, ...fromCache }));
      }
      for (const id of missing) {
        if (cancelled) return;
        const info = await fetchFranchiseInfo(id).catch(() => null);
        if (info && !cancelled) {
          setFranchiseById((prev) => ({ ...prev, [id]: info }));
        }
        await new Promise((r) => setTimeout(r, 400));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedItems]);

  // Reload the saved list whenever the user's saved set changes or favorites change
  useEffect(() => {
    if (!userId) return;
    fetchSavedList(userId)
      .then(setSavedItems)
      .finally(() => setIsLoading(false));
  }, [userId, savedAnimeIds, favoriteIds]);

  // Resolve anime details for the active tab, sorted newest-first.
  // statusById (in-memory, updated instantly on button tap) is the source of
  // truth for WHICH section an anime is in; the Supabase fetch supplies savedAt.
  useEffect(() => {
    let cancelled = false;
    const fetchedById = new Map(savedItems.map((sv) => [sv.animeId, sv]));
    const allIds = new Set<string>([
      ...savedItems.map((sv) => sv.animeId),
      ...Object.keys(statusById),
    ]);
    const merged = Array.from(allIds).map((animeId) => ({
      animeId,
      status: statusById[animeId] ?? fetchedById.get(animeId)?.status ?? '',
      // In-memory change time wins over the (possibly stale) fetched one,
      // so a just-moved anime always sorts to the top of its new section.
      savedAt:
        statusChangedAt[animeId] ??
        fetchedById.get(animeId)?.savedAt ??
        new Date().toISOString(),
    }));
    const forTab = merged
      .filter((sv) => sv.status === activeTab)
      .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || '')); // newest first
    (async () => {
      const results = await Promise.all(
        forTab.map(async (sv) => {
          const anime = await getAnimeByIdAsync(sv.animeId);
          return anime ? { anime, savedAt: sv.savedAt } : null;
        })
      );
      if (!cancelled) {
        setResolvedItems(results.filter((r): r is ResolvedItem => Boolean(r)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [savedItems, activeTab, statusById, statusChangedAt]);

  async function handleRestore() {
    const ids = await restoreDroppedAnime();
    setRestoreMsg(
      ids.length > 0
        ? `Restored ${ids.length} anime to your swipe deck!`
        : 'No dropped anime to restore.'
    );
    setSavedItems((prev) => prev.filter((s) => !ids.includes(s.animeId)));
    setTimeout(() => setRestoreMsg(null), 2500);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.header}>My Library</Text>

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

      {activeTab === 'dropped' && (
        <Pressable style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreButtonText}>↻ Restore all dropped to swipe deck</Text>
        </Pressable>
      )}
      {restoreMsg && <Text style={styles.restoreMsg}>{restoreMsg}</Text>}

      {!isLoading && resolvedItems.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Nothing here yet. Swipe on anime and they'll show up in these sections.
          </Text>
        </View>
      )}

      <FlatList
        data={resolvedItems}
        keyExtractor={(item) => item.anime.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onSelectAnime(item.anime)}>
            <View>
              <Image source={{ uri: item.anime.posterUrl }} style={styles.poster} />
              {favoriteIds.has(item.anime.id) && (
                <View style={styles.heartBadge}>
                  <Text style={styles.heartBadgeText}>♥</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.anime.title}
            </Text>
            <Text style={styles.cardMeta}>
              {(() => {
                const FORMAT_LABELS: Record<string, string> = {
                  MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music Video',
                };
                if (item.anime.format && FORMAT_LABELS[item.anime.format])
                  return FORMAT_LABELS[item.anime.format];
                const fr = franchiseById[item.anime.id];
                if (item.anime.episodes > 0) {
                  if (fr && fr.totalSeasons > 1) return `${item.anime.episodes} eps (this season)`;
                  if (fr) return `${item.anime.episodes} eps (total)`;
                  return `${item.anime.episodes} eps`;
                }
                if (item.anime.nextAiring?.episode)
                  return `${item.anime.nextAiring.episode - 1} eps (so far)`;
                return item.anime.status === 'airing' ? 'Ongoing' : 'Episodes TBA';
              })()}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  tabActive: { backgroundColor: colors.violetDeep, borderColor: colors.violetCore },
  tabText: { ...typography.bodyMedium, color: colors.textSecondary, fontSize: 13 },
  tabTextActive: { color: colors.textPrimary },
  restoreButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.violetCore,
    backgroundColor: colors.violetDeep,
    alignItems: 'center',
  },
  restoreButtonText: { ...typography.bodyMedium, color: colors.violetLight, fontSize: 14 },
  restoreMsg: {
    ...typography.body,
    color: colors.like,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontSize: 13,
  },
  grid: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  card: { flex: 1, marginBottom: spacing.md },
  poster: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  heartBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: '#FF1E4E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBadgeText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  cardTitle: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 13 },
  cardMeta: { ...typography.body, color: colors.textTertiary, fontSize: 11 },
  emptyState: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
