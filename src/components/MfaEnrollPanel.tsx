import { useState, useEffect, useRef } from 'react';
import { Shield, QrCode, Loader2, Check, AlertTriangle, Trash2, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';

interface Props {
  onReauthRequired: () => void;
}

interface MfaFactor {
  id: string;
  friendly_name: string;
  factor_type: string;
  status: string;
}

export default function MfaEnrollPanel({ onReauthRequired }: Props) {
  const [enrolledFactors, setEnrolledFactors] = useState<MfaFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [unenrolling, setUnenrolling] = useState('');
  const [error, setError] = useState('');
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadFactors();
  }, []);

  useEffect(() => {
    if (qrUrl && qrRef.current) {
      import('qrcode').then(({ default: QRCode }) => {
        QRCode.toCanvas(qrRef.current, qrUrl, { width: 200, margin: 1 });
      }).catch(() => {});
    }
  }, [qrUrl]);

  async function loadFactors() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const totp = (data.totp || []).map(f => ({
        id: f.id,
        friendly_name: f.friendly_name || 'Authenticator app',
        factor_type: f.factor_type,
        status: f.status,
      }));
      setEnrolledFactors(totp.filter(f => f.status === 'verified'));
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function startEnroll() {
    setEnrolling(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator app',
      });
      if (error) throw error;
      setFactorId(data.id);
      setQrUrl(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (err: unknown) {
      console.error('mfa enroll failed', err);
      setError('Could not start MFA setup. Please try again.');
    }
    setEnrolling(false);
  }

  async function handleVerify() {
    if (!code.trim()) return;
    setVerifying(true);
    setError('');
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) throw verify.error;

      const codes = (verify.data as Record<string, unknown>).recovery_codes;
      setRecoveryCodes(Array.isArray(codes) ? codes as string[] : []);
      setShowRecovery(true);
      setEnrolledFactors(prev => [...prev, {
        id: factorId,
        friendly_name: 'Authenticator app',
        factor_type: 'totp',
        status: 'verified',
      }]);
      setQrUrl('');
      setSecret('');
      setCode('');
      showToast('Two-factor authentication enabled');
    } catch (err: unknown) {
      console.error('mfa verify failed', err);
      setError("That code didn't match. Make sure your authenticator app is synced and try again.");
    }
    setVerifying(false);
  }

  async function unenroll(id: string) {
    setUnenrolling(id);
    setError('');
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      setEnrolledFactors(prev => prev.filter(f => f.id !== id));
      showToast('Two-factor authentication disabled');
    } catch (err: unknown) {
      console.error('mfa unenroll failed', err);
      if (err instanceof Error && err.message.includes('reauthenticate')) {
        onReauthRequired();
      } else {
        setError('Could not remove MFA. You may need to re-authenticate first.');
      }
    }
    setUnenrolling('');
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-medium text-sm">Two-factor authentication</h2>
        </div>
        <Loader2 size={20} className="animate-spin text-[#6b5d4f]" />
      </div>
    );
  }

  const hasMfa = enrolledFactors.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={16} className="text-[#8a6d3b]" />
        <h2 className="text-[#2a1f15] font-medium text-sm">Two-factor authentication</h2>
        {hasMfa && (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-auto">Active</span>
        )}
      </div>

      <p className="text-[#6b5d4f] text-xs mb-4">
        Add an extra layer of security with an authenticator app (Google Authenticator, Authy, 1Password, etc.).
        Your account holds guests' addresses and dietary information, so we recommend enabling this.
      </p>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {/* Recovery codes display */}
      {showRecovery && recoveryCodes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="text-amber-800 text-sm font-medium">Save your recovery codes</h3>
          </div>
          <p className="text-amber-700 text-xs mb-3">
            Store these one-time codes somewhere safe — each can substitute for an authenticator code if you lose your device.
            They will not be shown again.
          </p>
          <div className="bg-white rounded-lg p-3 font-mono text-xs grid grid-cols-2 gap-1 mb-3">
            {recoveryCodes.map((recoveryCode, i) => (
              <div key={i} className="text-[#2a1f15]">{recoveryCode}</div>
            ))}
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(recoveryCodes.join('\n')); showToast('Recovery codes copied'); }}
            className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800"
          >
            <Copy size={12} /> Copy all codes
          </button>
          <button
            onClick={() => setShowRecovery(false)}
            className="ml-4 text-xs text-amber-600 hover:underline"
          >
            I've saved them — dismiss
          </button>
        </div>
      )}

      {/* Enrolled factors */}
      {hasMfa && (
        <div className="space-y-2 mb-4">
          {enrolledFactors.map(factor => (
            <div key={factor.id} className="flex items-center justify-between bg-emerald-50/50 border border-emerald-200/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-600" />
                <span className="text-sm text-[#2a1f15]">{factor.friendly_name}</span>
              </div>
              <button
                onClick={() => unenroll(factor.id)}
                disabled={unenrolling === factor.id}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 disabled:opacity-50"
              >
                {unenrolling === factor.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* QR code enrollment step */}
      {qrUrl && !showRecovery && (
        <div className="space-y-3 mb-4">
          <div className="bg-stone-50 rounded-xl p-4 flex flex-col items-center gap-3">
            <QrCode size={20} className="text-[#6b5d4f]" />
            <canvas ref={qrRef} className="rounded-lg" />
            <p className="text-xs text-[#6b5d4f] text-center">Scan this with your authenticator app, then enter the 6-digit code it shows.</p>
            {secret && (
              <details className="text-xs text-[#6b5d4f]">
                <summary className="cursor-pointer hover:text-[#2a1f15]">Can't scan? Enter manually</summary>
                <code className="block mt-1 font-mono break-all bg-white rounded px-2 py-1">{secret}</code>
              </details>
            )}
          </div>
          <div>
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider block mb-1.5">Verification code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 text-center"
              inputMode="numeric"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setQrUrl(''); setSecret(''); setCode(''); }}
              className="flex-1 border border-stone-200 text-[#5d4e3e] py-2 rounded-lg text-sm hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={verifying || code.length !== 6}
              className="flex-1 bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030] disabled:opacity-50"
            >
              {verifying ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Verify and enable'}
            </button>
          </div>
        </div>
      )}

      {/* Enroll button */}
      {!qrUrl && !showRecovery && (
        <button
          onClick={startEnroll}
          disabled={enrolling}
          className="flex items-center gap-2 bg-[#8a6d3b] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#7a6030] disabled:opacity-50"
        >
          {enrolling ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
          {hasMfa ? 'Add another device' : 'Enable two-factor authentication'}
        </button>
      )}
    </div>
  );
}
