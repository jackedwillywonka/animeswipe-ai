import { useCallback, useEffect, useState } from 'react';
import type { Anime, MatchResult, Swipe, UserPreferences } from '@/types';
import { fetchAnimeBatch, recordSwipe } from '@/services/animeRepository';
import {
  buildInitialWeights,
  rankByMatch,
  scoreAnime,
  updateWeightsFromSwipe,
  type GenreWeights,
} from '@/services/recommendationEngine';

interface UseSwipeDeckResult {
  deck: Anime[];
  currentAnime: Anime | undefined;
  currentMatch: MatchResult | undefined;
  isLoading: boolean;
  error: string | null;
  swipe: (direction: Swipe['direction']) => Promise<void>;
}

export function useSwipeDeck(
  userId: string,
  preferences: UserPreferences,
  onSwipeRecorded?: (swipe: Swipe) => void
): UseSwipeDeckResult {
  const [deck, setDeck] = useState<Anime[]>([]);
  const [weights, setWeights] = useState<GenreWeights>(() => buildInitialWeights(preferences));
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    try {
      setIsLoading(true);
      const batch = await fetchAnimeBatch(seenIds, 20);
      setDeck((prev) => [...prev, ...rankByMatch(batch, weights)]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load anime.');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenIds, weights]);

  useEffect(() => {
    loadMore();
    // Only run on mount; refills are triggered explicitly by swipe().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swipe = useCallback(
    async (direction: Swipe['direction']) => {
      const current = deck[0];
      if (!current) return;

      const swipeRecord: Swipe = {
        userId,
        animeId: current.id,
        direction,
        timestamp: new Date().toISOString(),
      };

      // Optimistic UI: advance the deck immediately, sync in background.
      setDeck((prev) => prev.slice(1));
      setSeenIds((prev) => [...prev, current.id]);
      setWeights((prev) => updateWeightsFromSwipe(prev, current, direction));
      onSwipeRecorded?.(swipeRecord);

      try {
        await recordSwipe(swipeRecord);
      } catch (e) {
        // Non-fatal: swipe already reflected in UI. Log for now;
        // Phase 2 should queue failed writes for retry.
        console.warn('[useSwipeDeck] failed to persist swipe', e);
      }
    },
    [deck, userId, onSwipeRecorded]
  );

  useEffect(() => {
    if (deck.length <= 3 && !isLoading) {
      loadMore();
    }
  }, [deck.length, isLoading, loadMore]);

  const currentAnime = deck[0];
  const currentMatch = currentAnime ? scoreAnime(currentAnime, weights) : undefined;

  return { deck, currentAnime, currentMatch, isLoading, error, swipe };
}
