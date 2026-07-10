// Creates a Stripe Customer Portal session so a user can manage/cancel
// their subscription. Looks up their Stripe customer by the userId we
// stored at checkout.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

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

    // Find the Stripe customer whose subscription metadata has this userId.
    // We search recent subscriptions and match on metadata.
    const subs = await stripe.subscriptions.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });
    const customerId = subs.data[0]?.customer as string | undefined;
    if (!customerId) throw new Error("no subscription found for user");

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl ?? "https://animeswipe-ai.vercel.app",
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
