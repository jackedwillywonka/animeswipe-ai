import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Anime, StreamingLink } from '@/types';

/**
 * AniList API client. AniList is a free, public anime metadata API
 * (no API key required). Every anime fetched here is cached in memory
 * so other screens (details, saved list, similar) can look it up fast.
 */

const ANILIST_URL = 'https://graphql.anilist.co';

const MEDIA_FIELDS = `
  id
  title { romaji english }
  description(asHtml: false)
  genres
  episodes
  duration
  averageScore
  seasonYear
  status
  format
  isAdult
  coverImage { extraLarge large }
  trailer { id site }
  studios(isMain: true) { nodes { name } }
  externalLinks { site url type }
  nextAiringEpisode { airingAt episode }
  relations { edges { relationType node { id type } } }
`;

const animeCache = new Map<string, Anime>();
const CACHE_KEY = 'anime_cache_v1';
let cacheLoaded = false;

export async function loadCacheFromDisk(): Promise<void> {
  if (cacheLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const arr: Anime[] = JSON.parse(raw);
      arr.forEach((a) => animeCache.set(a.id, a));
    }
  } catch {}
  try {
    const rawFr = await AsyncStorage.getItem(FRANCHISE_CACHE_KEY);
    if (rawFr) {
      const obj: Record<string, FranchiseInfo> = JSON.parse(rawFr);
      Object.entries(obj).forEach(([id, info]) => franchiseCache.set(id, info));
    }
  } catch {}
  cacheLoaded = true;
}

let saveTimer: any = null;
function persistCache() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const arr = Array.from(animeCache.values());
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(arr));
    } catch {}
  }, 1000);
}

async function gqlRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  return gqlRequestWithRetry<T>(query, variables, 3);
}

async function gqlRequestWithRetry<T>(
  query: string,
  variables: Record<string, unknown>,
  retries: number
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);
  let res: Response;
  try {
    res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 429 && retries > 0) {
    // Rate limited - wait and retry (capped at 10s so we never hang silently)
    const retryAfter = Math.min(Number(res.headers.get('Retry-After')) || 2, 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return gqlRequestWithRetry<T>(query, variables, retries - 1);
  }
  if (!res.ok) {
    throw new Error(`AniList request failed (${res.status})`);
  }
  const json = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error(`AniList error: ${json.errors[0]?.message ?? 'unknown'}`);
  }
  return json.data as T;
}

function stripHtml(input: string | null | undefined): string {
  if (!input) return 'No description available.';
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const STREAMING_SITES = [
  'Crunchyroll',
  'Netflix',
  'Hulu',
  'HIDIVE',
  'Amazon Prime Video',
  'Disney Plus',
  'Max',
];

function mapStreaming(links: any[] | null | undefined): StreamingLink[] {
  if (!links) return [];
  return links
    .filter((l) => l && l.type === 'STREAMING' && STREAMING_SITES.includes(l.site))
    .map((l) => ({ platform: l.site, url: l.url }));
}

function isSequel(m: any): boolean {
  const edges = m?.relations?.edges ?? [];
  return edges.some(
    (e: any) => e?.relationType === 'PREQUEL' && e?.node?.type === 'ANIME'
  );
}

function mapMedia(m: any): Anime {
  const anime: Anime = {
    id: String(m.id),
    title: (m.title && (m.title.english || m.title.romaji)) || 'Untitled',
    description: stripHtml(m.description),
    genres: m.genres ?? [],
    episodes: m.episodes ?? 0,
    studio: m.studios?.nodes?.[0]?.name ?? 'Unknown studio',
    posterUrl: m.coverImage?.extraLarge || m.coverImage?.large || '',
    rating: m.averageScore ? Math.round(m.averageScore) / 10 : 0,
    releaseYear: m.seasonYear ?? 0,
    status: m.status === 'RELEASING' ? 'airing' : 'finished',
    rawStatus: m.status ?? undefined,
    format: m.format ?? undefined,
    runtimeMinutes: m.duration ?? 24,
    streaming: mapStreaming(m.externalLinks),
    trailerYouTubeId: m.trailer && m.trailer.site === 'youtube' ? m.trailer.id : undefined,
    nextAiring: m.nextAiringEpisode
      ? {
          episode: m.nextAiringEpisode.episode,
          airingAt: new Date(m.nextAiringEpisode.airingAt * 1000).toISOString(),
        }
      : undefined,
  };
  animeCache.set(anime.id, anime);
  persistCache();
  return anime;
}

export async function fetchPopularAnime(
  excludeIds: string[] = [],
  perPage = 50,
  page = 1
): Promise<Anime[]> {
  const query = `
    query ($page: Int, $perPage: Int, $idNotIn: [Int]) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, id_not_in: $idNotIn) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const idNotIn = excludeIds
    .map((id) => Number(id))
    .filter((n) => !Number.isNaN(n));
  const data = await gqlRequest<any>(query, {
    page,
    perPage,
    idNotIn: idNotIn.length ? idNotIn : undefined,
  });
  const mapped = (data?.Page?.media ?? []).filter((m: any) => !m.isAdult && !isSequel(m)).map(mapMedia);
  return mapped;
}

export async function searchAnimeByText(search: string, perPage = 25): Promise<Anime[]> {
  const query = `
    query ($search: String, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: SEARCH_MATCH, search: $search, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await gqlRequest<any>(query, { search, perPage });
  return (data?.Page?.media ?? []).filter((m: any) => !m.isAdult).map(mapMedia);
}

export async function fetchAnimeByGenres(
  genres: string[],
  excludeIds: string[] = [],
  perPage = 50
): Promise<Anime[]> {
  const query = `
    query ($genres: [String], $perPage: Int, $idNotIn: [Int]) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC, genre_in: $genres, isAdult: false, id_not_in: $idNotIn) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const idNotIn = excludeIds
    .map((id) => Number(id))
    .filter((n) => !Number.isNaN(n));
  const data = await gqlRequest<any>(query, {
    genres,
    perPage,
    idNotIn: idNotIn.length ? idNotIn : undefined,
  });
  return (data?.Page?.media ?? []).filter((m: any) => !m.isAdult && !isSequel(m)).map(mapMedia);
}

export function getCachedAnimeById(id: string): Anime | undefined {
  return animeCache.get(id);
}

export function getSimilarFromCache(anime: Anime, limit = 6): Anime[] {
  const results: Anime[] = [];
  for (const candidate of animeCache.values()) {
    if (candidate.id === anime.id) continue;
    if (candidate.genres.some((g) => anime.genres.includes(g))) {
      results.push(candidate);
    }
    if (results.length >= limit) break;
  }
  return results;
}


export async function fetchAnimeById(id: string): Promise<Anime | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
      }
    }
  `;
  const numId = Number(id);
  if (Number.isNaN(numId)) return null;
  try {
    const data = await gqlRequest<any>(query, { id: numId });
    return data?.Media ? mapMedia(data.Media) : null;
  } catch {
    return null;
  }
}


// ---- FRANCHISE INFO (season position + totals across the whole series) ----
export interface FranchiseInfo {
  seasonNumber: number;
  totalSeasons: number;
  totalEpisodes: number;
  hasOngoing: boolean;
}

const franchiseCache = new Map<string, FranchiseInfo>();
const FRANCHISE_CACHE_KEY = 'franchise_cache_v1';

let franchiseSaveTimer: any = null;
function persistFranchiseCache() {
  if (franchiseSaveTimer) clearTimeout(franchiseSaveTimer);
  franchiseSaveTimer = setTimeout(async () => {
    try {
      const obj: Record<string, FranchiseInfo> = {};
      franchiseCache.forEach((info, id) => { obj[id] = info; });
      await AsyncStorage.setItem(FRANCHISE_CACHE_KEY, JSON.stringify(obj));
    } catch {}
  }, 1000);
}
const SEASON_FORMATS = ['TV', 'TV_SHORT', 'ONA'];

const RELATION_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      episodes
      nextAiringEpisode { episode }
      relations {
        edges {
          relationType
          node { id type format }
        }
      }
    }
  }
