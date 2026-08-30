import { useState } from 'react';
import { Check, Heart, Zap, X, Loader2, Lock, Star, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Subscription } from '../types';

interface Props {
  subscription: Subscription | null;
  onClose: () => void;
}

const FREE_FEATURES = [
  'Up to 25 guests',
  'Up to 5 vendors',
  'Dashboard overview',
  'Full wedding overview & details',
  'Interactive wedding checklist (48 tasks, check freely)',
  'Full budget tracker (categories & deposits)',
  'Notes & journal',
];

const FREE_LOCKED = [
  'Unlimited guests & vendors',
  'Seating chart builder',
  'Bridal party manager',
  'Day timeline builder',
  'Honeymoon planner',
  'PDF export of all sections',
  'Partner collaboration (real-time)',
  'Activity feed',
];

const PRO_FEATURES = [
  'Unlimited guests & vendors',
  'Full dashboard — all stats unlocked',
  'Unlimited budget items',
  'PDF export of all sections',
  'Seating chart builder',
  'Bridal party manager',
  'Day timeline builder',
  'Honeymoon planner',
  'Full notes & journal with prompts',
  'Partner collaboration (real-time)',
  'Activity feed',
];

const PLANNER_FEATURES = [
  'Everything in Pro',
  'Manage up to 20 couple accounts',
  'Client overview dashboard',
  'Switch between client weddings',
  'White-label option',
  'Priority support',
];

