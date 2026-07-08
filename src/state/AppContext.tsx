import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchSavedList,
  fetchSwipeHistory,
  removeSavedAnime,
  saveAnime,
  setWatchStatus,
  fetchFavorites,
  addFavorite,
  removeFavorite,
  restoreDropped,
} from '@/services/animeRepository';
import { getDeviceUserId } from '@/services/deviceUser';
import {
  getCurrentSession,
  onAuthStateChange,
  migrateDeviceDataToUser,
} from '@/services/authService';
import { loadCacheFromDisk } from '@/services/anilistService';
import { getAnimeById as getMockAnimeById } from '@/services/animeRepository';
import type { Swipe, UserPreferences, UserStats, WatchStatus } from '@/types';

// user id now comes from the device (persists across launches)

interface AppContextValue {
  userId: string;
  preferences: UserPreferences;
  setPreferences: (prefs: UserPreferences) => void;
  savedAnimeIds: Set<string>;
  favoriteIds: Set<string>;
  statusById: Record<string, string>;
  statusChangedAt: Record<string, string>;
  setStatus: (animeId: string, status: WatchStatus) => Promise<void>;
  toggleFavorite: (animeId: string) => Promise<void>;
  restoreDroppedAnime: () => Promise<string[]>;
  toggleSaved: (animeId: string, status?: WatchStatus) => Promise<void>;
  recordLocalSwipe: (swipe: Swipe) => void;
  stats: UserStats;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteGenres: [],
  likedAnime: [],
  dislikedGenres: [],
  dubOrSub: 'either',
  moviesOrSeries: 'either',
  ongoingOrFinished: 'either',
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string>('');
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [savedAnimeIds, setSavedAnimeIds] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [statusById, setStatusById] = useState<Record<string, string>>({});
  const [statusChangedAt, setStatusChangedAt] = useState<Record<string, string>>({});
  const [swipeHistory, setSwipeHistory] = useState<Swipe[]>([]);

  const loadUserData = useCallback(async (id: string) => {
    setUserId(id);
    const items = await fetchSavedList(id);
    setSavedAnimeIds(new Set(items.map((i) => i.animeId)));
    const map: Record<string, string> = {};
    items.forEach((i) => { map[i.animeId] = i.status; });
    setStatusById(map);
    const history = await fetchSwipeHistory(id);
    setSwipeHistory(history);
    const favs = await fetchFavorites(id);
    setFavoriteIds(new Set(favs));
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      await loadCacheFromDisk();
      const session = await getCurrentSession();
      const deviceId = await getDeviceUserId();
      if (session?.user?.id) {
        await migrateDeviceDataToUser(session.user.id);
        await loadUserData(session.user.id);
      } else {
        await loadUserData(deviceId);
      }
      // When the user logs in or out, switch identities and reload everything.
      unsubscribe = onAuthStateChange(async (s) => {
        if (s?.user?.id) {
          await migrateDeviceDataToUser(s.user.id);
          await loadUserData(s.user.id);
        } else {
          await loadUserData(deviceId);
        }
      });
    })();
    return () => unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSaved = useCallback(
    async (animeId: string, status: WatchStatus = 'plan_to_watch') => {
      if (!userId) return;
      const isSaved = savedAnimeIds.has(animeId);
      // Optimistic update
      setSavedAnimeIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(animeId);
        else next.add(animeId);
        return next;
      });
      if (isSaved) {
        await removeSavedAnime(userId, animeId);
      } else {
        await saveAnime(userId, animeId, status);
      }
    },
    [savedAnimeIds, userId]
  );

  const recordLocalSwipe = useCallback((swipe: Swipe) => {
    setSwipeHistory((prev) => [swipe, ...prev]);
  }, []);

  const stats: UserStats = useMemo(() => {
    const liked = swipeHistory.filter((s) => s.direction === 'right');
    const skipped = swipeHistory.filter((s) => s.direction === 'left');

    const genreCounts = new Map<string, number>();
    const studioCounts = new Map<string, number>();
    let totalMinutes = 0;

    for (const swipe of liked) {
      const anime = getMockAnimeById(swipe.animeId);
      if (!anime) continue;
      anime.genres.forEach((g) => genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1));
      studioCounts.set(anime.studio, (studioCounts.get(anime.studio) ?? 0) + 1);
      totalMinutes += anime.runtimeMinutes;
    }

    const topGenres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g);
    const topStudios = [...studioCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s);

    return {
      animeWatched: liked.length,
      animeLiked: liked.length,
      animeSkipped: skipped.length,
      favoriteGenres: topGenres,
      favoriteStudios: topStudios,
      watchStreakDays: liked.length > 0 ? 1 : 0,
      hoursWatched: Math.round((totalMinutes / 60) * 10) / 10,
    };
  }, [swipeHistory]);

  const setStatus = useCallback(
    async (animeId: string, status: WatchStatus) => {
      if (!userId) return;
      setSavedAnimeIds((prev) => new Set(prev).add(animeId));
      setStatusById((prev) => ({ ...prev, [animeId]: status }));
      setStatusChangedAt((prev) => ({ ...prev, [animeId]: new Date().toISOString() }));
      await setWatchStatus(userId, animeId, status);
    },
    [userId]
  );

  const toggleFavorite = useCallback(
    async (animeId: string) => {
      if (!userId) return;
      const isFav = favoriteIds.has(animeId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(animeId);
        else next.add(animeId);
        return next;
      });
      if (isFav) await removeFavorite(userId, animeId);
      else await addFavorite(userId, animeId);
    },
    [userId, favoriteIds]
  );

  const restoreDroppedAnime = useCallback(async () => {
    if (!userId) return [];
    const ids = await restoreDropped(userId);
    setSavedAnimeIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setStatusById((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { delete next[id]; });
      return next;
    });
    return ids;
  }, [userId]);

  const value: AppContextValue = {
    userId,
    preferences,
    setPreferences,
    savedAnimeIds,
    favoriteIds,
    statusById,
    statusChangedAt,
    setStatus,
    toggleFavorite,
    restoreDroppedAnime,
    toggleSaved,
    recordLocalSwipe,
    stats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within an AppProvider');
  return ctx;
}
