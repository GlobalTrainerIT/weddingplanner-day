import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendNotification(supabase: ReturnType<typeof createClient>, userId: string, type: string, title: string, body: string, deepLink: string) {
  const { error } = await supabase.functions.invoke("send-notification", {
    body: { user_id: userId, notif_type: type, title, body, deep_link: deepLink },
  });
  if (error) console.error(`Failed to send ${type} to ${userId}:`, error.message);
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

    // Internal-only: this dispatcher may be called by trusted server code only.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token || token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event_type, wedding_id, data } = await req.json();

    if (!event_type || !wedding_id) {
      return new Response(JSON.stringify({ error: "event_type and wedding_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get wedding profile for user IDs
    const { data: profile, error: profError } = await supabase
      .from("wedding_profile")
      .select("user_id, partner_user_id, partner1_name, partner2_name")
      .eq("id", wedding_id)
      .maybeSingle();

    if (profError || !profile) {
      return new Response(JSON.stringify({ error: "wedding not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let dispatched = 0;
    const userIds = [profile.user_id, profile.partner_user_id].filter(Boolean) as string[];

    switch (event_type) {
      case "new_rsvp": {
        // Notify the primary user (not the guest who RSVP'd)
        const guestName = data?.guest_name || "A guest";
        const status = data?.status || "responded";
        for (const uid of userIds) {
          await sendNotification(supabase, uid, "new_rsvp", "New RSVP received", `${guestName} ${status === "confirmed" ? "is attending" : status === "declined" ? "cannot attend" : "has responded"}`, `/app?section=guests`);
          dispatched++;
        }
        break;
      }

      case "partner_task": {
        // Notify the partner when a task is completed
        const taskName = data?.task_name || "a task";
        const completedBy = data?.completed_by_user_id;
        const partnerId = userIds.find(id => id !== completedBy);
        if (partnerId) {
          await sendNotification(supabase, partnerId, "partner_task", "Task completed", `${data?.completed_by_name || "Your partner"} completed: ${taskName}`, `/app?section=checklist&task=${data?.task_id || ""}`);
          dispatched++;
        }
        break;
      }

      case "mention": {
        // Notify the mentioned user
        const mentionedUserId = data?.mentioned_user_id;
        const mentionedBy = data?.mentioned_by_name || "Someone";
        const context = data?.context || "mentioned you";
        if (mentionedUserId) {
          await sendNotification(supabase, mentionedUserId, "mention", "You were mentioned", `${mentionedBy} ${context}`, data?.deep_link || "/app");
          dispatched++;
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `unknown event_type: ${event_type}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ dispatched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error('notify-event failed', err);
    return new Response(JSON.stringify({ error: 'Notification dispatch failed' }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
