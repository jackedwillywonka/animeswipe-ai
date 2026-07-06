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

async function gqlRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
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
  return (data?.Page?.media ?? []).filter((m: any) => !m.isAdult && !isSequel(m)).map(mapMedia);
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
