import { useState, useEffect } from 'react';
import { Heart, CheckSquare, DollarSign, Users, Store, AlertCircle, Lock, X, Check, Plus, Clock, ChevronRight, MapPin } from 'lucide-react';
import type { Section, WeddingProfile, BudgetItem, BudgetPayment, Guest, ChecklistItem, Vendor, Household } from '../types';
import { n, fmtMoney } from '../lib/utils';
import { useCountdown, parseLocalDate, daysUntil } from '../lib/useCountdown';
import { getTaskStatus, formatAssignee, assigneeColor } from '../lib/dueDates';
import { getTotalCommitted, getTotalPaid, getBudgetRemaining } from '../lib/budgetSelectors';

interface Props {
  profile: WeddingProfile | null;
  budgetItems: BudgetItem[];
  payments: BudgetPayment[];
  guests: Guest[];
  households: Household[];
  checklist: ChecklistItem[];
  vendors: Vendor[];
  isPro: boolean;
  onShowPricing: () => void;
  onNavigate: (s: Section) => void;
  onToggleTask: (item: ChecklistItem) => void;
  children?: React.ReactNode;
}

export default function Dashboard({ profile, budgetItems, payments, guests, households, checklist, vendors, isPro, onShowPricing, onNavigate, onToggleTask, children }: Props) {
  const [paywallDismissed, setPaywallDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem('vow-paywall-dismissed') === '1';
  });
  const countdown = useCountdown(profile?.wedding_date ?? null);
  const daysToGo = daysUntil(profile?.wedding_date ?? null);

  useEffect(() => {
    if (isPro || paywallDismissed) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPaywallDismissed(true); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isPro, paywallDismissed]);

  // Derived values
  const totalBudget = n(profile?.total_budget);
  const totalCommitted = getTotalCommitted(budgetItems);
  const totalPaidPayments = getTotalPaid(payments);
  const budgetRemaining = getBudgetRemaining(totalBudget, budgetItems);

  const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed').length;
  const declinedGuests = guests.filter(g => g.rsvp_status === 'declined').length;
  const pendingGuests = guests.filter(g => g.rsvp_status === 'pending').length;
  const invitedGuests = guests.length;
  const invitesSentGuests = guests.filter(g => g.invite_sent).length;
  const seatedGuests = guests.filter(g => g.table_number !== null && g.table_number !== undefined).length;
  const mealChosenGuests = guests.filter(g => g.rsvp_status === 'confirmed' && g.meal_choice).length;
  const plusOnesConfirmed = guests.filter(g => g.has_plus_one && g.plus_one_rsvp === 'confirmed').length;
  const totalAttending = confirmedGuests + plusOnesConfirmed;
  const mealsStillNeeded = Math.max(0, totalAttending - mealChosenGuests);

  // Household-level stats
  const totalHouseholds = households.length;
  const householdInviteSent = households.filter(h => h.invite_sent).length;
  const householdResponded = households.filter(h => {
    const members = guests.filter(g => g.household_id === h.id);
    if (members.length === 0) return false;
    return members.every(g => g.rsvp_status === 'confirmed' || g.rsvp_status === 'declined');
  }).length;

  const completedTasks = checklist.filter(c => c.completed).length;
  const totalTasks = checklist.length;
  const checklistPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const unsignedVendors = vendors.filter(v => (v.status === 'booked' || v.status === 'paid') && !v.contract_signed);

  // Needs Attention items
  const overdueTasks = checklist.filter(c => !c.completed && getTaskStatus(c, profile?.created_at) === 'overdue');

  // Payments from the budget_payments table (real data)
  function daysUntilDate(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const target = new Date(`${dateStr}T00:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  const unpaidPayments = payments
    .filter(p => !p.paid_at && p.due_date)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  const paymentsDueSoon = unpaidPayments.filter(p => {
    const d = daysUntilDate(p.due_date);
    return d !== null && d <= 30 && d >= 0;
  });

  const nextPayment = unpaidPayments[0];

  // This week's top 3 tasks
  const topTasksThisWeek = [...checklist.filter(c => !c.completed)]
    .sort((a, b) => {
      const sa = getTaskStatus(a, profile?.created_at);
      const sb = getTaskStatus(b, profile?.created_at);
      const priority: Record<string, number> = { overdue: 0, due_this_week: 1, due_this_month: 2, upcoming: 3, no_date: 4 };
      return (priority[sa] ?? 99) - (priority[sb] ?? 99);
    })
    .slice(0, 3);

  // Planning phases
  const PHASES = ['18+ Months', '12 Months', '9 Months', '6 Months', '3 Months', '1 Month', '2 Weeks', '1 Week', 'Day Before', 'Wedding Day'];
  const phaseData = PHASES.map(phase => {
    const phaseItems = checklist.filter(c => c.timeframe === phase);
    const done = phaseItems.filter(c => c.completed).length;
    return { phase, total: phaseItems.length, done, pct: phaseItems.length > 0 ? Math.round((done / phaseItems.length) * 100) : 0 };
  });

  // Determine current phase based on days to go
  const currentPhaseIndex = (() => {
    if (!daysToGo || daysToGo < 0) return PHASES.length - 1;
    if (daysToGo > 540) return 0;
    if (daysToGo > 365) return 1;
    if (daysToGo > 270) return 2;
    if (daysToGo > 180) return 3;
    if (daysToGo > 90) return 4;
    if (daysToGo > 30) return 5;
    if (daysToGo > 14) return 6;
    if (daysToGo > 7) return 7;
    if (daysToGo > 1) return 8;
    return 9;
  })();

  // Tasks behind verdict — only count incomplete tasks in the current phase that are actually overdue
  const currentPhase = phaseData[currentPhaseIndex];
  const tasksBehind = currentPhase
    ? checklist.filter(c => !c.completed && c.timeframe === currentPhase.phase && getTaskStatus(c, profile?.created_at) === 'overdue').length
    : 0;

  // Empty state check
  const isEmpty = !profile?.wedding_date && invitedGuests === 0 && budgetItems.length === 0 && vendors.length === 0;

  const dismissPaywall = () => {
    sessionStorage.setItem('vow-paywall-dismissed', '1');
    setPaywallDismissed(true);
  };

  // Needs attention items
  const needsAttention: { label: string; sub: string; icon: React.ReactNode; action: () => void; urgent?: boolean }[] = [];
  overdueTasks.forEach(t => needsAttention.push({
    label: t.task, sub: 'Overdue task', icon: <AlertCircle size={14} className="text-rose-500" />,
    action: () => onNavigate('checklist'), urgent: true,
  }));
  paymentsDueSoon.forEach(p => needsAttention.push({
    label: p.label, sub: `${fmtMoney(n(p.amount))} due ${new Date(`${p.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${budgetItems.find(i => i.id === p.budget_item_id)?.item_name || ''}`,
    icon: <DollarSign size={14} className="text-amber-600" />, action: () => onNavigate('budget'),
  }));
  unsignedVendors.forEach(v => needsAttention.push({
    label: v.business_name, sub: v.contract_file_path ? 'Contract attached — not signed' : 'No contract attached', icon: <Store size={14} className="text-amber-600" />,
    action: () => onNavigate('vendors'),
  }));

  const dashboardContent = (
    <div className="space-y-6">
      {/* 1. HERO — compact */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1510] via-[#251a10] to-[#1a1510] p-6 md:p-8">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 15% 60%, rgba(201,169,110,0.15) 0%, transparent 50%), radial-gradient(circle at 85% 20%, rgba(201,169,110,0.10) 0%, transparent 40%)' }} />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={12} className="text-[#8a6d3b] fill-[#c9a96e]" />
              <span className="text-[#8a6d3b] text-xs tracking-widest uppercase font-light">Your Wedding</span>
            </div>
            <h1 className="text-white font-serif text-3xl md:text-4xl mb-1 leading-tight">
              {profile?.partner1_name || 'Partner 1'} &amp; {profile?.partner2_name || 'Partner 2'}
            </h1>
            {profile?.wedding_date ? (
              <p className="text-[#a08050] text-sm">
                {parseLocalDate(profile.wedding_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            ) : (
              <button onClick={() => onNavigate('overview')} className="text-[#8a6d3b] text-sm hover:underline">Set your wedding date →</button>
            )}
            {profile?.venue && <p className="text-[#5d4e3e] text-sm mt-0.5 flex items-center gap-1"><MapPin size={11} /> {profile.venue}</p>}
          </div>

          {countdown !== null && (
            <div className="text-center bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-2xl px-5 py-4 flex-shrink-0">
              {countdown.past ? (
                <>
                  <div className="text-[#a08050] text-[10px] tracking-widest uppercase mb-1">Congratulations!</div>
                  <div className="text-[#8a6d3b] font-serif text-3xl font-bold leading-none">You're married!</div>
                  <div className="text-[#a08050] text-xs mt-2">Time for thank-yous and memories</div>
                  <button onClick={() => onNavigate('checklist')} className="mt-2 text-[#8a6d3b] text-xs hover:underline">After the Big Day checklist →</button>
                </>
              ) : (
                <>
                  <div className="text-[#a08050] text-[10px] tracking-widest uppercase mb-1">Days to go</div>
                  <div className="text-[#8a6d3b] font-serif text-4xl font-bold leading-none">{countdown.days}</div>
                  <div className="text-[#a08050] text-xs mt-1">{countdown.days > 0 ? `${countdown.hours}h ${countdown.minutes}m` : "Today!"}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 10. Partner collaboration invite (above fold until joined) */}
      {children && !profile?.partner_user_id && (
        <div>{children}</div>
      )}

      {/* 12. Empty state */}
      {isEmpty ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8">
          <h2 className="text-[#2a1f15] font-serif text-2xl mb-2">Welcome to Vow</h2>
          <p className="text-[#6b5d4f] text-sm mb-6">Let's get your wedding planning started. Complete these steps to set up your planner:</p>
          <div className="space-y-3">
            {[
              { label: 'Set your wedding date', done: !!profile?.wedding_date, action: () => onNavigate('overview') },
              { label: 'Set your overall budget', done: totalBudget > 0, action: () => onNavigate('overview') },
              { label: 'Add your first 10 guests', done: invitedGuests >= 10, action: () => onNavigate('guests') },
              { label: 'Invite your partner', done: !!profile?.partner_user_id, action: () => onNavigate('overview') },
              { label: 'Book your first vendor', done: vendors.length > 0, action: () => onNavigate('vendors') },
            ].map((step, i) => (
              <button key={i} onClick={step.action} className="w-full flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-left">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-emerald-500' : 'border-2 border-stone-300'}`}>
                  {step.done && <Check size={14} className="text-white" />}
                </div>
                <span className={`text-sm ${step.done ? 'text-[#6b5d4f] line-through' : 'text-[#2a1f15]'}`}>{step.label}</span>
                {!step.done && <ChevronRight size={14} className="text-[#6b5d4f] ml-auto" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 2. NEEDS ATTENTION strip */}
          {needsAttention.length > 0 && (
            <div className="bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
                <h2 className="text-[#2a1f15] dark:text-[#e8dcc8] font-medium text-sm">Needs attention</h2>
                <span className="text-rose-600 dark:text-rose-400 text-xs bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">{needsAttention.length}</span>
              </div>
              <div className="space-y-1.5">
                {needsAttention.slice(0, 5).map((item, i) => (
                  <button key={i} onClick={item.action} className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-white/60 dark:hover:bg-white/5 transition-colors text-left group">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${item.urgent ? 'text-rose-700 dark:text-rose-300 font-medium' : 'text-[#2a1f15] dark:text-[#e8dcc8]'}`}>{item.label}</div>
                      <div className="text-xs text-[#6b5d4f] dark:text-[#a89878]">{item.sub}</div>
                    </div>
                    <ChevronRight size={14} className="text-[#6b5d4f] dark:text-[#a89878] flex-shrink-0 group-hover:text-[#8a6d3b] dark:group-hover:text-[#d4b87a]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. THIS WEEK card */}
          {topTasksThisWeek.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#2a1f15] font-serif text-xl">This week</h2>
                <button onClick={() => onNavigate('checklist')} className="text-[#8a6d3b] text-xs hover:underline">Plan your week →</button>
              </div>
              <div className="space-y-3">
                {topTasksThisWeek.map(item => {
                  const status = getTaskStatus(item, profile?.created_at);
                  const assigneeLabel = formatAssignee(item, profile);
                  const assigneeClr = assigneeColor(item.assignee || 'partner_1');
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-stone-50 last:border-0 group">
                      <button onClick={() => onToggleTask(item)} className="flex-shrink-0" aria-label="Complete task">
                        <div className="w-5 h-5 rounded border-2 border-[#c9a96e] hover:bg-[#c9a96e]/20 transition-colors" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-[#2a1f15] text-sm truncate">{item.task}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.due_date && (
                            <span className={`text-xs flex items-center gap-1 ${status === 'overdue' ? 'text-rose-600' : 'text-[#6b5d4f]'}`}>
                              <Clock size={10} /> {new Date(`${item.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {assigneeLabel && (
                            <span className="text-xs flex items-center gap-1" style={{ color: assigneeClr }}>
                              <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ backgroundColor: assigneeClr }}>
                                {assigneeLabel.charAt(0).toUpperCase()}
                              </span>
                              {assigneeLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onToggleTask(item)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#6b5d4f] hover:text-[#8a6d3b] flex-shrink-0"
                        title="Snooze a week"
                      >
                        Snooze
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. AT A GLANCE — 4 stats only */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Days to go" value={daysToGo !== null ? String(daysToGo) : '—'} sub={daysToGo !== null && daysToGo > 0 ? 'until wedding day' : ''} color="amber" onClick={() => onNavigate('overview')} />
            <StatCard
              label="Budget remaining"
              value={totalBudget > 0 ? fmtMoney(Math.max(0, budgetRemaining)) : '—'}
              sub={totalBudget > 0 ? (budgetRemaining < 0 ? `${fmtMoney(Math.abs(budgetRemaining))} over committed` : `${fmtMoney(totalPaidPayments)} paid · ${fmtMoney(totalCommitted)} committed`) : 'Set in Overview'}
              color={budgetRemaining < 0 ? 'rose' : 'emerald'}
              onClick={() => onNavigate('budget')}
            />
            <StatCard label="Guests attending" value={String(totalAttending)} sub={`${confirmedGuests} confirmed · ${pendingGuests} pending`} color="sky" onClick={() => onNavigate('guests')} />
            <StatCard label="Meals chosen" value={String(mealChosenGuests)} sub={mealsStillNeeded > 0 ? `${mealsStillNeeded} still needed` : 'all chosen'} color={mealsStillNeeded > 0 ? 'amber' : 'emerald'} onClick={() => onNavigate('guests')} />
            <StatCard label="Tasks done" value={`${completedTasks}/${totalTasks}`} sub={`${checklistPct}% complete`} color="stone" onClick={() => onNavigate('checklist')} />
          </div>

          {/* 6. NEXT PAYMENT DUE */}
          {nextPayment && (
            <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#2a1f15] font-medium text-sm">{nextPayment.label}</div>
                <div className="text-[#6b5d4f] text-xs">{fmtMoney(n(nextPayment.amount))} due {nextPayment.due_date && new Date(`${nextPayment.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {budgetItems.find(i => i.id === nextPayment.budget_item_id)?.item_name || ''}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-amber-600 text-xs font-medium">{daysUntilDate(nextPayment.due_date)} days</div>
                <button onClick={() => onNavigate('budget')} className="text-[#8a6d3b] text-xs hover:underline mt-0.5">Mark paid →</button>
              </div>
            </div>
          )}

          {/* 7. GUEST FUNNEL */}
          {invitedGuests > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#2a1f15] font-serif text-xl">Guest funnel</h2>
                <button onClick={() => onNavigate('guests')} className="text-[#8a6d3b] text-xs hover:underline">View all →</button>
              </div>

              {/* Household-level summary */}
              {totalHouseholds > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-stone-100">
                  <div className="text-center">
                    <div className="text-2xl font-serif font-bold text-[#2a1f15]">{totalHouseholds}</div>
                    <div className="text-xs text-[#6b5d4f] mt-0.5">Households</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-serif font-bold text-sky-700">{householdInviteSent}</div>
                    <div className="text-xs text-[#6b5d4f] mt-0.5">Invites sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-serif font-bold text-emerald-700">{householdResponded}</div>
                    <div className="text-xs text-[#6b5d4f] mt-0.5">Households responded</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {[
                  { label: 'Invited', count: invitedGuests, color: 'bg-stone-200 text-stone-700' },
                  { label: 'Invites sent', count: invitesSentGuests, color: 'bg-sky-100 text-sky-700' },
                  { label: 'Responded', count: confirmedGuests + declinedGuests, color: 'bg-amber-100 text-amber-700' },
                  { label: 'Attending', count: totalAttending, color: 'bg-emerald-100 text-emerald-700' },
                  { label: 'Seated', count: seatedGuests, color: 'bg-teal-100 text-teal-700' },
                  { label: 'Meal chosen', count: mealChosenGuests, color: 'bg-rose-100 text-rose-700' },
                ].map((seg, i) => (
                  <button key={seg.label} onClick={() => onNavigate('guests')} className="flex items-center gap-1 whitespace-nowrap">
                    <div className={`${seg.color} rounded-lg px-3 py-2 text-center min-w-[70px]`}>
                      <div className="font-bold text-sm">{seg.count}</div>
                      <div className="text-[10px] uppercase tracking-wider">{seg.label}</div>
                    </div>
                    {i < 5 && <ChevronRight size={14} className="text-stone-300 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 8. PLANNING PHASE TIMELINE */}
          {totalTasks > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#2a1f15] font-serif text-xl">Planning timeline</h2>
                <span className={`text-xs px-2 py-1 rounded-full ${tasksBehind > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {tasksBehind > 0 ? `${tasksBehind} tasks behind for this stage` : "You're on track"}
                </span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {phaseData.map((ph, i) => (
                  <div key={ph.phase} className="flex items-center gap-1 flex-shrink-0">
                    <div className={`rounded-lg px-3 py-2 text-center min-w-[80px] transition-all ${i === currentPhaseIndex ? 'ring-2 ring-[#c9a96e] ring-offset-1' : ''} ${ph.pct === 100 ? 'bg-emerald-50 border border-emerald-200' : 'bg-stone-50 border border-stone-200'}`}>
                      <div className={`font-bold text-sm ${i === currentPhaseIndex ? 'text-[#8a6d3b]' : 'text-[#2a1f15]'}`}>{ph.pct}%</div>
                      <div className="text-[10px] text-[#6b5d4f] uppercase tracking-wider truncate">{ph.phase.replace('+', '')}</div>
                      {i === currentPhaseIndex && <div className="text-[9px] text-[#8a6d3b] mt-0.5">You are here</div>}
                    </div>
                    {i < phaseData.length - 1 && <div className="w-2 h-0.5 bg-stone-200" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. QUICK ADD row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Add guest', icon: <Users size={16} />, action: () => onNavigate('guests') },
              { label: 'Log payment', icon: <DollarSign size={16} />, action: () => onNavigate('budget') },
              { label: 'Add task', icon: <CheckSquare size={16} />, action: () => onNavigate('checklist') },
              { label: 'Add vendor', icon: <Store size={16} />, action: () => onNavigate('vendors') },
            ].map(qa => (
              <button key={qa.label} onClick={qa.action} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-2 hover:shadow-sm hover:border-[#c9a96e]/30 transition-all text-left">
                <span className="text-[#8a6d3b]">{qa.icon}</span>
                <span className="text-[#2a1f15] text-sm font-medium">{qa.label}</span>
                <Plus size={12} className="text-[#6b5d4f] ml-auto" />
              </button>
            ))}
          </div>

          {/* Partner collaboration (if joined, show collapsed) */}
          {children && profile?.partner_user_id && (
            <details className="bg-white rounded-2xl border border-stone-200 p-4">
              <summary className="text-[#2a1f15] text-sm font-medium cursor-pointer">Partner collaboration</summary>
              <div className="mt-3">{children}</div>
            </details>
          )}
        </>
      )}
    </div>
  );

  if (!isPro && !paywallDismissed) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#1a1510] to-[#2e2218] border border-[#c9a96e]/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(201,169,110,0.1) 0%, transparent 60%)' }} />
          <button onClick={dismissPaywall} className="absolute top-4 right-4 text-[#4a3e32] hover:text-[#8a6d3b] transition-colors" aria-label="Dismiss">
            <X size={18} />
          </button>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock size={20} className="text-[#8a6d3b]" />
              </div>
              <div>
                <h3 className="text-white font-serif text-xl mb-1">Unlock your full wedding planner</h3>
                <p className="text-[#a08050] text-sm leading-relaxed">Pro starts at $15/month — full access to every feature, cancel anytime.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={onShowPricing} className="bg-[#8a6d3b] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#7a6030] transition-colors text-sm whitespace-nowrap">
                See Plans & Pricing
              </button>
              <button onClick={dismissPaywall} className="text-[#4a3e32] hover:text-[#5d4e3e] text-xs text-center transition-colors">Maybe later</button>
            </div>
          </div>
        </div>
        {dashboardContent}
      </div>
    );
  }

  return dashboardContent;
}

function StatCard({ label, value, sub, color, onClick }: {
  label: string; value: string; sub: string; color: string; onClick: () => void;
}) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200',
    rose: 'bg-rose-50 border-rose-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    sky: 'bg-sky-50 border-sky-200',
    stone: 'bg-stone-50 border-stone-200',
  };
  return (
    <button onClick={onClick} className={`${colors[color]} border rounded-xl p-4 text-left hover:shadow-sm transition-shadow w-full`}>
      <div className="text-[#5d4e3e] text-xs tracking-wider uppercase mb-1">{label}</div>
      <div className="text-[#2a1f15] font-serif text-2xl font-bold">{value}</div>
      {sub && <div className="text-[#6b5d4f] text-xs mt-1 leading-tight">{sub}</div>}
    </button>
  );
}
