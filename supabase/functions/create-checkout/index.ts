import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * Resolve the origin Stripe should return shoppers to.
 *
 * The Origin header is attacker-controlled, so it is only trusted when it
 * matches a host we own. Anything else returns '' and the caller rejects the
 * request rather than building a redirect to somebody else's site.
 */
function safeOrigin(req: Request): string {
  const configured = Deno.env.get('APP_URL');
  if (configured) return configured.replace(/\/+$/, '');

  const allowed = new Set<string>([
    'https://weddingplanner.day',
    'https://www.weddingplanner.day',
    'http://localhost:5173',
    'http://localhost:3000',
  ]);

  const origin = req.headers.get('Origin') || '';
  try {
    const parsed = new URL(origin);
    if (allowed.has(parsed.origin)) return parsed.origin;
  } catch {
    // fall through
  }
  return '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { priceId } = await req.json();

    // Only prices this deployment was configured with may be purchased.
    const allowedPrices = [
      Deno.env.get('Pro_Full_Acces_Monthly'),
      Deno.env.get('Pro_Full_Access_Yearly'),
      Deno.env.get('Planner_Pro'),
      Deno.env.get('STRIPE_PRICE_ID_MONTHLY'),
      Deno.env.get('STRIPE_PRICE_ID_ANNUAL'),
      Deno.env.get('STRIPE_PRICE_ID_PLANNER'),
      'price_1TYQcpDdXDOMufeNp1QJCe06',
      'price_1TYQacDdXDOMufeNylUJUYEJ',
      'price_1TYQbiDdXDOMufeN6tny8eKm',
    ].filter((p): p is string => typeof p === 'string' && p.startsWith('price_'));

    if (typeof priceId !== 'string' || !priceId.startsWith('price_')) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (allowedPrices.length > 0 && !allowedPrices.includes(priceId)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = safeOrigin(req);
    if (!origin) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-04-10',
    });

    // Detect recurring vs one-time price
    const price = await stripe.prices.retrieve(priceId);
    const isRecurring = price.type === 'recurring';

    const session = await stripe.checkout.sessions.create({
      mode: isRecurring ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      customer_email: user.email,
      metadata: { userId: user.id },
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('create-checkout failed', error);
    return new Response(JSON.stringify({ error: 'Checkout could not be started' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
