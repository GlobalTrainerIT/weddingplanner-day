import { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PASSWORD_RULES, meetsAllRules } from '../lib/authHelpers';
import PasswordStrengthMeter from './PasswordStrengthMeter';

interface Props {
  reasons: string[];
  email: string;
  onResolved: () => void;
  onBack: () => void;
}

export default function UpdatePasswordScreen({ reasons, email, onResolved, onBack }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => onResolved(), 1200);
      return () => clearTimeout(timer);
    }
  }, [success, onResolved]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetsAllRules(newPassword)) {
      setError('Please meet all the requirements below before continuing.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err: unknown) {
      console.error('password update failed', err);
      setError('We could not update your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-[#2a1f15] font-serif text-2xl mb-2">Password updated</h2>
          <p className="text-[#6b5d4f] text-sm">Your password is now secure. Taking you to your planner…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={26} className="text-amber-600" />
          </div>
          <h1 className="text-[#2a1f15] font-serif text-2xl mb-2">
            Your password no longer meets our security requirements
          </h1>
          <p className="text-[#6b5d4f] text-sm">
            We've strengthened our password policy to better protect your account. Since you're already signed in,
            you can set a new password right now — no email link needed.
          </p>
        </div>

        {reasons.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-amber-800 text-xs font-medium mb-1">What needs to change:</p>
            <ul className="space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="text-amber-700 text-xs flex items-start gap-1.5">
                  <span className="mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-[#6b5d4f] mb-4">
          Account: <strong>{email}</strong>
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5">New password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoFocus
                placeholder="Enter a stronger password"
                className="w-full pl-10 pr-10 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] hover:text-[#5d4e3e]">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrengthMeter password={newPassword} onValidityChange={setValid} />
          </div>

          <button
            type="submit"
            disabled={loading || !valid}
            className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors disabled:opacity-60"
          >
            {loading ? 'Updating…' : 'Update password and continue'}
          </button>
        </form>

        <button onClick={onBack} className="mt-4 text-[#8a6d3b] text-sm hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Sign out instead
        </button>

        <div className="mt-6 bg-stone-50 rounded-lg px-4 py-3">
          <p className="text-xs text-[#6b5d4f]">
            Your new password must include all of the following:
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-0.5">
            {PASSWORD_RULES.map(rule => (
              <li key={rule.key} className="text-xs text-[#6b5d4f] flex items-center gap-1.5">
                <span className="text-[#8a6d3b]">•</span> {rule.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
