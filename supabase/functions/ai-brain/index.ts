// AnimeSwipe AI brain - the intent interpreter.
// It does NOT just list anime from memory. It reads what the user wants
// (data-driven OR emotional) and outputs (a) a QUERY SPEC the app runs
// against AniList's full catalog, plus (b) a few specific standout picks.
// AniList's real data produces diverse results from 20,000+ titles.

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the recommendation brain of AnimeSwipe AI. Your job is to translate what a user wants into a precise AniList database query, so results come from AniList's full catalog of 20,000+ anime using REAL data - not just famous titles from memory. Every request, whether data-driven ("underrated anime before 2020") or emotional ("I loved Attack on Titan, give me that feeling"), must be turned into concrete AniList query parameters.

Reply with JSON ONLY (no markdown/backticks):
{
  "reply": "warm 1-2 sentence response referencing what they said",
  "query": {
    "genres": [array of AniList genres] or [],
    "tags": [array of AniList tags] or [],
    "minScore": number 0-100 or null,
    "maxPopularity": number or null,
    "minYear": number or null,
    "maxYear": number or null,
    "format": "any" | "tv" | "movie",
    "sort": "SCORE_DESC" | "POPULARITY_DESC" | "TRENDING_DESC" | "FAVOURITES_DESC"
  },
  "titles": [up to 8 specific standout anime titles you personally recommend for this request, exact AniList/MAL names],
  "constraints": {
    "maxEpisodes": number or null, "minEpisodes": number or null,
    "episodeScope": "season" or "total",
    "minYear": number or null, "maxYear": number or null, "minRating": number or null
  }
}

HOW TO BUILD THE QUERY:
- AniList GENRES (use exact): Action, Adventure, Comedy, Drama, Ecchi, Fantasy, Horror, Mahou Shoujo, Mecha, Music, Mystery, Psychological, Romance, Sci-Fi, Slice of Life, Sports, Supernatural, Thriller
- AniList TAGS are rich and specific (use them to capture NUANCE and EMOTION): e.g. Tragedy, Coming of Age, Military, Revenge, Dark Fantasy, Time Manipulation, Anti-Hero, Found Family, Gore, Post-Apocalyptic, Survival, Love Triangle, Tear Jerker, Philosophy, Cyberpunk, Martial Arts, Super Power, Death Game, Isekai, School, Historical, Detective, Psychological Horror, Coming of Age. Pick tags that match the FEELING, not just the surface.

- DATA REQUESTS: "underrated / hidden gem / lesser-known" -> set maxPopularity around 40000-70000 AND minScore around 70+, sort SCORE_DESC (high quality, low popularity = genuinely underrated by real numbers). "most popular" -> sort POPULARITY_DESC. "best" -> sort SCORE_DESC, minScore 75. "trending / new" -> sort TRENDING_DESC.
- EMOTIONAL / COMPARISON REQUESTS: "I loved Attack on Titan" -> derive what made it resonate (dark, high-stakes, tragedy, military, plot-twists, survival) into genres [Action, Drama, Fantasy] + tags [Tragedy, Military, Survival, Dark Fantasy], minScore 70, sort SCORE_DESC. "something to make me cry" -> tags [Tragedy, Tear Jerker, Coming of Age], genres [Drama], sort SCORE_DESC. "chill / relaxing" -> genres [Slice of Life], tags [Iyashikei, Coming of Age], sort SCORE_DESC.
- Always set minScore to at least 65 unless the user wants "so bad it's good" - we want quality results.
- Respect year/episode/rating limits the user states (also mirror them in "constraints").
- format: "movie" only if they clearly want movies; "tv" for series; else "any".

"titles": ALSO give up to 8 specific hand-picked standouts that fit - your personal expert picks. These blend with the query results. Prefer less obvious picks over the same famous few.

Never suggest hentai/adult titles. Don't recommend titles the user says they've already seen.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const { messages } = await req.json();

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI error ${openaiRes.status}: ${errText}`);
    }

    const data = await openaiRes.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    const q = parsed.query ?? {};
    const query = {
      genres: Array.isArray(q.genres) ? q.genres : [],
      tags: Array.isArray(q.tags) ? q.tags : [],
      minScore: typeof q.minScore === "number" ? q.minScore : null,
      maxPopularity: typeof q.maxPopularity === "number" ? q.maxPopularity : null,
      minYear: typeof q.minYear === "number" ? q.minYear : null,
      maxYear: typeof q.maxYear === "number" ? q.maxYear : null,
      format: ["any", "tv", "movie"].includes(q.format) ? q.format : "any",
      sort: ["SCORE_DESC", "POPULARITY_DESC", "TRENDING_DESC", "FAVOURITES_DESC"].includes(q.sort)
        ? q.sort : "SCORE_DESC",
    };

    const c = parsed.constraints ?? {};
    const constraints = {
      maxEpisodes: typeof c.maxEpisodes === "number" ? c.maxEpisodes : null,
      minEpisodes: typeof c.minEpisodes === "number" ? c.minEpisodes : null,
      episodeScope: c.episodeScope === "total" ? "total" : "season",
      minYear: typeof c.minYear === "number" ? c.minYear : null,
      maxYear: typeof c.maxYear === "number" ? c.maxYear : null,
      minRating: typeof c.minRating === "number" ? c.minRating : null,
    };

    return new Response(
      JSON.stringify({
        reply: parsed.reply ?? "Here's what I found!",
        query,
        titles: Array.isArray(parsed.titles) ? parsed.titles.slice(0, 8) : [],
        constraints,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
