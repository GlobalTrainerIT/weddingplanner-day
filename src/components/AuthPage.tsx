import { useState, useEffect, useRef } from 'react';
import { Heart, Mail, Lock, Eye, EyeOff, ArrowLeft, Shield, Loader2 } from 'lucide-react';
import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  isWeakPasswordError,
  weakPasswordReasons,
  isBreachedPasswordError,
  safeAuthErrorMessage,
} from '../lib/authHelpers';
import CaptchaBadge from './CaptchaBadge';
import MfaChallengeModal from './MfaChallengeModal';

type Mode = 'login' | 'reset';

interface Props {
  onAuth: () => void;
}

export default function AuthPage({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [breachedWarning, setBreachedWarning] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaAttemptKey, setCaptchaAttemptKey] = useState('initial');
  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string; challengeId: string } | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (mode === 'reset') {
      setError('');
      setBreachedWarning(false);
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBreachedWarning(false);
    setLoading(true);
    attemptRef.current += 1;
    const thisAttempt = attemptRef.current;
    try {
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          captchaToken: captchaToken || undefined,
        });
        if (resetError) console.error(resetError);
        setResetSent(true);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken: captchaToken || undefined },
        });

        if (signInError) throw signInError;

        // Check if MFA challenge is needed
        if (data?.user && data.session === null) {
          const { data: factorData } = await supabase.auth.mfa.listFactors();
          const verified = (factorData?.totp || []).find(f => f.status === 'verified');
          if (verified) {
            const { data: challenge, error: chError } = await supabase.auth.mfa.challenge({ factorId: verified.id });
            if (chError) throw chError;
            setMfaChallenge({ factorId: verified.id, challengeId: challenge.id });
            setLoading(false);
            return;
          }
        }

        onAuth();
      }
    } catch (err: unknown) {
      const authErr = err as AuthError;
      console.error(authErr);

      if (isBreachedPasswordError(authErr)) {
        setBreachedWarning(true);
      } else if (isWeakPasswordError(authErr)) {
        // On sign-in, WeakPasswordError means the user can still proceed but must update.
        // We route them through a password update screen.
        const reasons = weakPasswordReasons(authErr);
        // Store for the update screen
        sessionStorage.setItem('vow_weak_password_reasons', JSON.stringify(reasons));
        sessionStorage.setItem('vow_weak_password_email', email);
        // Force a session check — Supabase may have created a session despite the warning
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          onAuth();
          return;
        }
        setError('Your password no longer meets our security requirements. Please reset it.');
        setMode('reset');
      } else {
        setError(
          safeAuthErrorMessage(authErr, 'signin', 'Email or password is incorrect. Please try again.'),
        );
      }

      // Refresh captcha for next attempt
      if (thisAttempt === attemptRef.current) {
        setCaptchaAttemptKey(`attempt-${attemptRef.current}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerified = () => {
    setMfaChallenge(null);
    onAuth();
  };

  if (mfaChallenge) {
    return (
      <MfaChallengeModal
        factorId={mfaChallenge.factorId}
        challengeId={mfaChallenge.challengeId}
        onVerified={handleMfaVerified}
        onCancel={() => {
          setMfaChallenge(null);
          supabase.auth.signOut();
        }}
      />
    );
  }

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
            Welcome back.<br />Your wedding awaits.
          </h1>
          <p className="text-[#a08050] text-lg leading-relaxed max-w-md">
            Pick up right where you left off — your checklist, budget, guests, and vendors are all here.
          </p>
        </div>
        <div className="relative z-10 space-y-5">
          {[
            { stat: '100%', label: 'Private & secure — only you see your data' },
            { stat: '9', label: 'Planning modules in one place' },
            { stat: '48+', label: 'Tasks on the master wedding checklist' },
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

          {mode === 'reset' && resetSent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-[#2a1f15] font-serif text-2xl mb-2">Check your inbox</h2>
              <p className="text-[#5d4e3e] text-sm mb-6">If an account exists for <strong>{email}</strong>, a reset link is on its way.</p>
              <button onClick={() => { setMode('login'); setResetSent(false); }} className="text-[#8a6d3b] text-sm hover:underline flex items-center gap-1 mx-auto">
                <ArrowLeft size={14} /> Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-[#2a1f15] font-serif text-3xl mb-1">
                  {mode === 'login' ? 'Sign in' : 'Reset password'}
                </h2>
                <p className="text-[#6b5d4f] text-sm">
                  {mode === 'login' ? 'Sign in to your wedding planner' : 'Enter your email to receive a reset link'}
                </p>
              </div>

              {breachedWarning && (
                <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-lg px-4 py-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Shield size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">This password has appeared in a known data breach.</p>
                      <p className="text-xs mt-1 text-amber-700">
                        It can't be used here. This was checked securely — your password was never sent anywhere.
                        Please use the "Forgot password?" link below to choose a different one.
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

                {mode === 'login' && (
                  <div>
                    <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="Your password"
                        className="w-full pl-10 pr-10 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] hover:text-[#5d4e3e]">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-1.5">
                      <button type="button" onClick={() => { setMode('reset'); setError(''); setBreachedWarning(false); }} className="text-[#8a6d3b] text-xs hover:underline">
                        Forgot password?
                      </button>
                    </div>
                  </div>
                )}

                <CaptchaBadge onToken={setCaptchaToken} action={mode === 'reset' ? 'reset' : 'login'} resetKey={captchaAttemptKey} />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors disabled:opacity-60 mt-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : mode === 'login' ? 'Sign in' : 'Send reset link'}
                </button>
              </form>

              {mode === 'login' && (
                <div className="mt-6 text-center text-sm text-[#6b5d4f]">
                  Don't have an account?{' '}
                  <a href="/signup" className="text-[#8a6d3b] hover:underline font-medium">Create one free</a>
                </div>
              )}

              {mode === 'reset' && (
                <div className="mt-6 text-center">
                  <button onClick={() => { setMode('login'); setError(''); }} className="text-[#8a6d3b] text-sm hover:underline flex items-center gap-1 mx-auto">
                    <ArrowLeft size={14} /> Back to sign in
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
