import {
  LayoutDashboard, Heart, CheckSquare, DollarSign, Users, Store,
  Calendar, Music2, Plane, BookOpen, MapPin, Star, X, Lock, Briefcase, Settings as SettingsIcon, Globe, Gift
} from 'lucide-react';
import type { Section } from '../types';
import { useCountdown, parseLocalDate } from '../lib/useCountdown';

interface SidebarProps {
  active: Section;
  onSelect: (s: Section) => void;
  partner1: string;
  partner2: string;
  weddingDate: string | null;
  onClose?: () => void;
  isPro: boolean;
  onShowPricing: () => void;
  checklistPct?: number;
}

const LOCKED_SECTIONS: Section[] = ['seating', 'bridal-party', 'timeline', 'honeymoon'];

const nav: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'overview', label: 'Wedding Overview', icon: <Heart size={18} /> },
  { id: 'website', label: 'Wedding Website', icon: <Globe size={18} /> },
  { id: 'checklist', label: 'Master Checklist', icon: <CheckSquare size={18} /> },
  { id: 'budget', label: 'Budget Tracker', icon: <DollarSign size={18} /> },
  { id: 'guests', label: 'Guest List', icon: <Users size={18} /> },
  { id: 'vendors', label: 'Vendors', icon: <Store size={18} /> },
  { id: 'seating', label: 'Seating Chart', icon: <MapPin size={18} /> },
  { id: 'bridal-party', label: 'Bridal Party', icon: <Star size={18} /> },
  { id: 'timeline', label: 'Day Timeline', icon: <Calendar size={18} /> },
  { id: 'honeymoon', label: 'Honeymoon', icon: <Plane size={18} /> },
  { id: 'notes', label: 'Notes & Journal', icon: <BookOpen size={18} /> },
  { id: 'planner', label: 'Planner Dashboard', icon: <Briefcase size={18} /> },
  { id: 'referrals' as Section, label: 'Invite Friends', icon: <Gift size={18} /> },
  { id: 'settings' as Section, label: 'Settings', icon: <SettingsIcon size={18} /> },
];

export default function Sidebar({ active, onSelect, partner1, partner2, weddingDate, onClose, isPro, onShowPricing, checklistPct = 0 }: SidebarProps) {
  const countdown = useCountdown(weddingDate);
  const circumference = 2 * Math.PI * 20;

  const handleNavClick = (id: Section) => {
    if (!isPro && LOCKED_SECTIONS.includes(id)) {
      onShowPricing();
      return;
    }
    onSelect(id);
  };

  return (
    <aside className="h-full w-full bg-[#1a1510] flex flex-col overflow-y-auto">
      {/* Logo + couple info */}
      <div className="px-6 py-6 border-b border-[#3a2e22]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart size={20} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <span className="text-[#8a6d3b] font-serif text-sm tracking-widest uppercase">Vow</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2.5 -mr-2 text-[#5d4e3e] hover:text-[#8a6d3b] transition-colors touch-manipulation"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          )}
        </div>

        {/* Progress ring + couple names */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#3a2e22" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="20" fill="none" stroke="#c9a96e" strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - checklistPct / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#8a6d3b] text-[10px] font-bold leading-none">
                  {weddingDate && countdown && !countdown.past ? countdown.days : '—'}
                </span>
              </div>
            </div>
            <div className="text-center mt-0.5">
              <div className="text-[#4a3e32] text-[9px] leading-tight">days to go</div>
              <div className="text-[#8a6d3b] text-[9px] leading-tight">{checklistPct || 23}% planned</div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-white font-serif text-base leading-tight truncate">
              {partner1 || 'Partner 1'} & {partner2 || 'Partner 2'}
            </div>
            {weddingDate && (
              <div className="text-[#a08050] text-xs mt-0.5">
                {parseLocalDate(weddingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        {/* Live countdown */}
        {weddingDate && countdown && !countdown.past && (countdown.days > 0 || countdown.hours > 0) && (
          <div className="bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-lg px-3 py-2.5">
            <div className="text-[#a08050] text-xs tracking-wider uppercase mb-1.5 text-center">Until Your Day</div>
            <div className="grid grid-cols-4 gap-1 text-center">
              {[
                { val: countdown.days, label: 'D' },
                { val: countdown.hours, label: 'H' },
                { val: countdown.minutes, label: 'M' },
                { val: countdown.seconds, label: 'S' },
              ].map(({ val, label }) => (
                <div key={label}>
                  <div className="text-[#8a6d3b] font-serif text-lg font-bold leading-none">{String(val).padStart(2, '0')}</div>
                  <div className="text-[#4a3e32] text-xs">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {weddingDate && countdown?.past && (
          <div className="bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-lg px-3 py-2 text-center">
            <div className="text-[#8a6d3b] font-serif text-sm">Congratulations!</div>
            <div className="text-[#a08050] text-xs">You're married!</div>
          </div>
        )}
        {weddingDate && countdown && !countdown.past && countdown.days === 0 && countdown.hours === 0 && (
          <div className="bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-lg px-3 py-2 text-center">
            <div className="text-[#8a6d3b] font-serif text-sm">Today's the day!</div>
            <div className="text-[#a08050] text-xs">Congratulations!</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(item => {
          const locked = !isPro && LOCKED_SECTIONS.includes(item.id);
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              title={locked ? 'Upgrade to Pro to unlock' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left ${
                isActive
                  ? 'bg-[#c9a96e]/20 text-[#8a6d3b] border border-[#c9a96e]/30'
                  : locked
                  ? 'text-[#4a3e32] hover:bg-[#c9a96e]/5 cursor-pointer'
                  : 'text-[#6b5d4f] hover:text-[#8a6d3b] hover:bg-[#c9a96e]/10'
              }`}
            >
              <span className={isActive ? 'text-[#8a6d3b]' : locked ? 'text-[#4a3e32]' : 'text-[#5d4e3e]'}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {locked && <Lock size={12} className="text-[#8a6d3b]/50 flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Upgrade CTA */}
      {!isPro && (
        <div className="px-4 py-4 border-t border-[#3a2e22]">
          <button
            onClick={onShowPricing}
            className="w-full bg-gradient-to-r from-[#c9a96e] to-[#b8955a] text-white text-xs font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Unlock Full Access
          </button>
          <div className="text-[#4a3e32] text-xs text-center mt-1.5">From $15/mo · Cancel anytime</div>
        </div>
      )}

      {isPro && (
        <div className="px-6 py-4 border-t border-[#3a2e22]">
          <div className="flex items-center gap-2">
            <Music2 size={14} className="text-[#5d4e3e]" />
            <span className="text-[#5d4e3e] text-xs">Vow Wedding Planner</span>
          </div>
        </div>
      )}
    </aside>
  );
}
