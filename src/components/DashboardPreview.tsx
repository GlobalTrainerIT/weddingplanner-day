import { Check, Clock, DollarSign, Users, Circle } from 'lucide-react';

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-t-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-white">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#f0ede8] border-b border-stone-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#e0625e]" />
          <div className="w-3 h-3 rounded-full bg-[#e8b33a]" />
          <div className="w-3 h-3 rounded-full bg-[#62c46c]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-white rounded-md px-4 py-1 text-xs text-stone-400 max-w-xs flex-1 text-center border border-stone-200">
            weddingplanner.day/dashboard
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function MiniDonut() {
  const segments = [
    { color: '#8a6d3b', pct: 32 },
    { color: '#c9a96e', pct: 22 },
    { color: '#d4b87a', pct: 18 },
    { color: '#e0cba0', pct: 14 },
    { color: '#ede0c5', pct: 14 },
  ];
  let offset = 0;
  const r = 38;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f5f0e8" strokeWidth="12" />
      {segments.map((s, i) => {
        const len = (s.pct / 100) * circ;
        const el = (
          <circle
            key={i}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="12"
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        );
        offset += len;
        return el;
      })}
      <text x="50" y="48" textAnchor="middle" className="fill-[#2a1f15] font-serif" fontSize="16" fontWeight="600">$18.4k</text>
      <text x="50" y="62" textAnchor="middle" className="fill-[#8a7a6a]" fontSize="8">spent</text>
    </svg>
  );
}

export default function DashboardPreview() {
  const checklistItems = [
    { label: 'Book ceremony venue', done: true },
    { label: 'Send save-the-dates', done: true },
    { label: 'Book photographer', done: true },
    { label: 'Order wedding cake', done: false },
    { label: 'Finalize seating chart', done: false },
  ];
  const budgetCats = [
    { label: 'Venue', amount: '$8,200', color: 'bg-[#8a6d3b]' },
    { label: 'Catering', amount: '$4,650', color: 'bg-[#c9a96e]' },
    { label: 'Photography', amount: '$2,400', color: 'bg-[#d4b87a]' },
  ];

  return (
    <BrowserFrame>
      <div className="flex">
        {/* Sidebar */}
        <div className="w-14 bg-[#1a1510] py-4 flex flex-col items-center gap-4 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#c9a96e]/20 flex items-center justify-center">
            <span className="font-serif text-[#c9a96e] text-sm">V</span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#8a6d3b]/30 flex items-center justify-center"><DollarSign size={14} className="text-[#c9a96e]" /></div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"><Check size={14} className="text-[#8a7a6a]" /></div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"><Users size={14} className="text-[#8a7a6a]" /></div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"><Clock size={14} className="text-[#8a7a6a]" /></div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 md:p-5 bg-[#faf9f7]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg text-[#2a1f15]">Good morning, Alex &amp; Sam</h3>
              <p className="text-xs text-[#8a7a6a]">127 days until your wedding</p>
            </div>
            <div className="hidden md:flex gap-2">
              <div className="bg-white rounded-lg px-3 py-1.5 border border-stone-200 text-center">
                <div className="text-sm font-semibold text-[#2a1f15]">18/48</div>
                <div className="text-[10px] text-[#8a7a6a]">tasks done</div>
              </div>
              <div className="bg-white rounded-lg px-3 py-1.5 border border-stone-200 text-center">
                <div className="text-sm font-semibold text-[#2a1f15]">25</div>
                <div className="text-[10px] text-[#8a7a6a]">guests</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Budget donut card */}
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h4 className="text-xs font-semibold text-[#2a1f15] mb-3 flex items-center gap-1.5">
                <DollarSign size={12} className="text-[#8a6d3b]" /> Budget Breakdown
              </h4>
              <div className="flex items-center gap-3">
                <MiniDonut />
                <div className="flex-1 space-y-1.5">
                  {budgetCats.map(c => (
                    <div key={c.label} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#5d4e3e]">
                        <span className={`w-2 h-2 rounded-full ${c.color}`} />{c.label}
                      </span>
                      <span className="text-[#2a1f15] font-medium">{c.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex justify-between text-xs">
                <span className="text-[#8a7a6a]">Total budget: $25,000</span>
                <span className="text-[#8a6d3b] font-medium">74% spent</span>
              </div>
            </div>

            {/* Checklist card */}
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h4 className="text-xs font-semibold text-[#2a1f15] mb-3 flex items-center gap-1.5">
                <Check size={12} className="text-[#8a6d3b]" /> Upcoming Tasks
              </h4>
              <div className="space-y-2">
                {checklistItems.map(t => (
                  <div key={t.label} className="flex items-center gap-2 text-xs">
                    {t.done ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Check size={8} className="text-emerald-600" />
                      </div>
                    ) : (
                      <Circle size={12} className="text-stone-300 flex-shrink-0" />
                    )}
                    <span className={t.done ? 'text-[#8a7a6a] line-through' : 'text-[#2a1f15]'}>{t.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-[#8a6d3b] font-medium">
                3 months out →
              </div>
            </div>

            {/* Stats card */}
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h4 className="text-xs font-semibold text-[#2a1f15] mb-3 flex items-center gap-1.5">
                <Users size={12} className="text-[#8a6d3b]" /> Guest Summary
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-[#faf9f7] rounded-lg p-2 text-center">
                  <div className="text-lg font-semibold text-[#2a1f15]">18</div>
                  <div className="text-[10px] text-[#8a7a6a]">Confirmed</div>
                </div>
                <div className="bg-[#faf9f7] rounded-lg p-2 text-center">
                  <div className="text-lg font-semibold text-[#2a1f15]">7</div>
                  <div className="text-[10px] text-[#8a7a6a]">Pending</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-[#8a7a6a]">Plus-ones</span><span className="text-[#2a1f15]">9</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#8a7a6a]">Meal: Chicken</span><span className="text-[#2a1f15]">12</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#8a7a6a]">Meal: Veggie</span><span className="text-[#2a1f15]">6</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100">
                <div className="flex justify-between text-xs mb-1"><span className="text-[#8a7a6a]">RSVP progress</span><span className="text-[#8a6d3b] font-medium">72%</span></div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full w-[72%] bg-[#8a6d3b] rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
