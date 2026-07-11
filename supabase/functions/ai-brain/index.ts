// AnimeSwipe AI brain - runs on Supabase Edge Functions.
// Premium users get gpt-4o (deeper anime knowledge, hidden gems);
// free users get gpt-4o-mini.

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
- When the user asks for underrated / hidden gems / lesser-known anime, prioritize genuinely acclaimed but LESS mainstream titles over the obvious popular hits - dig into the deep catalog
- Never include hentai/adult titles
- Do not include the shows the user says they already watched (recommend adjacent ones instead)

Rules for "constraints" - extract any hard numeric limits the user states, so the app can enforce them against real data:
- maxEpisodes / minEpisodes: episode count limits (e.g. "under 100 episodes" -> maxEpisodes 100). null if not mentioned.
- episodeScope: "season" if they mean a single season (the DEFAULT when ambiguous), or "total" if they clearly mean the whole franchise.
- minYear / maxYear: release-year limits. null if not mentioned.
- minRating: minimum score out of 10 ("rated 8+" -> minRating 8). "highly rated" is NOT a number, leave null.
- CRITICAL: Read the FULL conversation. If the user CORRECTS an earlier constraint, output their LATEST intent, overriding what they said before.
- If no numeric constraints are mentioned, output all nulls with episodeScope "season".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const body = await req.json();
    const { messages, isPremium } = body;

    // ---- REVIEW SUMMARY MODE ----
    // When the app sends reviewMode + reviewData, summarize real AniList
    // watcher reviews instead of building a deck.
    if (body.reviewMode && body.reviewData) {
      const rd = body.reviewData;
      const reviewText = (rd.reviews || [])
        .map((r: any, i: number) => `Review ${i + 1} (score ${r.score ?? "n/a"}/100): ${r.summary}\n${r.body}`)
        .join("\n\n");
      const reviewPrompt = `You are AnimeSwipe AI's anime expert friend. A user wants to know what real watchers thought of "${rd.title}" (community average score: ${rd.averageScore ?? "n/a"}/100).

Here are real reviews from AniList watchers:

${reviewText || "(No written reviews available for this title.)"}

Write a warm, conversational 3-4 sentence summary of what watchers generally think - the praise, the common criticisms, and who'd enjoy it. Be honest (include negatives if reviewers mentioned them). Reference the average score naturally. Do NOT invent opinions not present in the reviews. If there are no reviews, say the community rates it [score] but there aren't many written reviews yet, and give a brief take based on the score. Reply as plain conversational text, NOT JSON.`;

      const revRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: [{ role: "user", content: reviewPrompt }],
        }),
      });
      const revData = await revRes.json();
      const summary = revData.choices?.[0]?.message?.content ?? "I couldn't summarize the reviews right now.";
      return new Response(
        JSON.stringify({ reviewSummary: summary }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // gpt-4o-mini for everyone: great results, cheap to run. "Smarter" comes
    // from better engineering (reviews, cross-referencing), not a pricier model.
    const model = "gpt-4o-mini";

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
        model, // for debugging - shows which model answered
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
