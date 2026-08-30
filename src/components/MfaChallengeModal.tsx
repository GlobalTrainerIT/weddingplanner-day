import { useState, useEffect } from 'react';
import { Shield, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  factorId: string;
  challengeId: string;
  onVerified: () => void;
  onCancel: () => void;
}

export default function MfaChallengeModal({ factorId, challengeId, onVerified, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;
      onVerified();
    } catch (err: unknown) {
      console.error('mfa challenge failed', err);
      setError("That code didn't match. Try again.");
    }
    setVerifying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#8a6d3b]" />
            <h3 className="text-[#2a1f15] font-serif text-lg">Two-factor authentication</h3>
          </div>
          <button onClick={onCancel} aria-label="Close">
            <X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" />
          </button>
        </div>

        <p className="text-[#6b5d4f] text-sm mb-4">
          Enter the 6-digit code from your authenticator app to continue.
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }}
          placeholder="000000"
          autoFocus
          inputMode="numeric"
          className="w-full border border-stone-200 rounded-lg px-3 py-3 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 mb-3"
        />

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2 rounded-lg text-sm hover:bg-stone-50">
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying || code.length !== 6}
            className="flex-1 bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030] disabled:opacity-50"
          >
            {verifying ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  );
}
