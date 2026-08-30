import { useState } from 'react';
import { Heart, Calendar, MapPin, DollarSign, ChevronRight, Check, ListChecks } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { WeddingProfile } from '../types';

interface Props {
  userId: string;
  onComplete: (profile: WeddingProfile) => void;
}

const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  'en-US': { code: 'USD', symbol: '$' },
  'en-GB': { code: 'GBP', symbol: '\u00A3' },
  'en-CA': { code: 'CAD', symbol: 'C$' },
  'en-AU': { code: 'AUD', symbol: 'A$' },
  'en-IN': { code: 'INR', symbol: '\u20B9' },
  'ja-JP': { code: 'JPY', symbol: '\u00A5' },
  'de-DE': { code: 'EUR', symbol: '\u20AC' },
  'fr-FR': { code: 'EUR', symbol: '\u20AC' },
  'es-ES': { code: 'EUR', symbol: '\u20AC' },
  'it-IT': { code: 'EUR', symbol: '\u20AC' },
  'nl-NL': { code: 'EUR', symbol: '\u20AC' },
  'pt-PT': { code: 'EUR', symbol: '\u20AC' },
  'en-IE': { code: 'EUR', symbol: '\u20AC' },
};

function detectBrowserCurrency(): { code: string; symbol: string } {
  if (typeof Intl === 'undefined') return { code: 'USD', symbol: '$' };
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  return CURRENCY_MAP[locale] || { code: 'USD', symbol: '$' };
}

const CHECKLIST_TEMPLATE: { timeframe: string; tasks: string[] }[] = [
  {
    timeframe: '18+ Months',
    tasks: [
      'Set your overall wedding budget',
      'Research and book your wedding venue',
      'Set your wedding date',
      'Create your initial guest list',
      'Start researching wedding photographers',
      'Discuss your wedding vision and theme with your partner',
      'Consider hiring a wedding planner or coordinator',
    ],
  },
  {
    timeframe: '12 Months',
    tasks: [
      'Book your photographer and videographer',
      'Choose and ask your wedding party',
      'Begin dress or suit shopping',
      'Book your officiant',
      'Research and book your caterer',
      'Send save-the-dates',
      'Start honeymoon planning',
    ],
  },
  {
    timeframe: '9 Months',
    tasks: [
      'Book your florist',
      'Book your DJ or live band',
      'Schedule engagement photos',
      'Register for gifts',
      'Research hair and makeup artists',
      'Book hair and makeup artists',
      'Plan rehearsal dinner venue and date',
    ],
  },
  {
    timeframe: '6 Months',
    tasks: [
      'Order wedding invitations and all stationery',
      'Book transportation (limo, shuttle, or car)',
      'Schedule your first dress or suit fitting',
      'Finalize the rehearsal dinner details',
      'Book honeymoon flights and hotels',
      'Finalize ceremony details with your officiant',
    ],
  },
  {
    timeframe: '3 Months',
    tasks: [
      'Send out wedding invitations',
      'Purchase wedding rings',
      'Schedule second dress fitting',
      'Write your vows',
      'Finalize menu with caterer',
      'Create ceremony program',
      'Arrange accommodations for out-of-town guests',
    ],
  },
  {
    timeframe: '1 Month',
    tasks: [
      'Confirm all vendor bookings and finalize details',
      'Create seating chart',
      'Get your marriage license',
      'Final dress or suit fitting',
      'Prepare wedding day timeline',
      'Prepare vendor payments and gratuity envelopes',
      'Confirm honeymoon reservations',
    ],
  },
  {
    timeframe: '2 Weeks',
    tasks: [
      'Submit final guest count to caterer',
      'Confirm rehearsal dinner details',
      'Break in your wedding shoes',
      'Prepare wedding day emergency kit',
      'Delegate day-of tasks to wedding party',
    ],
  },
  {
    timeframe: '1 Week',
    tasks: [
      'Pick up wedding dress or suit',
      'Confirm arrival times with all vendors',
      'Pack for the honeymoon',
      'Attend wedding rehearsal',
      'Give rings to best man or maid of honor',
    ],
  },
  {
    timeframe: 'Day Before',
    tasks: [
      'Deliver items to venue (decor, programs, favors)',
      'Attend rehearsal dinner',
      'Prepare overnight bag',
      "Get a good night's sleep",
    ],
  },
  {
    timeframe: 'Wedding Day',
    tasks: [
      'Eat a good breakfast',
      'Give thank-you cards and gifts to wedding party',
      'Give vendor payments to your designated person',
      'Enjoy every moment \u2014 you only do this once!',
    ],
  },
];

