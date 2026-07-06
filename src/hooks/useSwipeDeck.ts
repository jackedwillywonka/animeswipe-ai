import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  onSwipeRecorded?: (swipe: Swipe) => void,
  aiDeck?: Anime[] | null
): UseSwipeDeckResult {
  const [deck, setDeck] = useState<Anime[]>([]);
  const [weights, setWeights] = useState<GenreWeights>(() => buildInitialWeights(preferences));
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastAiDeckRef = useRef<Anime[] | null>(null);

  // When the AI hands us a new deck, it replaces whatever we're showing.
  useEffect(() => {
    if (aiDeck && aiDeck !== lastAiDeckRef.current) {
      lastAiDeckRef.current = aiDeck;
      setDeck(aiDeck.filter((a) => !seenIds.includes(a.id)));
      setIsLoading(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiDeck]);

  const loadMore = useCallback(async () => {
    // Don't auto-refill an AI deck - the user refines via chat instead.
    if (lastAiDeckRef.current) return;
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
    if (!aiDeck) loadMore();
    else setIsLoading(false);
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

      setDeck((prev) => prev.slice(1));
      setSeenIds((prev) => [...prev, current.id]);
      setWeights((prev) => updateWeightsFromSwipe(prev, current, direction));
      onSwipeRecorded?.(swipeRecord);

      try {
        await recordSwipe(swipeRecord);
      } catch (e) {
        console.warn('[useSwipeDeck] failed to persist swipe', e);
      }
    },
    [deck, userId, onSwipeRecorded]
  );

  useEffect(() => {
    if (deck.length <= 3 && !isLoading && !lastAiDeckRef.current) {
      loadMore();
    }
  }, [deck.length, isLoading, loadMore]);

  const currentAnime = deck[0];
  const currentMatch = useMemo(
    () => (currentAnime ? scoreAnime(currentAnime, weights) : undefined),
    [currentAnime, weights]
  );

  return { deck, currentAnime, currentMatch, isLoading, error, swipe };
}
