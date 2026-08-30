import { useState, useRef } from 'react';
import { Heart, Mail, Lock, Eye, EyeOff, User, Shield, Loader2 } from 'lucide-react';
import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isBreachedPasswordError, meetsAllRules, safeAuthErrorMessage } from '../lib/authHelpers';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import CaptchaBadge from './CaptchaBadge';

interface Props {
  onAuth: () => void;
}

export default function SignupPage({ onAuth }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [partner1, setPartner1] = useState('');
  const [partner2, setPartner2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [breachedWarning, setBreachedWarning] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaAttemptKey, setCaptchaAttemptKey] = useState('initial');
  const attemptRef = useRef(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBreachedWarning(false);

    if (!meetsAllRules(password)) {
      setError('Please choose a password that meets all the requirements shown below.');
      return;
    }

    setLoading(true);
    attemptRef.current += 1;
    const thisAttempt = attemptRef.current;
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            partner1_name: partner1.trim() || null,
            partner2_name: partner2.trim() || null,
          },
          captchaToken: captchaToken || undefined,
        },
      });
      if (signUpError) throw signUpError;
      onAuth();
    } catch (err: unknown) {
      const authErr = err as AuthError;
      console.error('sign up failed', authErr);

      if (isBreachedPasswordError(authErr)) {
        setBreachedWarning(true);
      } else {
        setError(
          safeAuthErrorMessage(
            authErr,
            'signup',
            'We could not create your account. Please check your details and try again.',
          ),
        );
      }

      if (thisAttempt === attemptRef.current) {
        setCaptchaAttemptKey(`attempt-${attemptRef.current}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a1510] via-[#251a10] to-[#1a1510] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(201,169,110,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(201,169,110,0.08) 0%, transparent 40%)' }} />
        <div className="relative z-10">
          <a href="/" className="flex items-center gap-2 mb-16 hover:opacity-80 transition-opacity">
            <Heart size={22} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <span className="text-[#8a6d3b] font-serif text-lg tracking-widest uppercase">Vow</span>
          </a>
          <h1 className="text-white font-serif text-5xl leading-tight mb-6">
            Your perfect wedding,<br />beautifully planned.
          </h1>
          <p className="text-[#a08050] text-lg leading-relaxed max-w-md">
            Everything you need to plan your dream wedding — guest lists, budgets, vendors, timelines, and more — all in one elegant planner.
          </p>
        </div>
        <div className="relative z-10 space-y-5">
          {[
            { stat: 'Free', label: 'No credit card required to start' },
            { stat: '100%', label: 'Private & secure — only you see your data' },
            { stat: '9', label: 'Planning modules in one place' },
          ].map(({ stat, label }) => (
            <div key={stat} className="grid items-center gap-4" style={{ gridTemplateColumns: '4rem 1fr' }}>
              <div className="text-[#8a6d3b] font-serif text-2xl font-bold text-right">{stat}</div>
              <div className="text-[#5d4e3e] text-sm leading-snug">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10 justify-center">
            <Heart size={20} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <span className="text-[#8a6d3b] font-serif text-lg tracking-widest uppercase">Vow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[#2a1f15] font-serif text-3xl mb-1">Create your account</h2>
            <p className="text-[#6b5d4f] text-sm">Start planning your perfect day — free, no card required.</p>
          </div>

          {breachedWarning && (
            <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-lg px-4 py-3 mb-4">
              <div className="flex items-start gap-2">
                <Shield size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">This password has appeared in a known data breach.</p>
                  <p className="text-xs mt-1 text-amber-700">
                    It can't be used here. This was checked securely — your password was never sent anywhere.
                    Please choose a different password.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && !breachedWarning && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
                />
              </div>
            </div>

            <div>
              <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Create a secure password"
                  className="w-full pl-10 pr-10 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] hover:text-[#5d4e3e]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrengthMeter password={password} onValidityChange={setPasswordValid} />
            </div>

            <div className="pt-1">
              <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-2">Partner names <span className="normal-case text-[#8a7a6a] font-normal">(optional — you can add these later)</span></label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f]" />
                  <input
                    type="text"
                    value={partner1}
                    onChange={e => setPartner1(e.target.value)}
                    placeholder="Partner 1"
                    className="w-full pl-9 pr-3 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
                  />
                </div>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f]" />
                  <input
                    type="text"
                    value={partner2}
                    onChange={e => setPartner2(e.target.value)}
                    placeholder="Partner 2"
                    className="w-full pl-9 pr-3 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
                  />
                </div>
              </div>
            </div>

            <CaptchaBadge onToken={setCaptchaToken} action="signup" resetKey={captchaAttemptKey} />

            <button
              type="submit"
              disabled={loading || !passwordValid}
              className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Start planning free'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#6b5d4f]">
            Already have an account?{' '}
            <a href="/login" className="text-[#8a6d3b] hover:underline font-medium">Sign in</a>
          </div>

          <p className="mt-4 text-center text-[#6b5d4f] text-xs">
            By creating an account you agree to our{' '}
            <a href="/terms" className="text-[#8a6d3b] hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-[#8a6d3b] hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
