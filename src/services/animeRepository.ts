import { supabase } from './supabase';
import { USE_MOCK_DATA } from '@/config';
import { MOCK_ANIME } from '@/data/mockAnime';
import type { Anime, Swipe, SavedAnime, UserPreferences, WatchStatus } from '@/types';

/**
 * Data-access layer. Screens/hooks call these functions instead of
 * touching the Supabase client directly, so the backend can change
 * without rewriting UI code. In mock mode (default), everything reads
 * and writes from in-memory state so the app works with zero setup.
 */

// In-memory stores used only in mock mode. Reset on app reload.
const mockSwipes: Swipe[] = [];
const mockSaved: Map<string, SavedAnime> = new Map();
const mockPreferences: Map<string, UserPreferences> = new Map();

export async function fetchAnimeBatch(excludeIds: string[], limit = 20): Promise<Anime[]> {
  if (USE_MOCK_DATA) {
    const remaining = MOCK_ANIME.filter((a) => !excludeIds.includes(a.id));
    return remaining.slice(0, limit);
  }

  let query = supabase.from('anime').select('*').limit(limit);
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Anime[];
}

export async function recordSwipe(swipe: Swipe): Promise<void> {
  if (USE_MOCK_DATA) {
    mockSwipes.push(swipe);
    return;
  }
  const { error } = await supabase.from('swipes').insert(swipe);
  if (error) throw error;
}

export async function fetchSwipeHistory(userId: string): Promise<Swipe[]> {
  if (USE_MOCK_DATA) {
    return mockSwipes.filter((s) => s.userId === userId).reverse();
  }
  const { data, error } = await supabase
    .from('swipes')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Swipe[];
}

export async function saveAnime(userId: string, animeId: string, status: WatchStatus): Promise<void> {
  if (USE_MOCK_DATA) {
    mockSaved.set(`${userId}:${animeId}`, {
      userId,
      animeId,
      status,
      savedAt: new Date().toISOString(),
    });
    return;
  }
  const { error } = await supabase
    .from('saved')
    .upsert({ user_id: userId, anime_id: animeId, status, saved_at: new Date().toISOString() });
  if (error) throw error;
}

export async function removeSavedAnime(userId: string, animeId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    mockSaved.delete(`${userId}:${animeId}`);
    return;
  }
  const { error } = await supabase.from('saved').delete().eq('user_id', userId).eq('anime_id', animeId);
  if (error) throw error;
}

export async function fetchSavedList(userId: string): Promise<SavedAnime[]> {
  if (USE_MOCK_DATA) {
    return Array.from(mockSaved.values()).filter((s) => s.userId === userId);
  }
  const { data, error } = await supabase.from('saved').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as SavedAnime[];
}

export async function fetchPreferences(userId: string): Promise<UserPreferences | null> {
  if (USE_MOCK_DATA) {
    return mockPreferences.get(userId) ?? null;
  }
  const { data, error } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as UserPreferences | null;
}

export async function upsertPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  if (USE_MOCK_DATA) {
    mockPreferences.set(userId, prefs);
    return;
  }
  const { error } = await supabase.from('preferences').upsert({ user_id: userId, ...prefs });
  if (error) throw error;
}
