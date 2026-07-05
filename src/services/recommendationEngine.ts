import type { Anime, MatchResult, Swipe, UserPreferences } from '@/types';

/**
 * Phase 1 recommendation engine: a lightweight genre-affinity scorer.
 * Every swipe nudges genre weights up (right) or down (left). This is
 * intentionally simple — swap in a real ML/embedding-based ranker in
 * Phase 2 without changing the calling code (same input/output shape).
 */

export type GenreWeights = Record<string, number>;

const DEFAULT_WEIGHT = 0.5;
const LIKE_BOOST = 0.15;
const PASS_PENALTY = 0.1;
const MIN_WEIGHT = 0;
const MAX_WEIGHT = 1;

export function buildInitialWeights(preferences: UserPreferences): GenreWeights {
  const weights: GenreWeights = {};
  for (const genre of preferences.favoriteGenres) {
    weights[genre] = 0.75;
  }
  for (const genre of preferences.dislikedGenres) {
    weights[genre] = 0.15;
  }
  return weights;
}

export function updateWeightsFromSwipe(
  weights: GenreWeights,
  anime: Anime,
  direction: Swipe['direction']
): GenreWeights {
  const updated = { ...weights };
  const delta = direction === 'right' ? LIKE_BOOST : -PASS_PENALTY;

  for (const genre of anime.genres) {
    const current = updated[genre] ?? DEFAULT_WEIGHT;
    updated[genre] = clamp(current + delta, MIN_WEIGHT, MAX_WEIGHT);
  }
  return updated;
}

export function scoreAnime(anime: Anime, weights: GenreWeights): MatchResult {
  if (anime.genres.length === 0) {
    return { animeId: anime.id, matchPercent: 50, reasons: [] };
  }

  const genreScores = anime.genres.map((g) => weights[g] ?? DEFAULT_WEIGHT);
  const avgScore = genreScores.reduce((sum, s) => sum + s, 0) / genreScores.length;
  const matchPercent = Math.round(avgScore * 100);

  // Surface the genres driving the score highest as "reasons"
  const reasons = anime.genres
    .map((g) => ({ genre: g, weight: weights[g] ?? DEFAULT_WEIGHT }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .filter((r) => r.weight >= 0.5)
    .map((r) => r.genre);

  return { animeId: anime.id, matchPercent, reasons };
}

export function rankByMatch(animeList: Anime[], weights: GenreWeights): Anime[] {
  return [...animeList].sort(
    (a, b) => scoreAnime(b, weights).matchPercent - scoreAnime(a, weights).matchPercent
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
