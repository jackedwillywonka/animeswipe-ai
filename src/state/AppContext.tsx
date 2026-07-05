import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchSavedList,
  fetchSwipeHistory,
  removeSavedAnime,
  saveAnime,
} from '@/services/animeRepository';
import { getMockAnimeById } from '@/data/mockAnime';
import type { Swipe, UserPreferences, UserStats, WatchStatus } from '@/types';

const CURRENT_USER_ID = 'current-user';

interface AppContextValue {
  userId: string;
  preferences: UserPreferences;
  setPreferences: (prefs: UserPreferences) => void;
  savedAnimeIds: Set<string>;
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
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [savedAnimeIds, setSavedAnimeIds] = useState<Set<string>>(new Set());
  const [swipeHistory, setSwipeHistory] = useState<Swipe[]>([]);

  useEffect(() => {
    fetchSavedList(CURRENT_USER_ID).then((items) => {
      setSavedAnimeIds(new Set(items.map((i) => i.animeId)));
    });
    fetchSwipeHistory(CURRENT_USER_ID).then(setSwipeHistory);
  }, []);

  const toggleSaved = useCallback(
    async (animeId: string, status: WatchStatus = 'plan_to_watch') => {
      const isSaved = savedAnimeIds.has(animeId);
      // Optimistic update
      setSavedAnimeIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(animeId);
        else next.add(animeId);
        return next;
      });
      if (isSaved) {
        await removeSavedAnime(CURRENT_USER_ID, animeId);
      } else {
        await saveAnime(CURRENT_USER_ID, animeId, status);
      }
    },
    [savedAnimeIds]
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

  const value: AppContextValue = {
    userId: CURRENT_USER_ID,
    preferences,
    setPreferences,
    savedAnimeIds,
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
