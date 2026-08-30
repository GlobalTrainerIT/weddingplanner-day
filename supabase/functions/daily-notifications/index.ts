import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendNotification(supabase: ReturnType<typeof createClient>, userId: string, type: string, title: string, body: string, deepLink: string) {
  // Call the send-notification edge function
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
    // Scheduled job: only trusted server callers may trigger a run.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token || token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const todayStr = now.toISOString().slice(0, 10);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const sevenDaysStr = sevenDays.toISOString().slice(0, 10);
    const threeDaysStr = threeDays.toISOString().slice(0, 10);

    let dispatched = 0;

    // 1. Tasks due tomorrow
    const { data: tasksDue } = await supabase
      .from("checklist_items")
      .select("id, task, wedding_id, due_date, user_id")
      .eq("completed", false)
      .not("due_date", "is", null)
      .eq("due_date", tomorrowStr);

    for (const task of tasksDue || []) {
      // Get user_id from wedding profile
      const { data: profile } = await supabase
        .from("wedding_profile")
        .select("user_id, partner_user_id")
        .eq("id", task.wedding_id)
        .maybeSingle();
      if (!profile) continue;

      const userIds = [profile.user_id, profile.partner_user_id].filter(Boolean) as string[];
      for (const uid of userIds) {
        await sendNotification(supabase, uid, "task_due", "Task due tomorrow", `${task.task} is due tomorrow`, `/app?section=checklist&task=${task.id}`);
        dispatched++;
      }
    }

    // 2a. Payments due in 7 days
    const { data: payments7 } = await supabase
      .from("budget_payments")
      .select("id, label, amount, due_date, budget_item_id, wedding_id")
      .is("paid_at", null)
      .not("due_date", "is", null)
      .eq("due_date", sevenDaysStr);

    for (const payment of payments7 || []) {
      const { data: profile } = await supabase
        .from("wedding_profile")
        .select("user_id, partner_user_id")
        .eq("id", payment.wedding_id)
        .maybeSingle();
      if (!profile) continue;

      const userIds = [profile.user_id, profile.partner_user_id].filter(Boolean) as string[];
      for (const uid of userIds) {
        await sendNotification(supabase, uid, "payment_due_7day", "Payment due in 7 days", `${payment.label} — $${payment.amount} due ${payment.due_date}`, `/app?section=budget&payment=${payment.id}`);
        dispatched++;
      }
    }

    // 2b. Payments due today
    const { data: paymentsToday } = await supabase
      .from("budget_payments")
      .select("id, label, amount, due_date, budget_item_id, wedding_id")
      .is("paid_at", null)
      .not("due_date", "is", null)
      .eq("due_date", todayStr);

    for (const payment of paymentsToday || []) {
      const { data: profile } = await supabase
        .from("wedding_profile")
        .select("user_id, partner_user_id")
        .eq("id", payment.wedding_id)
        .maybeSingle();
      if (!profile) continue;

      const userIds = [profile.user_id, profile.partner_user_id].filter(Boolean) as string[];
      for (const uid of userIds) {
        await sendNotification(supabase, uid, "payment_due_today", "Payment due today", `${payment.label} — $${payment.amount} is due today`, `/app?section=budget&payment=${payment.id}`);
        dispatched++;
      }
    }

    // 3. RSVP deadline in 3 days
    const { data: profiles } = await supabase
      .from("wedding_profile")
      .select("id, user_id, partner_user_id, rsvp_deadline")
      .not("rsvp_deadline", "is", null)
      .eq("rsvp_deadline", threeDaysStr);

    for (const profile of profiles || []) {
      const userIds = [profile.user_id, profile.partner_user_id].filter(Boolean) as string[];
      for (const uid of userIds) {
        await sendNotification(supabase, uid, "rsvp_deadline", "RSVP deadline in 3 days", "Your RSVP deadline is in 3 days. Check your responses.", `/app?section=guests`);
        dispatched++;
      }
    }

    return new Response(JSON.stringify({
      message: "Daily notifications dispatched",
      dispatched,
      date: todayStr,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
