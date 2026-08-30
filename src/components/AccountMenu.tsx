import { useState, useRef, useEffect } from 'react';
import { User, LogOut, CreditCard, ChevronDown, Zap, Sun, Moon, Share2, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDarkMode } from '../lib/useDarkMode';
import type { Subscription } from '../types';

interface Props {
  email: string;
  subscription: Subscription | null;
  onShowPricing: () => void;
  onSignOut: () => void;
  referralCode?: string | null;
}

export default function AccountMenu({ email, subscription, onShowPricing, onSignOut, referralCode }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const isPro = subscription?.plan === 'pro';
  const hasStripeSubscription = !!subscription?.stripe_customer_id;
  const [dark, setDark] = useDarkMode();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  const handleCopyReferral = async () => {
    if (!referralCode) return;
    const url = `${window.location.origin}/r/${referralCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManageSubscription = async () => {
    if (!isPro) {
      setOpen(false);
      onShowPricing();
      return;
    }
    setPortalError('');
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ returnUrl: window.location.origin }),
        },
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setPortalError('Could not open billing portal. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-[#c9a96e]/20 border border-[#c9a96e]/40 flex items-center justify-center">
          <User size={14} className="text-[#8a6d3b]" />
        </div>
        <span className="text-[#2a1f15] text-sm hidden sm:block max-w-[140px] truncate">{email}</span>
        {isPro && (
          <span className="bg-[#8a6d3b] text-white text-xs px-1.5 py-0.5 rounded-full hidden sm:block">Pro</span>
        )}
        <ChevronDown size={14} className={`text-[#6b5d4f] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-stone-200 shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="text-[#2a1f15] text-sm font-medium truncate">{email}</div>
            <div className="text-[#6b5d4f] text-xs mt-0.5">
              {isPro ? (
                <span className="text-[#8a6d3b] font-medium flex items-center gap-1">
                  <Zap size={10} /> Pro plan
                </span>
              ) : 'Free plan'}
            </div>
          </div>

          <div className="py-1">
            {!isPro && (
              <button
                onClick={() => { setOpen(false); onShowPricing(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#8a6d3b] hover:bg-[#c9a96e]/5 transition-colors"
              >
                <Zap size={15} />
                Upgrade to Pro
              </button>
            )}
            {isPro && hasStripeSubscription && (
              <>
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#5d4e3e] hover:bg-stone-50 transition-colors disabled:opacity-60"
                >
                  {portalLoading ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                  Manage subscription
                </button>
                {portalError && (
                  <div className="mx-3 mb-1 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 leading-relaxed">
                    {portalError}
                  </div>
                )}
              </>
            )}
            {isPro && !hasStripeSubscription && (
              <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#5d4e3e]">
                <CreditCard size={15} className="text-[#8a6d3b]" />
                <span>Pro access — no billing</span>
              </div>
            )}
            {!isPro && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#5d4e3e] hover:bg-stone-50 transition-colors disabled:opacity-60"
              >
                {portalLoading ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                View plans
              </button>
            )}

            {referralCode && (
              <button
                onClick={handleCopyReferral}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#5d4e3e] hover:bg-stone-50 transition-colors"
              >
                {copied ? <Check size={15} className="text-emerald-500" /> : <Share2 size={15} />}
                <span className="flex-1 text-left">{copied ? 'Link copied!' : 'Share Vow'}</span>
                {!copied && <span className="text-[#8a6d3b] text-xs bg-[#c9a96e]/10 px-1.5 py-0.5 rounded-full">Refer friends</span>}
              </button>
            )}
          </div>

          <div className="border-t border-stone-100 py-1">
            <button
              onClick={() => setDark(d => !d)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#5d4e3e] hover:bg-stone-50 transition-colors"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
              {dark ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