`;

interface ChainNode {
  id: number;
  episodes: number;
  isOngoing: boolean;
  prequelId: number | null;
  sequelId: number | null;
}

async function fetchChainNode(id: number): Promise<ChainNode | null> {
  try {
    const data = await gqlRequest<any>(RELATION_QUERY, { id });
    const m = data?.Media;
    if (!m) return null;
    const edges = m.relations?.edges ?? [];
    const findRel = (type: string) =>
      edges.find(
        (e: any) =>
          e?.relationType === type &&
          e?.node?.type === 'ANIME' &&
          SEASON_FORMATS.includes(e?.node?.format)
      )?.node?.id ?? null;
    // For an ongoing season AniList has no final episode count, but the
    // next-airing episode number tells us how many have aired so far.
    const airedSoFar = m.nextAiringEpisode?.episode
      ? m.nextAiringEpisode.episode - 1
      : 0;
    return {
      id: m.id,
      episodes: m.episodes ?? airedSoFar,
      isOngoing: m.episodes == null,
      prequelId: findRel('PREQUEL'),
      sequelId: findRel('SEQUEL'),
    };
  } catch {
    return null;
  }
}

export function getCachedFranchiseInfo(id: string): FranchiseInfo | undefined {
  return franchiseCache.get(id);
}

export async function fetchFranchiseInfo(id: string): Promise<FranchiseInfo | null> {
  const cached = franchiseCache.get(id);
  if (cached) return cached;
  const startId = Number(id);
  if (Number.isNaN(startId)) return null;

  const MAX_STEPS = 12;

  // Walk backwards to Season 1
  let root = await fetchChainNode(startId);
  if (!root) return null;
  const visited = new Set<number>([root.id]);
  let steps = 0;
  while (root.prequelId && !visited.has(root.prequelId) && steps < MAX_STEPS) {
    const prev = await fetchChainNode(root.prequelId);
    if (!prev) break;
    visited.add(prev.id);
    root = prev;
    steps += 1;
  }

  // Walk forwards collecting every season
  const chain: ChainNode[] = [root];
  const seen = new Set<number>([root.id]);
  let cur = root;
  steps = 0;
  while (cur.sequelId && !seen.has(cur.sequelId) && steps < MAX_STEPS) {
    const next = await fetchChainNode(cur.sequelId);
    if (!next) break;
    seen.add(next.id);
    chain.push(next);
    cur = next;
    steps += 1;
  }

  const totalEpisodes = chain.reduce((sum, c) => sum + (c.episodes || 0), 0);
  // If any season has no episode count, the series is still running and
  // a summed total would be misleading.
  const hasOngoing = chain.some((c) => c.isOngoing);
  // Cache the result for every season in the chain (one walk serves them all)
  chain.forEach((c, i) => {
    franchiseCache.set(String(c.id), {
      seasonNumber: i + 1,
      totalSeasons: chain.length,
      totalEpisodes,
      hasOngoing,
    });
  });
  persistFranchiseCache();
  return franchiseCache.get(id) ?? null;
}
