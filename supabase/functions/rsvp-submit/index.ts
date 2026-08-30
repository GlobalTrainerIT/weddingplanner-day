import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

if (Deno.env.get("SUPABASE_URL") === undefined) {
  // Env vars are injected at runtime; this is just a type-level guard.
}

interface RsvpSubmission {
  wedding_id: string;
  household_id: string | null;
  captcha_token?: string;
  members: Array<{
    guest_id: string;
    attending: boolean;
    meal: string;
    dietary: string;
    plus_one_attending: boolean;
    plus_one_name: string;
  }>;
  message: string;
}

const MAX_MEMBERS = 50;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_DIETARY_LENGTH = 500;
const MAX_PLUS_ONE_NAME_LENGTH = 200;
const VALID_MEALS = ["Chicken", "Beef", "Fish", "Vegetarian", "Vegan", ""];

// In-memory rate limiting per IP. Each entry: array of timestamps.
// Window: 5 submissions per 10 minutes per IP.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const entries = rateLimitMap.get(ip) || [];
  const recent = entries.filter(t => t > cutoff);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

// Periodic cleanup of stale rate limit entries
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [ip, entries] of rateLimitMap.entries()) {
    const recent = entries.filter(t => t > cutoff);
    if (recent.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, recent);
    }
  }
}, 60 * 1000);

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  return "unknown";
}

