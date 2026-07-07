import { supabase } from './supabase';
import { MOCK_ANIME, getMockAnimeById, getMockSimilarAnime } from '@/data/mockAnime';
import {
  fetchPopularAnime,
  fetchAnimeById,
  getCachedAnimeById,
  getSimilarFromCache,
} from './anilistService';
import type { Anime, Swipe, SavedAnime, UserPreferences, WatchStatus } from '@/types';

/**
 * Data-access layer.
 * - Anime catalog: live from AniList, local fallback.
 * - User data (swipes, saved, preferences, chat): persisted to Supabase.
 */

export async function fetchAnimeBatch(excludeIds: string[], limit = 20, page = 1): Promise<Anime[]> {
  try {
    const fromApi = await fetchPopularAnime(excludeIds, limit, page);
    if (fromApi.length > 0) return fromApi;
  } catch (e) {
    console.warn('[animeRepository] AniList fetch failed, using local fallback', e);
  }
  const mock = MOCK_ANIME.filter((a) => !excludeIds.includes(a.id)).slice(0, limit);
  return mock;
}

export function getAnimeById(id: string): Anime | undefined {
  return getCachedAnimeById(id) ?? getMockAnimeById(id);
}

export async function getAnimeByIdAsync(id: string): Promise<Anime | undefined> {
  const cached = getCachedAnimeById(id) ?? getMockAnimeById(id);
  if (cached) return cached;
  const fetched = await fetchAnimeById(id);
  return fetched ?? undefined;
}

export function getSimilarAnime(anime: Anime, limit = 6): Anime[] {
  const similar = getSimilarFromCache(anime, limit);
  return similar.length > 0 ? similar : getMockSimilarAnime(anime, limit);
}

// ---- SWIPES ----
export async function recordSwipe(swipe: Swipe): Promise<void> {
  const { error } = await supabase.from('swipes').insert({
    user_id: swipe.userId,
    anime_id: swipe.animeId,
    direction: swipe.direction,
  });
  if (error) console.warn('[recordSwipe]', error.message);
}

export async function fetchSwipeHistory(userId: string): Promise<Swipe[]> {
  const { data, error } = await supabase
    .from('swipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[fetchSwipeHistory]', error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    userId: r.user_id,
    animeId: r.anime_id,
    direction: r.direction,
    timestamp: r.created_at,
  }));
}

// ---- SAVED ----
export async function saveAnime(userId: string, animeId: string, status: WatchStatus): Promise<void> {
  const { error } = await supabase.from('saved').upsert({
    user_id: userId,
    anime_id: animeId,
    status,
    saved_at: new Date().toISOString(),
  });
  if (error) console.warn('[saveAnime]', error.message);
}

export async function removeSavedAnime(userId: string, animeId: string): Promise<void> {
  const { error } = await supabase
    .from('saved')
    .delete()
    .eq('user_id', userId)
    .eq('anime_id', animeId);
  if (error) console.warn('[removeSavedAnime]', error.message);
}

export async function fetchSavedList(userId: string): Promise<SavedAnime[]> {
  const { data, error } = await supabase.from('saved').select('*').eq('user_id', userId);
  if (error) {
    console.warn('[fetchSavedList]', error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    userId: r.user_id,
    animeId: r.anime_id,
    status: r.status,
    savedAt: r.saved_at,
  }));
}

// ---- PREFERENCES ----
export async function fetchPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    favoriteGenres: data.favorite_genres ?? [],
    dislikedGenres: data.disliked_genres ?? [],
    likedAnime: data.liked_anime ?? [],
    dubOrSub: data.dub_or_sub ?? 'either',
    moviesOrSeries: 'either',
    ongoingOrFinished: 'either',
  };
}

export async function upsertPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  const { error } = await supabase.from('preferences').upsert({
    user_id: userId,
    favorite_genres: prefs.favoriteGenres,
    disliked_genres: prefs.dislikedGenres,
    liked_anime: prefs.likedAnime,
    dub_or_sub: prefs.dubOrSub,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[upsertPreferences]', error.message);
}

// ---- CHAT HISTORY ----
export async function saveChatMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const { error } = await supabase.from('chat_messages').insert({
    user_id: userId,
    role,
    content,
  });
  if (error) console.warn('[saveChatMessage]', error.message);
}

export async function fetchChatHistory(
  userId: string
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[fetchChatHistory]', error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({ role: r.role, content: r.content }));
}


// ---- WATCH STATUS (move between Watching/Completed/Plan/Dropped) ----
export async function setWatchStatus(
  userId: string,
  animeId: string,
  status: WatchStatus
): Promise<void> {
  const { error } = await supabase.from('saved').upsert({
    user_id: userId,
    anime_id: animeId,
    status,
    saved_at: new Date().toISOString(),
  });
  if (error) console.warn('[setWatchStatus]', error.message);
}

// ---- FAVORITES (independent flag) ----
export async function fetchFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('anime_id')
    .eq('user_id', userId);
  if (error) {
    console.warn('[fetchFavorites]', error.message);
    return [];
  }
  return (data ?? []).map((r: any) => r.anime_id);
}

export async function addFavorite(userId: string, animeId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .upsert({ user_id: userId, anime_id: animeId });
  if (error) console.warn('[addFavorite]', error.message);
}

export async function removeFavorite(userId: string, animeId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('anime_id', animeId);
  if (error) console.warn('[removeFavorite]', error.message);
}

// ---- RESTORE DROPPED (bring passed anime back into rotation) ----
// Returns the anime_ids that were dropped, so the swipe deck can exclude
// them from "seen" and show them again. Also clears their dropped status.
export async function restoreDropped(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved')
    .select('anime_id')
    .eq('user_id', userId)
    .eq('status', 'dropped');
  if (error) {
    console.warn('[restoreDropped]', error.message);
    return [];
  }
  const ids = (data ?? []).map((r: any) => r.anime_id);
  if (ids.length > 0) {
    const { error: delErr } = await supabase
      .from('saved')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'dropped');
    if (delErr) console.warn('[restoreDropped delete]', delErr.message);
  }
  return ids;
}
