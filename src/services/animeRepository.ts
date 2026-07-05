import { MOCK_ANIME, getMockAnimeById, getMockSimilarAnime } from '@/data/mockAnime';
import {
  fetchPopularAnime,
  getCachedAnimeById,
  getSimilarFromCache,
} from './anilistService';
import type { Anime, Swipe, SavedAnime, UserPreferences, WatchStatus } from '@/types';

/**
 * Data-access layer.
 * - Anime catalog: live from AniList (free public API), with the small
 *   local dataset as an offline fallback.
 * - User data (swipes, saved, preferences): in-memory for now; will move
 *   to Supabase in a later phase.
 */

const mockSwipes: Swipe[] = [];
const mockSaved: Map<string, SavedAnime> = new Map();
const mockPreferences: Map<string, UserPreferences> = new Map();

export async function fetchAnimeBatch(excludeIds: string[], limit = 20): Promise<Anime[]> {
  try {
    const fromApi = await fetchPopularAnime(excludeIds, limit);
    if (fromApi.length > 0) return fromApi;
  } catch (e) {
    console.warn('[animeRepository] AniList fetch failed, using local fallback', e);
  }
  return MOCK_ANIME.filter((a) => !excludeIds.includes(a.id)).slice(0, limit);
}

export function getAnimeById(id: string): Anime | undefined {
  return getCachedAnimeById(id) ?? getMockAnimeById(id);
}

export function getSimilarAnime(anime: Anime, limit = 6): Anime[] {
  const similar = getSimilarFromCache(anime, limit);
  return similar.length > 0 ? similar : getMockSimilarAnime(anime, limit);
}

export async function recordSwipe(swipe: Swipe): Promise<void> {
  mockSwipes.push(swipe);
}

export async function fetchSwipeHistory(userId: string): Promise<Swipe[]> {
  return mockSwipes.filter((s) => s.userId === userId).reverse();
}

export async function saveAnime(userId: string, animeId: string, status: WatchStatus): Promise<void> {
  mockSaved.set(`${userId}:${animeId}`, {
    userId,
    animeId,
    status,
    savedAt: new Date().toISOString(),
  });
}

export async function removeSavedAnime(userId: string, animeId: string): Promise<void> {
  mockSaved.delete(`${userId}:${animeId}`);
}

export async function fetchSavedList(userId: string): Promise<SavedAnime[]> {
  return Array.from(mockSaved.values()).filter((s) => s.userId === userId);
}

export async function fetchPreferences(userId: string): Promise<UserPreferences | null> {
  return mockPreferences.get(userId) ?? null;
}

export async function upsertPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  mockPreferences.set(userId, prefs);
}
