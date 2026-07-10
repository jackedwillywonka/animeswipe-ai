// Creates a Stripe Checkout session for the AnimeSwipe Premium subscription.
// Runs server-side so the Stripe secret key never touches the app.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICE_ID = Deno.env.get("STRIPE_PRICE_ID") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, returnUrl } = await req.json();
    if (!userId) throw new Error("missing userId");

    // Create the checkout session. We stash the app's userId in metadata so
    // the webhook (built next) knows WHICH user just paid.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
      success_url: `${returnUrl ?? "https://animeswipe-ai.vercel.app"}?upgrade=success`,
      cancel_url: `${returnUrl ?? "https://animeswipe-ai.vercel.app"}?upgrade=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
