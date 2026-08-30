import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    // Get all wedding profiles with wedding dates in the future
    const { data: profiles, error: profileError } = await supabase
      .from("wedding_profile")
      .select("id, partner1_name, partner2_name, wedding_date, venue, user_id")
      .not("wedding_date", "is", null);

    if (profileError) throw profileError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles to process", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let sentCount = 0;

    for (const profile of profiles) {
      // Get the user's email
      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!userData?.user?.email) continue;

      // Get overdue and due-this-week tasks
      const { data: tasks } = await supabase
        .from("checklist_items")
        .select("task, due_date, completed, timeframe")
        .eq("wedding_id", profile.id)
        .eq("completed", false)
        .not("due_date", "is", null)
        .lte("due_date", weekFromNow.toISOString().slice(0, 10))
        .order("due_date", { ascending: true });

      // Get payments due in next 7 days
      const { data: payments } = await supabase
        .from("budget_payments")
        .select("label, amount, due_date, paid_at, budget_item_id")
        .is("paid_at", null)
        .not("due_date", "is", null)
        .lte("due_date", weekFromNow.toISOString().slice(0, 10));

      // Get RSVP count
      const { count: totalGuests } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", profile.id);

      const { count: confirmedGuests } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", profile.id)
        .eq("rsvp_status", "confirmed");

      // Get budget remaining
      const { data: budgetItems } = await supabase
        .from("budget_items")
        .select("estimated_cost, actual_cost, deposit_paid")
        .eq("wedding_id", profile.id);

      const totalActual = (budgetItems || []).reduce((s, i) => s + Number(i.actual_cost || 0), 0);
      const totalBudget = 0; // Would come from wedding_profile.total_budget

      // Only send if there's something to report
      if ((tasks && tasks.length > 0) || (payments && payments.length > 0)) {
        // In production, send email via SendGrid/Resend/etc.
        // For now, log the digest
        console.log(`Weekly digest for ${profile.partner1_name} & ${profile.partner2_name}:`, {
          email: userData.user.email,
          overdueTasks: (tasks || []).filter(t => new Date(t.due_date) < now).length,
          upcomingTasks: (tasks || []).filter(t => new Date(t.due_date) >= now).length,
          paymentsDue: (payments || []).length,
          rsvpCount: `${confirmedGuests}/${totalGuests}`,
          budgetRemaining: totalBudget - totalActual,
        });
        sentCount++;
      }
    }

    return new Response(JSON.stringify({ message: "Digest processed", sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
