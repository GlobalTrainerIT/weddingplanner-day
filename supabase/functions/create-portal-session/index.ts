import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const CANONICAL_URL = 'https://weddingplanner.day/';

/**
 * Only ever hand Stripe a return address on a host we own. A caller-supplied
 * URL is honoured for its path, but its origin must be on the allowlist,
 * otherwise the billing portal could be used to redirect visitors off-site.
 */
function safeReturnUrl(candidate: unknown): string {
  if (typeof candidate !== 'string' || candidate.length === 0) return CANONICAL_URL;

  const allowed = new Set<string>([
    'https://weddingplanner.day',
    'https://www.weddingplanner.day',
  ]);
  const configured = Deno.env.get('APP_URL');
  if (configured) {
    try {
      allowed.add(new URL(configured).origin);
    } catch {
      // ignore a malformed APP_URL
    }
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return CANONICAL_URL;
    if (!allowed.has(url.origin)) return CANONICAL_URL;
    return url.toString();
  } catch {
    return CANONICAL_URL;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the JWT and get the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the stripe_customer_id from subscriptions
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError || !sub?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No active subscription found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const returnUrl = safeReturnUrl((body as { returnUrl?: unknown }).returnUrl);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-04-10',
    });

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: returnUrl,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Never surface internal error text to the caller.
    console.error('create-portal-session failed', error);
    return new Response(JSON.stringify({ error: 'Unable to open the billing portal.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
