import { USE_MOCK_DATA } from '@/config';
import { MOCK_ANIME } from '@/data/mockAnime';
import type { Anime, UserPreferences } from '@/types';

/**
 * In real mode, these functions call a backend proxy endpoint that holds
 * the OpenAI API key server-side (e.g. a Supabase Edge Function) - the key
 * must never live in the mobile app bundle. Set EXPO_PUBLIC_AI_PROXY_URL
 * to that function's URL once it's deployed.
 *
 * In mock mode (default), simple local logic stands in for the AI calls
 * so the full experience - explanations, search, compare - is testable
 * before any backend exists.
 */

const AI_PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '';

async function callAiProxy<T>(path: string, body: unknown): Promise<T> {
  if (!AI_PROXY_URL) {
    throw new Error(
      'EXPO_PUBLIC_AI_PROXY_URL is not set. Deploy the ai-proxy Supabase Edge Function and point to it.'
    );
  }
  const res = await fetch(`${AI_PROXY_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI proxy error (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function explainRecommendation(
  anime: Anime,
  likedAnime: string[],
  preferences: UserPreferences
): Promise<string> {
  if (USE_MOCK_DATA) {
    return mockExplain(anime, preferences);
  }
  const { explanation } = await callAiProxy<{ explanation: string }>('/explain', {
    anime,
    likedAnime,
    preferences,
  });
  return explanation;
}

export async function searchAnimeNaturalLanguage(query: string): Promise<Anime[]> {
  if (USE_MOCK_DATA) {
    return mockSearch(query);
  }
  const { results } = await callAiProxy<{ results: Anime[] }>('/search', { query });
  return results;
}

export async function compareAnime(animeA: Anime, animeB: Anime): Promise<string> {
  if (USE_MOCK_DATA) {
    return mockCompare(animeA, animeB);
  }
  const { comparison } = await callAiProxy<{ comparison: string }>('/compare', {
    animeA,
    animeB,
  });
  return comparison;
}

// ---- Mock implementations (no network, no API key) ----

function mockExplain(anime: Anime, preferences: UserPreferences): string {
  const matchedGenres = anime.genres.filter((g) => preferences.favoriteGenres.includes(g));
  if (matchedGenres.length > 0) {
    return `We recommended this because you like ${matchedGenres.join(', ')}, and ${anime.title} leans heavily into ${matchedGenres[0].toLowerCase()} with ${anime.studio}'s signature production quality.`;
  }
  return `${anime.title} is trending among fans of ${anime.genres.slice(0, 2).join(' and ')} - worth a look even outside your usual picks.`;
}

function mockSearch(query: string): Anime[] {
  const q = query.toLowerCase();

  // Very small keyword heuristic standing in for real embedding search.
  const keywordGenreMap: Record<string, string[]> = {
    emotional: ['Drama', 'Romance', 'Slice of Life'],
    fight: ['Action'],
    fights: ['Action'],
    action: ['Action'],
    short: [], // handled by episode-count filter below
    scary: ['Horror'],
    dark: ['Dark Fantasy', 'Horror'],
    funny: ['Comedy'],
    romance: ['Romance'],
    mystery: ['Mystery'],
  };

  let candidates = [...MOCK_ANIME];

  if (q.includes('short')) {
    candidates = candidates.filter((a) => a.episodes <= 13);
  }

  const matchedGenres = new Set<string>();
  for (const [keyword, genres] of Object.entries(keywordGenreMap)) {
    if (q.includes(keyword)) genres.forEach((g) => matchedGenres.add(g));
  }

  // "like X" queries: find anime sharing genres with the named title
  const likeMatch = MOCK_ANIME.find((a) => q.includes(a.title.toLowerCase()));
  if (likeMatch) {
    likeMatch.genres.forEach((g) => matchedGenres.add(g));
    candidates = candidates.filter((a) => a.id !== likeMatch.id);
  }

  if (matchedGenres.size > 0) {
    candidates = candidates.filter((a) => a.genres.some((g) => matchedGenres.has(g)));
  }

  return candidates.slice(0, 8);
}

function mockCompare(animeA: Anime, animeB: Anime): string {
  const sharedGenres = animeA.genres.filter((g) => animeB.genres.includes(g));
  const onlyA = animeA.genres.filter((g) => !animeB.genres.includes(g));
  const onlyB = animeB.genres.filter((g) => !animeA.genres.includes(g));

  let comparison = `${animeA.title} (${animeA.episodes} eps, ${animeA.releaseYear}) and ${animeB.title} (${animeB.episodes} eps, ${animeB.releaseYear}) `;
  comparison += sharedGenres.length
    ? `both lean into ${sharedGenres.join(', ')}. `
    : `come from fairly different genre territory. `;
  if (onlyA.length) comparison += `${animeA.title} leans more into ${onlyA.join(', ')}. `;
  if (onlyB.length) comparison += `${animeB.title} leans more into ${onlyB.join(', ')}. `;
  comparison += `${animeA.rating > animeB.rating ? animeA.title : animeB.title} edges it out on average rating.`;
  return comparison;
}
