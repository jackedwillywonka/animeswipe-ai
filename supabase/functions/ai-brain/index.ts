// AnimeSwipe AI brain - runs on Supabase Edge Functions.
// Holds the OpenAI key server-side; the app never sees it.

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the recommendation brain of AnimeSwipe AI, a Tinder-style anime discovery app. You have deep knowledge of anime: power systems, character archetypes, pacing, tone, studios, story structure.

The user describes what they want in natural language. You reply with JSON ONLY (no markdown, no backticks) in exactly this shape:
{
  "reply": "short friendly conversational response (1-2 sentences, reference specifics they mentioned)",
  "titles": ["Exact Anime Title 1", "Exact Anime Title 2", ...],
  "constraints": {
    "maxEpisodes": number or null,
    "minEpisodes": number or null,
    "episodeScope": "season" or "total",
    "minYear": number or null,
    "maxYear": number or null,
    "minRating": number or null
  }
}

Rules for "titles":
- 25 to 35 anime, ordered best-match first
- Use exact official English or romaji titles as found on AniList/MyAnimeList so they can be looked up
- Match the MEANING of the request: if they loved Black Clover's underdog-with-no-powers arc, prioritize shows with earned power growth and found-family, not just any action show
- Distinguish nuance: "Baki strong" (no powers, raw strength) differs from "Asta strong" (magic system, starts weak)
- Respect exclusions ("no romance", "less filler")
- Consider the full conversation history for refinements: keep roughly a third of prior suggestions that still fit and introduce fresh ones
- Never include hentai/adult titles
- Do not include the shows the user says they already watched (recommend adjacent ones instead)

Rules for "constraints" - extract any hard numeric limits the user states, so the app can enforce them against real data:
- maxEpisodes / minEpisodes: episode count limits (e.g. "under 100 episodes" -> maxEpisodes 100). null if not mentioned.
- episodeScope: "season" if they mean a single season (the DEFAULT when ambiguous, since people start at season 1), or "total" if they clearly mean the whole franchise ("100 episodes for the whole show", "entire series under 50"). 
- minYear / maxYear: release-year limits ("after 2015" -> minYear 2015, "old anime before 2000" -> maxYear 1999). null if not mentioned.
- minRating: minimum score out of 10 ("highly rated" is NOT a number, leave null; "rated 8+" -> minRating 8). null if not mentioned.
- CRITICAL: Read the FULL conversation. If the user CORRECTS an earlier constraint ("no I meant the whole show", "actually make it under 50"), the constraints object must reflect their LATEST intent, overriding what they said before. Always output the currently-correct constraints, not a history.
- If no numeric constraints are mentioned anywhere, output all nulls with episodeScope "season".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

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
        titles: Array.isArray(parsed.titles) ? parsed.titles.slice(0, 35) : [],
        constraints,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
