import { useState, useEffect, useCallback } from 'react';
import { Gift, Copy, Check, Users, TrendingUp, Share2, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';
import { track } from '../lib/analytics';
import type { WeddingProfile } from '../types';

interface Props {
  profile: WeddingProfile | null;
  onGetStarted: () => void;
  variant?: 'panel' | 'card';
}

interface ReferralStats {
  total_referrals: number;
  converted: number;
  months_earned: number;
}

export function ReferralPanel({ profile, variant = 'panel' }: Props) {
  const [stats, setStats] = useState<ReferralStats>({ total_referrals: 0, converted: 0, months_earned: 0 });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const referralCode = profile?.referral_code || '';
  const referralLink = `https://weddingplanner.day/?ref=${referralCode}`;

  const loadStats = useCallback(async () => {
    if (!profile) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.rpc('get_referral_stats', { p_user_id: user.id });
    if (data) {
      setStats(data as ReferralStats);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    track('referral_link_copied', {});
    setTimeout(() => setCopied(false), 2000);
    showToast('Referral link copied!');
  }

  function shareText(platform: 'sms' | 'whatsapp' | 'email') {
    track('referral_shared', { platform });
    const text = `Planning a wedding? I'm using Vow to plan mine — it's free and has everything: checklist, budget tracker, guest list, and more. ${referralLink}`;
    if (platform === 'sms') {
      window.location.href = `sms:?body=${encodeURIComponent(text)}`;
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=Wedding%20planning%20tool&body=${encodeURIComponent(text)}`;
    }
  }

  const monthsEarned = stats.months_earned || 0;
  const maxMonths = 12;
  const progressPct = Math.min(100, (monthsEarned / maxMonths) * 100);

  if (variant === 'card') {
    return (
      <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#c9a96e]/20 border border-[#c9a96e]/30 rounded-xl flex items-center justify-center">
            <Gift size={18} className="text-[#c9a96e]" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-serif text-lg">Invite friends, get Pro free</h3>
            <p className="text-[#a08050] text-xs">1 free month of Pro per friend who signs up</p>
          </div>
        </div>
        <button
          onClick={copyLink}
          className="w-full bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-lg px-3 py-2 text-sm text-[#c9a96e] flex items-center justify-between hover:bg-[#c9a96e]/20 transition-colors"
        >
          <span className="truncate">{referralLink}</span>
          {copied ? <Check size={14} className="flex-shrink-0" /> : <Copy size={14} className="flex-shrink-0" />}
        </button>
        <div className="flex items-center justify-between mt-3 text-xs">
          <span className="text-[#a08050]">{stats.total_referrals} invited · {monthsEarned} month{monthsEarned !== 1 ? 's' : ''} earned</span>
          <button onClick={copyLink} className="text-[#c9a96e] hover:underline">Copy link →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[#2a1f15] font-serif text-3xl">Invite Friends, Get Pro Free</h1>
        <p className="text-[#6b5d4f] text-sm mt-1">Share your link and earn 1 free month of Pro for every friend who starts planning.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 text-center">
          <Users size={18} className="text-[#8a6d3b] mx-auto mb-2" />
          <div className="text-[#2a1f15] font-serif text-2xl font-bold">{loading ? '—' : stats.total_referrals}</div>
          <div className="text-[#6b5d4f] text-xs">Friends invited</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5 text-center">
          <TrendingUp size={18} className="text-[#8a6d3b] mx-auto mb-2" />
          <div className="text-[#2a1f15] font-serif text-2xl font-bold">{loading ? '—' : stats.converted}</div>
          <div className="text-[#6b5d4f] text-xs">Signed up</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5 text-center">
          <Gift size={18} className="text-[#8a6d3b] mx-auto mb-2" />
          <div className="text-[#2a1f15] font-serif text-2xl font-bold">{monthsEarned}</div>
          <div className="text-[#6b5d4f] text-xs">Months earned</div>
        </div>
      </div>

      {/* Progress to max */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#2a1f15] text-sm font-medium">Free Pro months earned</h3>
          <span className="text-xs text-[#6b5d4f]">{monthsEarned} / {maxMonths} months max</span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
          <div className="bg-gradient-to-r from-[#c9a96e] to-[#8a6d3b] h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-xs text-[#6b5d4f] mt-2">
          {monthsEarned === 0 ? 'Share your link to start earning free months.' :
           monthsEarned >= maxMonths ? 'You\'ve earned the maximum 12 free months!' :
           `${maxMonths - monthsEarned} more month${maxMonths - monthsEarned !== 1 ? 's' : ''} to go for the maximum.`}
        </p>
      </div>

      {/* Referral link */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="text-[#2a1f15] text-sm font-medium mb-4 flex items-center gap-2">
          <Link2 size={16} className="text-[#8a6d3b]" /> Your referral link
        </h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-[#5d4e3e] bg-stone-50"
          />
          <button
            onClick={copyLink}
            className="bg-[#8a6d3b] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#7a6030] transition-colors flex items-center gap-2"
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => shareText('sms')} className="inline-flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-4 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors">
            <Share2 size={14} /> Text
          </button>
          <button onClick={() => shareText('whatsapp')} className="inline-flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-4 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors">
            <Share2 size={14} /> WhatsApp
          </button>
          <button onClick={() => shareText('email')} className="inline-flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-4 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors">
            <Share2 size={14} /> Email
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6">
        <h3 className="text-[#2a1f15] font-serif text-lg mb-4">How it works</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#c9a96e]/10 border border-[#c9a96e]/30 flex items-center justify-center text-xs font-bold text-[#8a6d3b] flex-shrink-0">1</div>
            <p className="text-[#5d4e3e] text-sm">Share your referral link with friends who are planning a wedding.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#c9a96e]/10 border border-[#c9a96e]/30 flex items-center justify-center text-xs font-bold text-[#8a6d3b] flex-shrink-0">2</div>
            <p className="text-[#5d4e3e] text-sm">They get a 14-day Pro trial when they sign up — no credit card needed.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#c9a96e]/10 border border-[#c9a96e]/30 flex items-center justify-center text-xs font-bold text-[#8a6d3b] flex-shrink-0">3</div>
            <p className="text-[#5d4e3e] text-sm">When they complete onboarding, you earn 1 free month of Pro. Cap at 12 months.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
