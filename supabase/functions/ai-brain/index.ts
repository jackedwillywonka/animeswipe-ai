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
  "titles": ["Exact Anime Title 1", "Exact Anime Title 2", ...]
}

Rules for "titles":
- 25 to 35 anime, ordered best-match first
- Use exact official English or romaji titles as found on AniList/MyAnimeList so they can be looked up
- Match the MEANING of the request: if they loved Black Clover's underdog-with-no-powers arc, prioritize shows with earned power growth and found-family, not just any action show
- Distinguish nuance: "Baki strong" (no powers, raw strength) differs from "Asta strong" (magic system, starts weak)
- Respect exclusions ("no romance", "less filler")
- Consider the full conversation history for refinements: keep roughly a third of prior suggestions that still fit and introduce fresh ones
- Never include hentai/adult titles
- Do not include the shows the user says they already watched (recommend adjacent ones instead)`;

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

    return new Response(
      JSON.stringify({
        reply: parsed.reply ?? "Here's what I found!",
        titles: Array.isArray(parsed.titles) ? parsed.titles.slice(0, 35) : [],
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