async function verifyCaptcha(token: string, provider: string, secret: string, remoteip?: string): Promise<boolean> {
  try {
    if (provider === "turnstile") {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          ...(remoteip ? { remoteip } : {}),
        }),
      });
      const data = await res.json();
      return data.success === true;
    } else {
      // hCaptcha
      const res = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          ...(remoteip ? { remoteip } : {}),
        }),
      });
      const data = await res.json();
      return data.success === true;
    }
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const ip = getClientIP(req);

  // Rate limit check
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Too many submissions. Please wait a few minutes and try again." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: RsvpSubmission;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Basic validation
  if (!body.wedding_id || !Array.isArray(body.members)) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.members.length === 0 || body.members.length > MAX_MEMBERS) {
    return new Response(JSON.stringify({ error: "Invalid submission" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (typeof body.message === "string" && body.message.length > MAX_MESSAGE_LENGTH) {
    return new Response(JSON.stringify({ error: "Message too long" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate member fields
  for (const m of body.members) {
    if (!m.guest_id) {
      return new Response(JSON.stringify({ error: "Missing guest ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof m.attending !== "boolean") {
      return new Response(JSON.stringify({ error: "Invalid attendance value" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_MEALS.includes(m.meal)) {
      return new Response(JSON.stringify({ error: "Invalid meal choice" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof m.dietary === "string" && m.dietary.length > MAX_DIETARY_LENGTH) {
      return new Response(JSON.stringify({ error: "Dietary restrictions text too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof m.plus_one_name === "string" && m.plus_one_name.length > MAX_PLUS_ONE_NAME_LENGTH) {
      return new Response(JSON.stringify({ error: "Plus-one name too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // CAPTCHA verification (if configured)
  const captchaSecret = Deno.env.get("CAPTCHA_SECRET") || Deno.env.get("HCAPTCHA_SECRET");
  const captchaProvider = Deno.env.get("CAPTCHA_PROVIDER") || "turnstile";

  if (captchaSecret) {
    if (!body.captcha_token) {
      return new Response(JSON.stringify({ error: "Please complete the verification check." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const verified = await verifyCaptcha(body.captcha_token, captchaProvider, captchaSecret, ip);
    if (!verified) {
      return new Response(JSON.stringify({ error: "Verification check failed. Please try again." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Server-side validation: verify the wedding exists and RSVP is open
  const { data: wedding, error: weddingError } = await supabase
    .from("wedding_profile")
    .select("id, rsvp_enabled, rsvp_deadline, rsvp_slug")
    .eq("id", body.wedding_id)
    .maybeSingle();

  if (weddingError || !wedding) {
    return new Response(JSON.stringify({ error: "Wedding not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!wedding.rsvp_enabled) {
    return new Response(JSON.stringify({ error: "RSVP is not available for this wedding." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (wedding.rsvp_deadline) {
    const deadline = new Date(wedding.rsvp_deadline + "T23:59:59");
    if (deadline < new Date()) {
      return new Response(JSON.stringify({ error: "The RSVP deadline has passed." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Server-side validation: verify the household belongs to this wedding.
  // A null household means a guest who is not grouped into one; that submission
  // may cover exactly one guest, and that guest must itself be unhoused.
  if (body.household_id !== null && body.household_id !== undefined) {
    const { data: household, error: householdError } = await supabase
      .from("households")
      .select("id, wedding_id")
      .eq("id", body.household_id)
      .maybeSingle();

    if (householdError || !household) {
      return new Response(JSON.stringify({ error: "Household not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (household.wedding_id !== body.wedding_id) {
      return new Response(JSON.stringify({ error: "This household does not belong to this wedding." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else if (body.members.length !== 1) {
    return new Response(JSON.stringify({ error: "Invalid submission" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Server-side validation: verify every guest_id belongs to this household + wedding
  const guestIds = body.members.map(m => m.guest_id);
  const { data: guests, error: guestsError } = await supabase
    .from("guests")
    .select("id, household_id, wedding_id, plus_one_allowed, plus_one_name, first_name, last_name")
    .in("id", guestIds)
    .eq("wedding_id", body.wedding_id);

  if (guestsError || !guests) {
    return new Response(JSON.stringify({ error: "Could not verify guests" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build a lookup for validation
  const guestMap = new Map(guests.map(g => [g.id, g]));

  for (const m of body.members) {
    const guest = guestMap.get(m.guest_id);
    if (!guest) {
      return new Response(JSON.stringify({ error: "One or more guests could not be found for this wedding." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((guest.household_id ?? null) !== (body.household_id ?? null)) {
      return new Response(JSON.stringify({ error: "Guest does not belong to the selected household." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Prevent plus-one abuse: only allow plus_one if the guest is allowed one
    if (m.plus_one_attending && !guest.plus_one_allowed) {
      return new Response(JSON.stringify({ error: "This guest does not have a plus-one invitation." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // All validation passed — write the RSVPs using service role (bypasses RLS)
  for (const m of body.members) {
    const guest = guestMap.get(m.guest_id);
    const attending = m.attending;

    const { error: updateError } = await supabase
      .from("guests")
      .update({
        rsvp_status: attending ? "confirmed" : "declined",
        meal_choice: attending ? m.meal : "",
        dietary_restrictions: m.dietary,
        plus_one_rsvp: m.plus_one_attending ? "attending" : "declined",
        plus_one_name: m.plus_one_attending ? m.plus_one_name : (guest?.plus_one_name || ""),
      })
      .eq("id", m.guest_id)
      .eq("wedding_id", body.wedding_id);

    if (updateError) {
      console.error("Failed to update guest", m.guest_id, updateError);
    }

    const { error: responseError } = await supabase
      .from("rsvp_responses")
      .upsert({
        wedding_id: body.wedding_id,
        guest_id: m.guest_id,
        guest_name: `${guest?.first_name || ""} ${guest?.last_name || ""}`.trim(),
        rsvp_status: attending ? "attending" : "declined",
        meal_choice: attending ? m.meal : "",
        dietary_restrictions: m.dietary,
        plus_one_attending: m.plus_one_attending,
        plus_one_name: m.plus_one_attending ? m.plus_one_name : "",
        message: body.message?.trim() || "",
      }, { onConflict: "wedding_id,guest_id" });

    if (responseError) {
      console.error("Failed to upsert rsvp_response", m.guest_id, responseError);
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
