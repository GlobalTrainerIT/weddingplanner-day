import { Clock, Briefcase, Users, CheckSquare, ArrowRight } from 'lucide-react';

interface Props {
  isPro: boolean;
  onShowPricing: () => void;
}

const UPCOMING_FEATURES = [
  { icon: <Users size={16} className="text-[#8a6d3b]" />, title: 'Multi-client overview', desc: 'See all your couples in one dashboard with wedding dates, budgets, and checklist progress.' },
  { icon: <Briefcase size={16} className="text-[#8a6d3b]" />, title: 'Switch between planners', desc: 'Jump into any client\'s planner with one click — full access to their checklist, budget, and guests.' },
  { icon: <CheckSquare size={16} className="text-[#8a6d3b]" />, title: 'Client collaboration', desc: 'Couples can see your notes and you can co-manage tasks, vendors, and the day-of timeline together.' },
];

export default function PlannerDashboard({ isPro: _isPro, onShowPricing: _onShowPricing }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[#2a1f15] font-serif text-3xl">Planner Dashboard</h1>
        <p className="text-[#6b5d4f] text-sm mt-1">Professional tools for wedding planners</p>
      </div>

      {/* Coming soon hero */}
      <div className="bg-gradient-to-br from-[#1a1510] via-[#251a10] to-[#1a1510] rounded-2xl border border-[#c9a96e]/20 p-10 text-center">
        <div className="w-16 h-16 bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={28} className="text-[#8a6d3b]" />
        </div>
        <div className="inline-flex items-center gap-2 bg-[#c9a96e]/15 text-[#8a6d3b] px-3 py-1 rounded-full text-xs tracking-wider uppercase mb-4 border border-[#c9a96e]/20">
          Coming soon
        </div>
        <h2 className="text-white font-serif text-2xl mb-3">Planner Pro is on the way</h2>
        <p className="text-[#6b5d4f] text-sm mb-8 max-w-md mx-auto leading-relaxed">
          Professional multi-client tools for wedding planners are in development. Join the waitlist to get early access before the public launch.
        </p>
        <a
          href="/for-planners"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#7a6030] transition-colors text-sm"
        >
          Join the waitlist <ArrowRight size={15} />
        </a>
      </div>

      {/* Feature preview */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="text-[#2a1f15] font-serif text-lg mb-5">What's coming for professional planners</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {UPCOMING_FEATURES.map(f => (
            <div key={f.title} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#c9a96e]/10 border border-[#c9a96e]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                {f.icon}
              </div>
              <div>
                <div className="text-[#2a1f15] font-medium text-sm">{f.title}</div>
                <div className="text-[#6b5d4f] text-xs mt-0.5 leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
