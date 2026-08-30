import { useState, useEffect, useRef } from 'react';
import { KeyRound, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';
import { meetsAllRules, sessionNeedsReauth } from '../lib/authHelpers';
import PasswordStrengthMeter from './PasswordStrengthMeter';

export default function ChangePasswordPanel() {
  const [newPassword, setNewPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [nonceSent, setNonceSent] = useState(false);
  const [nonce, setNonce] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const sessionCreatedRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const created = new Date(session.user.created_at || session.access_token).getTime();
        sessionCreatedRef.current = isNaN(created) ? undefined : created;
        setNeedsReauth(sessionNeedsReauth(sessionCreatedRef.current));
      }
    });
  }, []);

  async function sendReauthNonce() {
    setReauthLoading(true);
    try {
      const { error } = await supabase.auth.reauthenticate();
      if (error) throw error;
      setNonceSent(true);
      showToast('Reauthentication code sent to your email');
    } catch (err: unknown) {
      console.error('reauthenticate failed', err);
      showToast('Could not send reauthentication code', 'error');
    }
    setReauthLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!meetsAllRules(newPassword)) {
      showToast('Your new password does not meet all requirements', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        if (error.code === 'reauthentication_not_valid' || error.code === 'reauthentication_needed') {
          setNeedsReauth(true);
          showToast('Please reauthenticate before changing your password', 'error');
        } else if (error.code === 'same_password') {
          showToast('New password must be different from your current one', 'error');
        } else {
          throw error;
        }
      } else {
        showToast('Password changed successfully');
        setNewPassword('');
        setNeedsReauth(false);
        setNonceSent(false);
        setNonce('');
      }
    } catch (err: unknown) {
      console.error('password change failed', err);
      showToast('Could not change your password. Please try again.', 'error');
    }
    setLoading(false);
  }

  if (needsReauth && !nonceSent) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={16} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-medium text-sm">Change password</h2>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-3">
          <p className="text-amber-800 text-sm mb-3">
            For your security, you need to reauthenticate before changing your password.
            This is required because your session is more than 24 hours old.
          </p>
          <button
            onClick={sendReauthNonce}
            disabled={reauthLoading}
            className="flex items-center gap-2 bg-[#8a6d3b] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#7a6030] disabled:opacity-50"
          >
            {reauthLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Send reauthentication code
          </button>
        </div>
      </div>
    );
  }

  if (nonceSent) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={16} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-medium text-sm">Reauthenticate</h2>
        </div>
        <p className="text-[#6b5d4f] text-xs mb-4">
          We sent a code to your email. Enter it below to confirm it is you, then you will be able to set a new password.
        </p>
        <input
          type="text"
          value={nonce}
          onChange={e => setNonce(e.target.value.trim())}
          placeholder="Enter the code from your email"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 mb-3"
        />
        <div className="flex gap-2">
          <button onClick={() => { setNonceSent(false); setNonce(''); }} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2 rounded-lg text-sm hover:bg-stone-50 flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Back
          </button>
          <button
            onClick={async () => {
              if (!nonce) return;
              try {
                const { error: nvError } = await supabase.auth.updateUser({
                  password: newPassword,
                  nonce,
                });
                if (nvError) throw nvError;
                setNonceSent(false);
                setNeedsReauth(false);
                setNonce('');
                setNewPassword('');
                showToast('Reauthenticated — password changed successfully');
              } catch (err: unknown) {
                console.error('nonce verify failed', err);
                showToast('That code was not valid', 'error');
              }
            }}
            className="flex-1 bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030]"
          >
            Verify code and change password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6">
      <div className="flex items-center gap-2 mb-2">
        <KeyRound size={16} className="text-[#8a6d3b]" />
        <h2 className="text-[#2a1f15] font-medium text-sm">Change password</h2>
      </div>
      <p className="text-[#6b5d4f] text-xs mb-4">
        Choose a new password. Your new password must meet all the security requirements below.
        If your session is older than 24 hours, you will be asked to reauthenticate via email first.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5">New password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f]" />
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              placeholder="Choose a stronger password"
              className="w-full pl-10 pr-10 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 focus:border-[#c9a96e] text-[#2a1f15]"
            />
            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] hover:text-[#5d4e3e]">
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <PasswordStrengthMeter password={newPassword} onValidityChange={setValid} />
        </div>

        <button
          type="submit"
          disabled={loading || !valid}
          className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Change password'}
        </button>
      </form>
    </div>
  );
}
