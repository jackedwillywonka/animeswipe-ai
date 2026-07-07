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
  aiDeck?: Anime[] | null,
  alreadySavedIds?: Set<string>
): UseSwipeDeckResult {
  const [deck, setDeck] = useState<Anime[]>([]);
  const [weights, setWeights] = useState<GenreWeights>(() => buildInitialWeights(preferences));
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastAiDeckRef = useRef<Anime[] | null>(null);
  const excludeRef = useRef<Set<string>>(new Set(alreadySavedIds ?? []));
  const pageRef = useRef(1);
  const emptyPagesRef = useRef(0);
  const outOfAnimeRef = useRef(false);

  // Keep the exclusion set in sync as the saved list loads/changes.
  useEffect(() => {
    if (alreadySavedIds) {
      alreadySavedIds.forEach((id) => excludeRef.current.add(id));
    }
  }, [alreadySavedIds]);

  // When the AI hands us a new deck, it replaces whatever we're showing.
  useEffect(() => {
    if (aiDeck && aiDeck !== lastAiDeckRef.current) {
      console.warn(`[useSwipeDeck] AI deck received: ${aiDeck.length} cards`);
      lastAiDeckRef.current = aiDeck;
      excludeRef.current = new Set(alreadySavedIds ?? []);
      setDeck(aiDeck.filter((a) => !seenIds.includes(a.id) && !excludeRef.current.has(a.id)));
      setIsLoading(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiDeck]);

  const loadMore = useCallback(async () => {
    // Don't auto-refill an AI deck - the user refines via chat instead.
    if (lastAiDeckRef.current) {
      console.warn('[useSwipeDeck] loadMore skipped - AI deck active');
      return;
    }
    if (outOfAnimeRef.current) {
      console.warn('[useSwipeDeck] loadMore skipped - no fresh anime left to fetch');
      setIsLoading(false);
      return;
    }
    console.warn(`[useSwipeDeck] loadMore starting (page ${pageRef.current})`);
    try {
      setIsLoading(true);
      // Exclude BOTH swiped-this-session AND everything already in the library,
      // so AniList returns anime the user hasn't touched.
      const excludeAll = Array.from(new Set([...seenIds, ...excludeRef.current]));
      const batch = await fetchAnimeBatch(excludeAll, 20, pageRef.current);
      const filtered = batch.filter((a) => !excludeRef.current.has(a.id) && !seenIds.includes(a.id));
      console.warn(`[useSwipeDeck] batch ${batch.length}, after filtering ${filtered.length}`);
      if (filtered.length === 0) {
        emptyPagesRef.current += 1;
        pageRef.current += 1;
        if (emptyPagesRef.current >= 4) {
          outOfAnimeRef.current = true;
          console.warn('[useSwipeDeck] 4 empty pages in a row - stopping auto-refill');
        }
      } else {
        emptyPagesRef.current = 0;
        pageRef.current += 1;
      }
      setDeck((prev) => [...prev, ...rankByMatch(filtered, weights)]);
      setError(null);
    } catch (e) {
      console.warn('[useSwipeDeck] load failed', e);
      setError(e instanceof Error ? e.message : 'Failed to load anime.');
    } finally {
      console.warn('[useSwipeDeck] loadMore finished');
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenIds, weights]);

  useEffect(() => {
    console.warn(`[useSwipeDeck] mount - aiDeck is ${aiDeck ? `array(${aiDeck.length})` : String(aiDeck)}`);
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