const BUDGET_ALLOCATIONS: { category: string; pct: number }[] = [
  { category: 'Venue', pct: 30 },
  { category: 'Catering', pct: 25 },
  { category: 'Photography', pct: 12 },
  { category: 'Florals', pct: 10 },
  { category: 'Music/DJ', pct: 5 },
  { category: 'Dress/Attire', pct: 8 },
  { category: 'Invitations', pct: 2 },
  { category: 'Transportation', pct: 2 },
  { category: 'Honeymoon', pct: 4 },
  { category: 'Miscellaneous', pct: 2 },
];

export default function Onboarding({ userId, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [partner1, setPartner1] = useState('');
  const [partner2, setPartner2] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<WeddingProfile | null>(null);
  const [partnerInviteEmail, setPartnerInviteEmail] = useState("");
  const [partnerInviteLink, setPartnerInviteLink] = useState("");

  const totalTasks = CHECKLIST_TEMPLATE.reduce((s, b) => s + b.tasks.length, 0);

  const handleFinish = async () => {
    if (!partner1.trim() || !partner2.trim()) {
      setError('Please enter both partner names.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const detectedCurrency = detectBrowserCurrency();
      const { data, error: err } = await supabase
        .from('wedding_profile')
        .insert({
          user_id: userId,
          partner1_name: partner1.trim(),
          partner2_name: partner2.trim(),
          wedding_date: date || null,
          venue: venue.trim(),
          total_budget: parseFloat(budget.replace(/,/g, '')) || 0,
          theme: '',
          color_palette: '',
          notes: '',
          currency_code: detectedCurrency.code,
          currency_symbol: detectedCurrency.symbol,
        })
        .select()
        .single();
      if (err) throw err;

      const profile = data as WeddingProfile;
      const weddingId = profile.id;

      await supabase.rpc('ensure_free_subscription');

      const checklistRows = CHECKLIST_TEMPLATE.flatMap(bucket =>
        bucket.tasks.map(task => ({
          wedding_id: weddingId,
          timeframe: bucket.timeframe,
          task,
          category: 'general',
          completed: false,
          notes: '',
        }))
      );
      await supabase.from('checklist_items').insert(checklistRows);

      const totalBudget = parseFloat(budget.replace(/,/g, '')) || 0;
      if (totalBudget > 0) {
        const budgetRows = BUDGET_ALLOCATIONS.map(({ category, pct }) => {
          const estimated = Math.round((totalBudget * pct) / 100);
          return {
            wedding_id: weddingId,
            category,
            item_name: category,
            estimated_cost: estimated,
            actual_cost: 0,
            deposit_paid: 0,
            balance_due: estimated,
            paid: false,
            notes: `Suggested allocation: ${pct}% of total budget`,
          };
        });
        await supabase.from('budget_items').insert(budgetRows);
      }

      setCreatedProfile(profile);
      setShowSuccess(true);
    } catch (err: unknown) {
      console.error('onboarding failed', err);
      setError('We could not set up your planner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'The Couple' },
    { num: 2, label: 'The Date' },
    { num: 3, label: 'The Budget' },
  ];

  if (showSuccess && createdProfile) {
    const totalBudget = parseFloat(budget.replace(/,/g, '')) || 0;
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Heart size={24} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <span className="text-[#8a6d3b] font-serif text-xl tracking-widest uppercase">Vow</span>
          </div>

          <div className="w-20 h-20 bg-emerald-100 border-2 border-emerald-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-emerald-600" strokeWidth={3} />
          </div>

          <h1 className="text-[#2a1f15] font-serif text-3xl mb-3">
            Your wedding plan is ready!
          </h1>
          <p className="text-[#6b5d4f] text-base mb-8 leading-relaxed">
            We've pre-populated your checklist with {totalTasks}+ tasks and set up your budget tracker, {partner1}. Here's what we added for you:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 text-left">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks size={18} className="text-[#8a6d3b]" />
                <span className="text-[#2a1f15] font-medium text-sm">Master Checklist</span>
              </div>
              <div className="text-[#2a1f15] font-serif text-3xl font-bold">{totalTasks}</div>
              <div className="text-[#6b5d4f] text-xs mt-1">tasks across {CHECKLIST_TEMPLATE.length} planning phases</div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-5 text-left">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={18} className="text-[#8a6d3b]" />
                <span className="text-[#2a1f15] font-medium text-sm">Budget Tracker</span>
              </div>
              {totalBudget > 0 ? (
                <>
                  <div className="text-[#2a1f15] font-serif text-3xl font-bold">{BUDGET_ALLOCATIONS.length}</div>
                  <div className="text-[#6b5d4f] text-xs mt-1">categories pre-allocated for you</div>
                </>
              ) : (
                <>
                  <div className="text-[#2a1f15] font-serif text-3xl font-bold">Ready</div>
                  <div className="text-[#6b5d4f] text-xs mt-1">add your budget in the tracker</div>
                </>
              )}
            </div>
          </div>

          {totalBudget > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-8 text-left">
              <div className="text-[#2a1f15] font-medium text-sm mb-3">Budget breakdown at a glance</div>
              <div className="grid grid-cols-2 gap-2">
                {BUDGET_ALLOCATIONS.map(({ category, pct }) => (
                  <div key={category} className="flex items-center justify-between text-xs">
                    <span className="text-[#5d4e3e]">{category}</span>
                    <span className="text-[#2a1f15] font-medium">
                      ${Math.round((totalBudget * pct) / 100).toLocaleString()} <span className="text-[#6b5d4f]">({pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-2xl p-5 mb-8 text-center">
            <div className="text-[#8a6d3b] font-serif text-xl">{partner1} & {partner2}</div>
            {date && (
              <div className="text-[#a08050] text-sm mt-1">
                {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            {venue && <div className="text-[#5d4e3e] text-xs mt-1">{venue}</div>}
          </div>

          {/* Partner invite prompt */}
          <div className="bg-white border border-[#c9a96e]/30 rounded-2xl p-5 mb-8 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={18} className="text-[#8a6d3b]" />
              <h3 className="text-[#2a1f15] font-serif text-base">Planning together?</h3>
            </div>
            <p className="text-[#6b5d4f] text-xs mb-3">Invite your partner to co-plan with you. You can both edit the checklist, budget, and guest list in real time.</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={partnerInviteEmail}
                onChange={e => setPartnerInviteEmail(e.target.value)}
                placeholder="partner@email.com"
                className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
              />
              <button
                onClick={async () => {
                  if (!partnerInviteEmail.trim() || !createdProfile) return;
                  const token = crypto.randomUUID();
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  await supabase.from('partner_invites').insert({
                    wedding_id: createdProfile.id,
                    invited_by_user_id: user.id,
                    invited_email: partnerInviteEmail.trim(),
                    token,
                    status: 'pending',
                  });
                  setPartnerInviteLink(`${window.location.origin}/?invite=${token}`);
                }}
                disabled={!partnerInviteEmail.trim()}
                className="bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#7a6030] disabled:opacity-50 transition-colors"
              >
                Invite
              </button>
            </div>
            {partnerInviteLink && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <p className="text-emerald-800 text-xs mb-2">Invite created! Share this link with your partner:</p>
                <div className="flex gap-2">
                  <input type="text" readOnly value={partnerInviteLink} className="flex-1 border border-stone-200 rounded px-2 py-1.5 text-xs text-[#5d4e3e] bg-stone-50" />
                  <button
                    onClick={() => { navigator.clipboard.writeText(partnerInviteLink); }}
                    className="bg-[#8a6d3b] text-white px-3 py-1.5 rounded text-xs font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onComplete(createdProfile)}
            className="w-full bg-[#8a6d3b] text-white py-3.5 rounded-xl font-semibold hover:bg-[#7a6030] transition-colors text-sm flex items-center justify-center gap-2"
          >
            Let's start planning! <ChevronRight size={16} />
          </button>

          <button
            onClick={() => onComplete(createdProfile)}
            className="w-full text-[#6b5d4f] text-xs mt-2 hover:underline"
          >
            I'll invite my partner later
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart size={24} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <span className="text-[#8a6d3b] font-serif text-xl tracking-widest uppercase">Vow</span>
          </div>
          <h1 className="text-[#2a1f15] font-serif text-3xl mb-2">Let's set up your planner</h1>
          <p className="text-[#6b5d4f] text-sm">Just a few details to get you started. You can always change these later.</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 ${step >= s.num ? 'text-[#8a6d3b]' : 'text-[#6b5d4f]'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  step > s.num ? 'bg-[#8a6d3b] text-white' :
                  step === s.num ? 'border-2 border-[#c9a96e] text-[#8a6d3b]' :
                  'border-2 border-stone-200 text-stone-500'
                }`}>
                  {step > s.num ? <Check size={13} /> : s.num}
                </div>
                <span className="text-xs hidden sm:block">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-px ${step > s.num ? 'bg-[#c9a96e]' : 'bg-stone-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Heart size={20} className="text-[#8a6d3b]" />
                <h2 className="text-[#2a1f15] font-serif text-xl">The happy couple</h2>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5">Partner 1 Name *</label>
                <input
                  value={partner1}
                  onChange={e => setPartner1(e.target.value)}
                  placeholder="e.g. Emma"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
                />
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5">Partner 2 Name *</label>
                <input
                  value={partner2}
                  onChange={e => setPartner2(e.target.value)}
                  placeholder="e.g. James"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
                />
              </div>
              <button
                onClick={() => { if (!partner1.trim() || !partner2.trim()) { setError('Please enter both names.'); return; } setError(''); setStep(2); }}
                className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors flex items-center justify-center gap-2 mt-2"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Calendar size={20} className="text-[#8a6d3b]" />
                <h2 className="text-[#2a1f15] font-serif text-xl">The big day</h2>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5">Wedding Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
                />
                <p className="text-[#6b5d4f] text-xs mt-1.5">You can set this later if you haven't decided yet.</p>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <MapPin size={12} /> Venue <span className="text-[#6b5d4f] font-normal">(optional)</span>
                </label>
                <input
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  placeholder="e.g. The Grand Ballroom, New York"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-stone-200 text-[#5d4e3e] py-3 rounded-xl text-sm hover:bg-stone-50 transition-colors">
                  Back
                </button>
                <button onClick={() => { setError(''); setStep(3); }} className="flex-1 bg-[#8a6d3b] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors flex items-center justify-center gap-2">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign size={20} className="text-[#8a6d3b]" />
                <h2 className="text-[#2a1f15] font-serif text-xl">Your budget</h2>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5">
                  Total Wedding Budget <span className="text-[#6b5d4f] normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b5d4f]">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budget ? Number(budget.replace(/,/g, '')).toLocaleString('en-US') : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (raw === '' || /^\d+$/.test(raw)) setBudget(raw);
                    }}
                    placeholder="25,000"
                    className="w-full pl-8 pr-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
                  />
                </div>
                <p className="text-[#6b5d4f] text-xs mt-1.5">
                  {budget ? "We'll pre-fill your budget tracker with suggested allocations." : "Skip for now \u2014 set it anytime in the Budget Tracker."}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border border-stone-200 text-[#5d4e3e] py-3 rounded-xl text-sm hover:bg-stone-50 transition-colors">
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 bg-[#8a6d3b] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Setting up\u2026' : <>Start planning <ChevronRight size={16} /></>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
