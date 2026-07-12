import { searchAnimeByText, fetchAnimeByGenres, fetchPopularAnime, fetchFranchiseInfo, fetchAnimeByQuery } from './anilistService';
import type { AnimeQuerySpec } from './anilistService';
import type { Anime } from '@/types';

/**
 * AI conversation engine with session memory.
 *
 * Current implementation: a smart local interpreter that extracts
 * meaning from what the user says (referenced titles, vibes, power
 * systems, pacing, tone) and turns it into AniList queries.
 *
 * Next phase: the interpret step is swapped for a real OpenAI call
 * behind a secure proxy - the interface stays identical, so no other
 * code changes.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface SessionMemory {
  messages: ChatMessage[];
  likedTitles: string[]; // titles the user mentioned loving
  themes: Set<string>; // extracted vibe keywords
  genres: Set<string>; // mapped AniList genres
  excludeGenres: Set<string>;
  lastDeckIds: string[];
  seenIds: Set<string>;
}

export function createSession(): SessionMemory {
  return {
    messages: [],
    likedTitles: [],
    themes: new Set(),
    genres: new Set(),
    excludeGenres: new Set(),
    lastDeckIds: [],
    seenIds: new Set(),
  };
}

// Vibe keywords -> AniList genres. This is the "understanding" layer;
// the OpenAI upgrade replaces this with true semantic interpretation.
const THEME_GENRE_MAP: Record<string, string[]> = {
  'power system': ['Action', 'Fantasy'],
  powers: ['Action', 'Fantasy', 'Supernatural'],
  magic: ['Fantasy'],
  superpower: ['Action', 'Supernatural'],
  fight: ['Action'],
  fights: ['Action'],
  fighting: ['Action'],
  strong: ['Action'],
  overpowered: ['Action', 'Fantasy'],
  op: ['Action', 'Fantasy'],
  underdog: ['Action', 'Drama'],
  'character development': ['Drama'],
  emotional: ['Drama'],
  sad: ['Drama'],
  cry: ['Drama'],
  dark: ['Horror', 'Thriller', 'Psychological'],
  darker: ['Horror', 'Thriller', 'Psychological'],
  psychological: ['Psychological', 'Thriller'],
  mystery: ['Mystery'],
  detective: ['Mystery'],
  romance: ['Romance'],
  love: ['Romance'],
  funny: ['Comedy'],
  comedy: ['Comedy'],
  'slice of life': ['Slice of Life'],
  chill: ['Slice of Life'],
  wholesome: ['Slice of Life', 'Comedy'],
  scifi: ['Sci-Fi'],
  'sci-fi': ['Sci-Fi'],
  space: ['Sci-Fi'],
  mecha: ['Mecha'],
  sports: ['Sports'],
  music: ['Music'],
  horror: ['Horror'],
  scary: ['Horror'],
  adventure: ['Adventure'],
  journey: ['Adventure'],
  isekai: ['Fantasy', 'Adventure'],
};

const NEGATION_WORDS = ['no ', 'not ', 'without ', 'less ', "don't want", 'hate '];

function extractThemes(text: string, memory: SessionMemory) {
  const lower = text.toLowerCase();
  for (const [keyword, genres] of Object.entries(THEME_GENRE_MAP)) {
    if (!lower.includes(keyword)) continue;
    const idx = lower.indexOf(keyword);
    const before = lower.slice(Math.max(0, idx - 14), idx);
    const negated = NEGATION_WORDS.some((n) => before.includes(n));
    if (negated) {
      genres.forEach((g) => memory.excludeGenres.add(g));
    } else {
      memory.themes.add(keyword);
      genres.forEach((g) => memory.genres.add(g));
    }
  }
}

async function extractLikedTitles(text: string, memory: SessionMemory): Promise<Anime[]> {
  // Find quoted or capitalized multi-word phrases that could be titles,
  // then confirm them against AniList search.
  const candidates = new Set<string>();
  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) quoted.forEach((q) => candidates.add(q.replace(/"/g, '')));

  // Common pattern: "like X", "just finished X", "watched X"
  const patterns = [
    /like ([A-Z][\w:!'\- ]{2,40})/g,
    /finished ([A-Z][\w:!'\- ]{2,40})/g,
    /watched ([A-Z][\w:!'\- ]{2,40})/g,
    /loved ([A-Z][\w:!'\- ]{2,40})/g,
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      candidates.add(m[1].trim().replace(/[.,!?]$/, ''));
    }
  }

  const confirmed: Anime[] = [];
  for (const candidate of Array.from(candidates).slice(0, 3)) {
    try {
      const results = await searchAnimeByText(candidate, 1);
      if (results.length > 0) {
        confirmed.push(results[0]);
        if (!memory.likedTitles.includes(results[0].title)) {
          memory.likedTitles.push(results[0].title);
        }
        results[0].genres.forEach((g) => memory.genres.add(g));
      }
    } catch {
      // search miss is fine
    }
  }
  return confirmed;
}


const AI_BRAIN_URL = 'https://zhtnhuvngdvpdyufswco.supabase.co/functions/v1/ai-brain';

interface BrainResponse {
  reply: string;
  titles: string[];
  query?: AnimeQuerySpec;
  constraints?: {
    maxEpisodes: number | null;
    minEpisodes: number | null;
    episodeScope: 'season' | 'total';
    minYear: number | null;
    maxYear: number | null;
    minRating: number | null;
  };
  error?: string;
}

// Checks one anime against the brain-supplied numeric constraints.
// Returns true if it should be KEPT. Uses this-season episode count by
// default; only walks the franchise for a total when the user meant "total".
async function passesConstraints(
  anime: Anime,
  c: NonNullable<BrainResponse['constraints']>
): Promise<boolean> {
  // Year
  if (c.minYear != null && anime.releaseYear && anime.releaseYear < c.minYear) return false;
  if (c.maxYear != null && anime.releaseYear && anime.releaseYear > c.maxYear) return false;
  // Rating (out of 10)
  if (c.minRating != null && anime.rating < c.minRating) return false;

  // Episodes
  if (c.maxEpisodes != null || c.minEpisodes != null) {
    let epCount = anime.episodes;
    // If the show is ongoing with no set count, use aired-so-far.
    if ((!epCount || epCount === 0) && anime.nextAiring?.episode) {
      epCount = anime.nextAiring.episode - 1;
    }
    if (c.episodeScope === 'total') {
      // Walk the franchise for a true series-wide total.
      try {
        const fr = await fetchFranchiseInfo(anime.id);
        if (fr && fr.totalEpisodes > 0) epCount = fr.totalEpisodes;
      } catch {
        // fall back to season count if the walk fails
      }
    }
    if (epCount && epCount > 0) {
      if (c.maxEpisodes != null && epCount > c.maxEpisodes) return false;
      if (c.minEpisodes != null && epCount < c.minEpisodes) return false;
    }
    // If we genuinely don't know the count, keep it rather than wrongly drop it.
  }
  return true;
}

async function askRealBrain(
  memory: SessionMemory,
  avoidTitles: string[] = [],
  isPremium: boolean = false
): Promise<BrainResponse | null> {
  try {
    const messages = memory.messages.map((m) => ({
      role: m.role,
      content: m.text,
    }));
    // Tell the brain what's already in the user's library so it recommends
    // around it - discovery means new-to-you, not repeats.
    if (avoidTitles.length > 0) {
      messages.push({
        role: 'user',
        content: `(System note: I already have these in my library, do NOT suggest them: ${avoidTitles
          .slice(0, 120)
          .join(', ')}. Suggest titles I have not seen instead.)`,
      });
    }
    const res = await fetch(AI_BRAIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, isPremium }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as BrainResponse;
    if (data.error || !Array.isArray(data.titles)) return null;
    return data;
  } catch {
    return null;
  }
}

export interface AiTurnResult {
  reply: string;
  deck: Anime[];
}

export async function processUserMessage(
  memory: SessionMemory,
  userText: string,
  avoidTitles: string[] = [],
  isPremium: boolean = false
): Promise<AiTurnResult> {
  if (!memory.seenIds) memory.seenIds = new Set();
  memory.messages.push({
    id: `u-${Date.now()}`,
    role: 'user',
    text: userText,
    timestamp: new Date().toISOString(),
  });

  // Still extract themes/titles locally - powers the details-page explanations
  extractThemes(userText, memory);
  await extractLikedTitles(userText, memory);

  // ---- REAL AI PATH (query-driven: AniList's full catalog by real data) ----
  const brain = await askRealBrain(memory, avoidTitles, isPremium);
  if (brain && (brain.query || brain.titles.length > 0)) {
    const deck: Anime[] = [];
    const found = new Set<string>();
    const seenArrForQuery = Array.from(memory.seenIds);

    // (a) The AI's hand-picked standouts go FIRST (its expert taste).
    if (brain.titles.length > 0) {
      const batchSize = 3;
      for (let i = 0; i < brain.titles.length; i += batchSize) {
        const batch = brain.titles.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((t) => searchAnimeByText(t, 1).catch(() => []))
        );
        await new Promise((r) => setTimeout(r, 500));
        for (const r of results) {
          const a = r[0];
          if (a && !found.has(a.id) && !memory.seenIds.has(a.id)) {
            if (brain.constraints) {
              const ok = await passesConstraints(a, brain.constraints);
              if (!ok) continue;
            }
            found.add(a.id);
            deck.push(a);
          }
        }
      }
    }

    // (b) The QUERY pulls dozens of real matches from AniList's whole catalog.
    if (brain.query) {
      const queryResults = await fetchAnimeByQuery(brain.query, seenArrForQuery, 50).catch(() => []);
      for (const a of queryResults) {
        if (found.has(a.id) || memory.seenIds.has(a.id)) continue;
        if (brain.constraints) {
          const ok = await passesConstraints(a, brain.constraints);
          if (!ok) continue;
        }
        found.add(a.id);
        deck.push(a);
      }
    }

    console.warn(`[ai] deck built: ${deck.length} cards (${brain.titles.length} handpicked + query)`);

    if (deck.length > 0) {
      memory.lastDeckIds = deck.map((a) => a.id);
      memory.messages.push({
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: brain.reply,
        timestamp: new Date().toISOString(),
      });
      return { reply: brain.reply, deck };
    }
  }

  // ---- FALLBACK: keyword engine (offline / brain unreachable) ----
  let deck: Anime[] = [];
  const seenArr = Array.from(memory.seenIds);
  const genreList = Array.from(memory.genres).filter(
    (g) => !memory.excludeGenres.has(g)
  );

  try {
    if (genreList.length > 0) {
      deck = await fetchAnimeByGenres(genreList, seenArr, 50);
    } else {
      deck = await fetchPopularAnime(seenArr, 50);
    }
  } catch {
    deck = await fetchPopularAnime(seenArr, 50).catch(() => []);
  }

  deck = deck.filter((a) => !memory.seenIds.has(a.id));
  if (memory.excludeGenres.size > 0) {
    deck = deck.filter((a) => !a.genres.some((g) => memory.excludeGenres.has(g)));
  }

  memory.lastDeckIds = deck.map((a) => a.id);
  const reply = `Here are ${deck.length} picks! (I had trouble reaching my full brain just now, so these are broader matches - try again in a moment for sharper ones.)`;
  memory.messages.push({
    id: `a-${Date.now()}`,
    role: 'assistant',
    text: reply,
    timestamp: new Date().toISOString(),
  });
  return { reply, deck };
}

export const GREETING =
  "Hey! 👋 What are you in the mood for today? Tell me about an anime you loved — the characters, the vibe, the fights, anything — and I'll build your deck.";


/**
 * Build a personalized explanation for a specific anime using the
 * session's memory - referenced titles + extracted themes.
 */
export function explainFromMemory(memory: SessionMemory, anime: { title: string; genres: string[] }): string {
  const likedPart = memory.likedTitles.length
    ? `you loved ${memory.likedTitles.slice(0, 2).join(' and ')}`
    : '';
  const themePart = Array.from(memory.themes).slice(0, 3).join(', ');
  const genreOverlap = anime.genres.filter((g) =>
    Array.from(memory.genres).includes(g)
  );

  if (likedPart && themePart) {
    return `Picked because ${likedPart} — and you told me you're into ${themePart}. ${anime.title} hits ${genreOverlap.length ? genreOverlap.join(', ').toLowerCase() : 'that same energy'} hard.`;
  }
  if (likedPart) {
    return `Picked because ${likedPart} — ${anime.title} shares the ${genreOverlap.length ? genreOverlap.join(', ').toLowerCase() : 'same core'} DNA.`;
  }
  if (themePart) {
    return `You asked for ${themePart} — ${anime.title} delivers on ${genreOverlap.length ? genreOverlap.join(', ').toLowerCase() : 'exactly that'}.`;
  }
  return `A strong ${anime.genres.slice(0, 2).join(', ').toLowerCase()} pick while I learn your taste — tell me more in the chat and these explanations get sharper.`;
}
