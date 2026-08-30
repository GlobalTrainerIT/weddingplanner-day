import { useState } from 'react';
import { DollarSign, Heart, ChevronRight, PieChart } from 'lucide-react';

interface NavProps {
  onGetStarted: () => void;
}

const CATEGORIES = [
  { name: 'Venue & Catering', pct: 43, color: '#c9a96e' },
  { name: 'Photography & Video', pct: 12, color: '#d4b07e' },
  { name: 'Music & Entertainment', pct: 8, color: '#b8955a' },
  { name: 'Flowers & Décor', pct: 8, color: '#c4a870' },
  { name: 'Attire & Beauty', pct: 8, color: '#a88050' },
  { name: 'Invitations & Stationery', pct: 3, color: '#9a7040' },
  { name: 'Officiant & Ceremony', pct: 3, color: '#c9a96e' },
  { name: 'Transportation', pct: 3, color: '#b89060' },
  { name: 'Honeymoon', pct: 6, color: '#d0b880' },
  { name: 'Rings & Jewelry', pct: 3, color: '#a87840' },
  { name: 'Hair & Makeup', pct: 3, color: '#bca068' },
];

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function BudgetCalculatorPage({ onGetStarted }: NavProps) {
  const [budget, setBudget] = useState('');
  const [guests, setGuests] = useState('');
  const [calculated, setCalculated] = useState(false);

  const budgetNum = parseFloat(budget.replace(/[^0-9.]/g, '')) || 0;
  const guestsNum = parseInt(guests) || 0;
  const perHead = guestsNum > 0 ? budgetNum / guestsNum : 0;

  const breakdown = (() => {
    const raw = CATEGORIES.map(c => ({ ...c, amount: budgetNum * c.pct / 100 }));
    const floored = raw.map(c => ({ ...c, amount: Math.floor(c.amount) }));
    const remainder = budgetNum - floored.reduce((s, c) => s + c.amount, 0);
    // distribute remainder cents to rows with largest fractional parts
    const ranked = [...floored].sort((a, b) =>
      (raw.find(r => r.name === b.name)!.amount % 1) - (raw.find(r => r.name === a.name)!.amount % 1)
    );
    for (let i = 0; i < Math.round(remainder); i++) ranked[i].amount += 1;
    return floored;
  })();

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] py-10 px-4 text-center">
        <a href="/" className="flex items-center justify-center gap-2 mb-6">
          <Heart size={16} className="text-[#8a6d3b] fill-[#c9a96e]" />
          <span className="text-[#8a6d3b] font-serif text-lg">Vow</span>
        </a>
        <div className="flex items-center justify-center gap-2 mb-3">
          <DollarSign size={18} className="text-[#8a6d3b]" />
          <span className="text-[#8a6d3b] text-xs tracking-widest uppercase">Free Tool</span>
        </div>
        <h1 className="text-white font-serif text-3xl md:text-4xl mb-2">Wedding Budget Calculator</h1>
        <p className="text-[#a08050] text-sm max-w-md mx-auto">Enter your total budget and guest count to see a suggested breakdown by category — based on real wedding averages.</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-xs font-medium text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Total budget</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] text-sm">$</span>
                <input
                  type="number"
                  value={budget}
                  onChange={e => { setBudget(e.target.value); setCalculated(false); }}
                  placeholder="30,000"
                  className="w-full border border-stone-200 rounded-xl pl-7 pr-4 py-3 text-[#2a1f15] text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Guest count</label>
              <input
                type="number"
                value={guests}
                onChange={e => { setGuests(e.target.value); setCalculated(false); }}
                placeholder="100"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-[#2a1f15] text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
              />
            </div>
          </div>
          <button
            onClick={() => setCalculated(true)}
            disabled={!budgetNum}
            className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50"
          >
            Calculate breakdown
          </button>
        </div>

        {calculated && budgetNum > 0 && (
          <>
            {guestsNum > 0 && (
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-6 text-center">
                <p className="text-[#6b5d4f] text-xs uppercase tracking-wider mb-1">Estimated cost per guest</p>
                <p className="text-[#2a1f15] font-serif text-4xl font-bold">{formatMoney(perHead)}</p>
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <PieChart size={16} className="text-[#8a6d3b]" />
              <h2 className="text-[#2a1f15] font-medium text-sm">Suggested breakdown for {formatMoney(budgetNum)}</h2>
            </div>

            <div className="space-y-3 mb-8">
              {breakdown.map(c => (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[#2a1f15]">{c.name}</span>
                    <span className="text-[#5d4e3e] font-medium">{formatMoney(c.amount)} <span className="text-[#8a7a6a] font-normal">({c.pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-2xl p-6 text-center">
              <Heart size={20} className="text-[#8a6d3b] fill-[#c9a96e] mx-auto mb-3" />
              <h3 className="text-white font-serif text-xl mb-2">Track this budget in Vow — free</h3>
              <p className="text-[#a08050] text-sm mb-4">Vow's budget tracker uses these exact categories. Log deposits, track balances, and see your spending in one place.</p>
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors"
              >
                Start tracking for free <ChevronRight size={14} />
              </button>
            </div>

            <div className="mt-8">
              <h3 className="text-[#2a1f15] font-serif text-lg mb-3">Related reading</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <a href="/blog/wedding-budget-tips" className="block p-4 border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
                  <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Budget</span>
                  <p className="text-[#2a1f15] text-sm font-medium mt-2">10 Ways to Stretch Your Wedding Budget</p>
                </a>
                <a href="/blog/vendor-tips" className="block p-4 border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
                  <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Vendors</span>
                  <p className="text-[#2a1f15] text-sm font-medium mt-2">How to Interview and Book Wedding Vendors</p>
                </a>
              </div>
            </div>
          </>
        )}

        {!calculated && (
          <div className="text-center py-8 text-[#8a7a6a] text-sm">
            Enter your budget above to see a personalized breakdown.
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200 py-6 text-center text-[#8a7a6a] text-xs">
        <a href="/" className="text-[#8a6d3b] hover:underline">Vow ♥</a> — All-in-one wedding planner, free to start
      </footer>
    </div>
  );
}
