// Stripe webhook: the ONLY thing that grants/revokes premium.
// Verifies the event really came from Stripe (signature check), then
// flips profiles.is_premium for the right user. The app can never fake this.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

// Service-role client: can write any profile, bypassing RLS (server-trusted).
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function setPremium(userId: string, isPremium: boolean) {
  if (!userId) return;
  await supabase.from("profiles").update({ is_premium: isPremium }).eq("id", userId);
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  // Read the raw body EXACTLY as received - constructEventAsync must see the
  // untouched bytes or the signature won't match.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature ?? "",
      WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    // Signature didn't verify - reject. This is what blocks fakers.
    return new Response(
      `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown"}`,
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // Someone finished paying → grant premium.
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          (session.metadata?.userId as string) ||
          (session.client_reference_id as string);
        await setPremium(userId, true);
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.paused": {
        // Subscription ended/paused → revoke premium.
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId as string;
        await setPremium(userId, false);
        break;
      }
      case "customer.subscription.updated": {
        // Handle cancellations that take effect / reactivations.
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId as string;
        const active = sub.status === "active" || sub.status === "trialing";
        await setPremium(userId, active);
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500 }
    );
  }
});