export default function PricingPage({ subscription, onClose }: Props) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const isPro = subscription?.plan === 'pro';

  const monthlyPriceId = import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY || import.meta.env.VITE_STRIPE_PRICE_ID;
  const annualPriceId = import.meta.env.VITE_STRIPE_PRICE_ID_ANNUAL || import.meta.env.VITE_STRIPE_PRICE_ID;

  const handleCheckout = async (priceId: string, tier: string) => {
    setCheckoutError('');
    setCheckoutLoading(tier);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      if (!priceId) throw new Error('Price not configured');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            priceId,
            userId: session.user.id,
            userEmail: session.user.email,
            successUrl: `${window.location.origin}?upgraded=1`,
            cancelUrl: window.location.href,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err: unknown) {
      console.error(err);
      setCheckoutError('We could not start checkout. Please try again.');
      setCheckoutLoading(null);
    }
  };

  const currentInterval = subscription?.billing_interval;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-[#faf9f7] rounded-2xl w-full max-w-5xl my-8 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] p-8 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-[#5d4e3e] hover:text-[#8a6d3b] transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <Heart size={18} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <span className="text-[#8a6d3b] text-xs tracking-widest uppercase">Vow Plans</span>
          </div>
          <h2 className="text-white font-serif text-3xl mb-2">Plan your perfect day, your way.</h2>
          <p className="text-[#a08050] text-sm">Start free. Upgrade anytime. Cancel whenever.</p>

          {/* Billing toggle */}
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={() => setBilling('monthly')}
              className={`text-sm font-medium transition-colors ${billing === 'monthly' ? 'text-white' : 'text-[#5d4e3e]'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
              className={`relative w-12 h-6 rounded-full transition-colors ${billing === 'annual' ? 'bg-[#c9a96e]' : 'bg-[#3a2e22]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${billing === 'annual' ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`text-sm font-medium transition-colors flex items-center gap-2 ${billing === 'annual' ? 'text-white' : 'text-[#5d4e3e]'}`}
            >
              Annual
              <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Save 45%</span>
            </button>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          {checkoutError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-6">
              {checkoutError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col">
              <div className="mb-5">
                <div className="text-[#5d4e3e] text-xs font-medium uppercase tracking-wider mb-1">Free — Planning Preview</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[#2a1f15] font-serif text-4xl font-bold">$0</span>
                </div>
                <div className="mt-1 inline-block bg-stone-100 text-[#5d4e3e] text-xs px-2 py-0.5 rounded-full font-medium">Free Forever</div>
                <p className="text-[#6b5d4f] text-sm mt-2">Everything you need to start planning — no credit card required.</p>
              </div>
              <ul className="space-y-2 mb-4 flex-1">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#2a1f15]">
                    <Check size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="border-t border-stone-200 pt-3 mb-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Not included — upgrade to Pro</p>
                <ul className="space-y-1.5">
                  {FREE_LOCKED.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#8a7a6a]">
                      <Lock size={11} className="text-stone-300 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              {!isPro ? (
                <button
                  onClick={onClose}
                  className="w-full bg-stone-100 text-[#5d4e3e] py-2.5 rounded-xl text-sm text-center font-medium mt-auto hover:bg-stone-200 transition-colors"
                >
                  Continue with Free
                </button>
              ) : (
                <div className="w-full border border-stone-200 text-[#6b5d4f] py-2.5 rounded-xl text-sm text-center mt-auto">
                  Your previous plan
                </div>
              )}
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-2xl p-6 relative overflow-hidden flex flex-col ring-2 ring-[#c9a96e]">
              <div className="absolute top-4 right-4 bg-[#8a6d3b] text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Star size={10} className="fill-white" /> Best Value
              </div>
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(201,169,110,0.12) 0%, transparent 50%)' }} />
              <div className="relative z-10 flex flex-col flex-1">
                <div className="mb-5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={14} className="text-[#8a6d3b]" />
                    <div className="text-[#8a6d3b] text-xs font-medium uppercase tracking-wider">Pro — Full Access</div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    {billing === 'annual' ? (
                      <>
                        <span className="text-white font-serif text-4xl font-bold">$99</span>
                        <span className="text-[#a08050] text-sm">/year</span>
                      </>
                    ) : (
                      <>
                        <span className="text-white font-serif text-4xl font-bold">$15</span>
                        <span className="text-[#a08050] text-sm">/mo</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 inline-block bg-[#c9a96e]/20 border border-[#c9a96e]/30 text-[#8a6d3b] text-xs px-2.5 py-0.5 rounded-full font-medium">
                    {billing === 'annual' ? 'Billed annually · Cancel anytime' : 'Billed monthly · Cancel anytime'}
                  </div>
                </div>
                <ul className="space-y-2 mb-5 flex-1">
                  {PRO_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#d4c4a4]">
                      <Check size={13} className="text-[#8a6d3b] flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isPro && (currentInterval === billing || !currentInterval) ? (
                  <div className="w-full bg-[#c9a96e]/20 border border-[#c9a96e]/40 text-[#8a6d3b] py-2.5 rounded-xl text-sm text-center font-medium mt-auto">
                    Your current plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckout(billing === 'annual' ? annualPriceId : monthlyPriceId, `pro-${billing}`)}
                    disabled={!!checkoutLoading}
                    className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#7a6030] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-auto"
                  >
                    {checkoutLoading === `pro-${billing}`
                      ? <><Loader2 size={14} className="animate-spin" /> Redirecting…</>
                      : billing === 'annual'
                        ? 'Start Pro Annual — $99/yr'
                        : 'Start Pro Monthly — $15/mo'
                    }
                  </button>
                )}
              </div>
            </div>

            {/* Planner Pro */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col">
              <div className="mb-5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users size={14} className="text-[#2a1f15]" />
                  <div className="text-[#2a1f15] text-xs font-medium uppercase tracking-wider">Planner Pro</div>
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-[#8a6d3b] text-xs font-semibold uppercase tracking-wider bg-[#c9a96e]/10 px-2 py-0.5 rounded-full">Coming soon</span>
                </div>
                <div className="mt-1 inline-block bg-stone-100 text-[#5d4e3e] text-xs px-2 py-0.5 rounded-full font-medium">For professional planners</div>
                <p className="text-[#6b5d4f] text-sm mt-2">Manage multiple couples from one account. Join the waitlist for early access.</p>
              </div>
              <ul className="space-y-2 mb-5 flex-1">
                {PLANNER_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#6b5d4f]">
                    <Check size={13} className="text-stone-300 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { window.open('/for-planners', '_blank'); }}
                className="w-full border-2 border-stone-300 text-[#5d4e3e] py-2.5 rounded-xl text-sm font-semibold hover:border-[#c9a96e] hover:text-[#8a6d3b] transition-colors flex items-center justify-center gap-2 mt-auto"
              >
                Join the waitlist
              </button>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-stone-200 pt-8">
            {[
              { q: 'Can I cancel anytime?', a: 'Yes — cancel at any time from your account settings. You keep access until the end of your billing period.' },
              { q: 'Is my data safe?', a: 'Your wedding data is stored securely. Only you and your partner can access your planner — we never share your information.' },
              { q: 'What if I need help?', a: 'Pro users get priority support. Reach out anytime and we\'ll help you make the most of your planner.' },
            ].map(({ q, a }) => (
              <div key={q}>
                <div className="text-[#2a1f15] font-medium text-sm mb-1">{q}</div>
                <div className="text-[#6b5d4f] text-xs leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
