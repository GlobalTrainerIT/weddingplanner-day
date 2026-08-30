import { useState, useMemo, useEffect } from 'react';
import { CheckSquare, Heart, ChevronRight, Check, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CHECKLIST_TASKS } from '../lib/checklistDefaults';

interface NavProps {
  onGetStarted: () => void;
}

const TIMEFRAMES = [
  '18+ Months', '12 Months', '9 Months', '6 Months',
  '3 Months', '1 Month', '2 Weeks', '1 Week', 'Day Before', 'Wedding Day',
];

// How many months before the wedding does each bucket represent
// Lower = closer to wedding day
const MONTHS_MAP: Record<string, number> = {
  '18+ Months': 18,
  '12 Months':  12,
  '9 Months':   9,
  '6 Months':   6,
  '3 Months':   3,
  '1 Month':    1,
  '2 Weeks':    0.5,
  '1 Week':     0.25,
  'Day Before': 0.1,
  'Wedding Day': 0,
};

const LS_KEY = 'vow-tool-checklist-checked';

function loadChecked(): Set<number> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr: number[] = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveChecked(s: Set<number>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...s]));
}

export default function WeddingChecklistPage({ onGetStarted }: NavProps) {
  // null = all tasks; a number = "my wedding is X months away"
  const [monthsUntil, setMonthsUntil] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(loadChecked);
  const [email, setEmail] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Persist to localStorage on every change
  useEffect(() => { saveChecked(checked); }, [checked]);

  // Derive wedding date from the date input to auto-set the filter
  useEffect(() => {
    if (!weddingDate) return;
    const diff = (new Date(weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
    if (diff <= 0) { setMonthsUntil(0); return; }
    // snap to the closest filter bucket
    const buckets = [18, 12, 9, 6, 3, 1];
    const closest = buckets.find(b => diff >= b) ?? 1;
    setMonthsUntil(closest);
  }, [weddingDate]);

  // Forward-looking cumulative filter:
  // "X months out" → show tasks from that timeframe bucket THROUGH Wedding Day.
  // i.e. MONTHS_MAP[tf] <= monthsUntil (tasks at or closer to the wedding than your current position)
  const visibleTasks = useMemo(() => {
    if (monthsUntil === null) return DEFAULT_CHECKLIST_TASKS;
    return DEFAULT_CHECKLIST_TASKS.filter(t => MONTHS_MAP[t.timeframe] <= monthsUntil);
  }, [monthsUntil]);

  const totalTaskCount = DEFAULT_CHECKLIST_TASKS.length;

  const toggle = (i: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map: Record<string, typeof DEFAULT_CHECKLIST_TASKS> = {};
    for (const tf of TIMEFRAMES) {
      const tasks = visibleTasks.filter(t => t.timeframe === tf);
      if (tasks.length) map[tf] = tasks;
    }
    return map;
  }, [visibleTasks]);

  // Count against visible tasks only, using the stable global index
  const doneCount = visibleTasks.filter(t => checked.has(DEFAULT_CHECKLIST_TASKS.indexOf(t))).length;
  const pct = visibleTasks.length > 0 ? Math.round(doneCount / visibleTasks.length * 100) : 0;

  async function handleEmailCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    await supabase.from('leads').insert({
      email,
      wedding_date: weddingDate || null,
      source: 'checklist-tool',
    });
    setSending(false);
    setEmailSent(true);
    // On submit, persist their email to localStorage so they can reclaim progress after signup
    localStorage.setItem('vow-tool-email', email);
    if (weddingDate) localStorage.setItem('vow-tool-wedding-date', weddingDate);
  }

  const filterButtons = [
    { label: 'All tasks', value: null },
    { label: '18+ months out', value: 18 },
    { label: '12+ months out', value: 12 },
    { label: '9+ months out', value: 9 },
    { label: '6+ months out', value: 6 },
    { label: '3+ months out', value: 3 },
    { label: '1+ months out', value: 1 },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] py-10 px-4 text-center">
        <a href="/" className="flex items-center justify-center gap-2 mb-6">
          <Heart size={16} className="text-[#8a6d3b] fill-[#c9a96e]" />
          <span className="text-[#8a6d3b] font-serif text-lg">Vow</span>
        </a>
        <div className="flex items-center justify-center gap-2 mb-3">
          <CheckSquare size={18} className="text-[#8a6d3b]" />
          <span className="text-[#8a6d3b] text-xs tracking-widest uppercase">Free Tool</span>
        </div>
        <h1 className="text-white font-serif text-3xl md:text-4xl mb-2">Ultimate Wedding Checklist</h1>
        <p className="text-[#a08050] text-sm max-w-md mx-auto">
          {totalTaskCount} tasks organized by timeframe — from 18 months out to your wedding day.
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Filter */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-6">
          <label className="text-xs font-medium text-[#5d4e3e] uppercase tracking-wider block mb-3">
            How far is your wedding? (shows everything still ahead of you)
          </label>
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(btn => (
              <button
                key={String(btn.value)}
                onClick={() => setMonthsUntil(btn.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  monthsUntil === btn.value
                    ? 'bg-[#8a6d3b] text-white border-[#c9a96e]'
                    : 'border-stone-200 text-[#5d4e3e] hover:border-[#c9a96e]/40'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {monthsUntil !== null && (
            <p className="text-[#6b5d4f] text-xs mt-2">
              Showing {visibleTasks.length} tasks — everything from now through your wedding day.
            </p>
          )}
        </div>

        {/* Progress */}
        {(doneCount > 0 || checked.size > 0) && (
          <div className="mb-5 bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-[#6b5d4f] mb-1.5">
                <span>{doneCount} of {visibleTasks.length} tasks done</span>
                <span className="text-[#8a6d3b] font-medium">{pct}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#c9a96e] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {pct === 100 && <Check size={20} className="text-emerald-500 flex-shrink-0" />}
          </div>
        )}

        {/* Tasks grouped by timeframe */}
        <div className="space-y-6 mb-8">
          {Object.entries(grouped).map(([tf, tasks]) => (
            <div key={tf}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-stone-200" />
                <span className="text-[#8a6d3b] text-xs font-medium uppercase tracking-widest">{tf}</span>
                <div className="h-px flex-1 bg-stone-200" />
              </div>
              <div className="space-y-1.5">
                {tasks.map(task => {
                  const idx = DEFAULT_CHECKLIST_TASKS.indexOf(task);
                  const done = checked.has(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggle(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${done ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-stone-200 hover:border-stone-300'}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${done ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300'}`}>
                        {done && <Check size={11} className="text-white" />}
                      </div>
                      <span className={`text-sm flex-1 ${done ? 'line-through text-[#8a7a6a]' : 'text-[#2a1f15]'}`}>{task.task}</span>
                      <span className="text-[#8a6d3b] text-xs bg-[#c9a96e]/10 px-2 py-0.5 rounded-full flex-shrink-0">{task.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Email capture */}
        <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={16} className="text-[#8a6d3b]" />
            <span className="text-[#8a6d3b] text-xs tracking-widest uppercase">Save your progress</span>
          </div>
          {emailSent ? (
            <div className="text-center py-2">
              <Check size={24} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-white text-sm font-medium">You're all set!</p>
              <p className="text-[#a08050] text-xs mt-1">
                Your progress is saved in this browser. Create a free account to sync across devices and unlock the full budget tracker, guest list, and more.
              </p>
              <p className="text-[#5d4e3e] text-xs mt-2">
                Sign up free to sync your progress across devices.
              </p>
              <button
                onClick={onGetStarted}
                className="mt-3 inline-flex items-center gap-1.5 text-[#8a6d3b] border border-[#c9a96e]/40 px-4 py-1.5 rounded-lg text-xs hover:bg-[#c9a96e]/10 transition-colors"
              >
                Create free account <ChevronRight size={12} />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-white font-serif text-lg mb-1">Save your progress</h3>
              <p className="text-[#a08050] text-sm mb-4">
                Enter your email to save your checklist progress and get planning tips from Vow.
                {checked.size > 0 && <span className="block mt-1 text-[#8a6d3b]">{checked.size} task{checked.size !== 1 ? 's' : ''} already checked — your progress is saved locally.</span>}
              </p>
              <form onSubmit={handleEmailCapture} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-[#6a5a4a] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                />
                <input
                  type="date"
                  value={weddingDate}
                  onChange={e => setWeddingDate(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                />
                <button
                  type="submit"
                  disabled={!email || sending}
                  className="w-full bg-[#8a6d3b] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save my progress'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 text-center">
          <h3 className="text-[#2a1f15] font-serif text-xl mb-2">Sync progress across devices</h3>
          <p className="text-[#6b5d4f] text-sm mb-4">
            Sign up free and your checklist progress syncs to your account — plus notes on each task, budget tracker, guest list, and more.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors"
          >
            Start planning free <ChevronRight size={14} />
          </button>
        </div>

        {/* Internal links to related blog posts */}
        <div className="mt-6">
          <h3 className="text-[#2a1f15] font-serif text-lg mb-3">Related reading</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <a href="/blog/wedding-planning-timeline" className="block p-4 border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
              <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Planning</span>
              <p className="text-[#2a1f15] text-sm font-medium mt-2">The Complete Wedding Planning Timeline</p>
            </a>
            <a href="/blog/wedding-day-timeline" className="block p-4 border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
              <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Planning</span>
              <p className="text-[#2a1f15] text-sm font-medium mt-2">Building the Perfect Wedding Day Timeline</p>
            </a>
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 py-6 text-center text-[#8a7a6a] text-xs">
        <a href="/" className="text-[#8a6d3b] hover:underline">Vow ♥</a> — All-in-one wedding planner, free to start
      </footer>
    </div>
  );
}
