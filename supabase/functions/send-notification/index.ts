import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { webpush } from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

webpush.setVapidDetails(
  "mailto:notifications@vow.app",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

interface SendPayload {
  user_id: string;
  notif_type: string;
  title: string;
  body: string;
  deep_link?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payloadIn: SendPayload = await req.json();
    const { notif_type, title, body, deep_link } = payloadIn;

    // Authorization: either an internal service-role call, or a signed-in user
    // sending to themselves. Anonymous callers are rejected.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let user_id: string;

    if (token && token === serviceKey) {
      user_id = payloadIn.user_id;
    } else {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // A signed-in caller may only notify their own devices.
      user_id = user.id;
    }

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("notif_types, quiet_hours_start, quiet_hours_end, pause_all_until")
      .eq("user_id", user_id)
      .maybeSingle();

    if (prefs) {
      // Pause all check
      if (prefs.pause_all_until && new Date(prefs.pause_all_until) > new Date()) {
        return new Response(JSON.stringify({ sent: false, reason: "paused" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Quiet hours check
      const now = new Date();
      const userHour = now.getUTCHours(); // simplified — could use user timezone
      const quietStart = parseInt((prefs.quiet_hours_start || "22:00").split(":")[0]);
      const quietEnd = parseInt((prefs.quiet_hours_end || "07:00").split(":")[0]);
      const inQuietHours = quietStart > quietEnd
        ? (userHour >= quietStart || userHour < quietEnd)
        : (userHour >= quietStart && userHour < quietEnd);

      if (inQuietHours) {
        return new Response(JSON.stringify({ sent: false, reason: "quiet_hours" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Per-type push check
      const typePref = prefs.notif_types?.[notif_type];
      if (typePref && !typePref.push) {
        return new Response(JSON.stringify({ sent: false, reason: "disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get all subscriptions for this user
    const { data: subs, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) throw subError;
    if (!subs || subs.length === 0) {
      // Log but no subs
      await supabase.from("notification_log").insert({
        user_id, notif_type, title, body, deep_link: deep_link || "",
        status: "no_subscription",
      });
      return new Response(JSON.stringify({ sent: false, reason: "no_subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icon-192.webp",
      badge: "/icon-192.webp",
      tag: `vow-${notif_type}`,
      data: { deepLink: deep_link || "/" },
    });

    let successCount = 0;
    const expiredIds: string[] = [];

    for (const sub of subs) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
      };

      try {
        await webpush.sendNotification(pushSub, payload);
        successCount++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404 or 410 = subscription expired/invalid — clean up
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        } else {
          console.error("Push send error:", statusCode, (err as Error).message);
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }

    // Log the notification
    await supabase.from("notification_log").insert({
      user_id, notif_type, title, body, deep_link: deep_link || "",
      status: successCount > 0 ? "sent" : "all_failed",
    });

    return new Response(JSON.stringify({
      sent: successCount > 0,
      delivered: successCount,
      cleaned_up: expiredIds.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
