import { useState } from 'react';
import { UserPlus, X, Copy, Check, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';
import { track } from '../lib/analytics';
import type { WeddingProfile } from '../types';

interface Props {
  profile: WeddingProfile | null;
  onDismiss: () => void;
}

export function PartnerInviteCard({ profile, onDismiss }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function sendInvite() {
    if (!profile || !inviteEmail.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const token = crypto.randomUUID();
      const { error } = await supabase.from('partner_invites').insert({
        wedding_id: profile.id,
        invited_by_user_id: user.id,
        invited_email: inviteEmail.trim(),
        token,
        status: 'pending',
      });

      if (error) throw error;
      setInviteToken(token);
      setSent(true);
      track('partner_invite_sent', {});
      showToast('Partner invite created');
    } catch {
      showToast('Failed to send invite', 'error');
    }
    setSending(false);
  }

  const inviteLink = inviteToken ? `${window.location.origin}/?invite=${inviteToken}` : '';

  function copyInvite() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Invite link copied');
  }

  return (
    <div className="bg-white rounded-2xl border border-[#c9a96e]/30 p-5 relative">
      <button onClick={onDismiss} className="absolute top-4 right-4 text-[#6b5d4f] hover:text-[#2a1f15] transition-colors" aria-label="Dismiss">
        <X size={16} />
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-xl flex items-center justify-center">
          <UserPlus size={18} className="text-[#8a6d3b]" />
        </div>
        <div>
          <h3 className="text-[#2a1f15] font-serif text-lg">Invite your partner</h3>
          <p className="text-[#6b5d4f] text-xs">Plan together in real time — both of you can edit the checklist, budget, and guest list.</p>
        </div>
      </div>

      {!sent ? (
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="partner@email.com"
            className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
          />
          <button
            onClick={sendInvite}
            disabled={sending || !inviteEmail.trim()}
            className="bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#7a6030] disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
            Invite
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <Check size={16} className="text-emerald-600" />
            <span className="text-emerald-800 text-sm">Invite created! Share this link with your partner:</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm text-[#5d4e3e] bg-stone-50"
            />
            <button
              onClick={copyInvite}
              className="bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#7a6030] transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
