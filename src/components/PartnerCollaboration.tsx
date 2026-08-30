import { useState, useEffect } from 'react';
import { Users, Mail, Link, X, Zap, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { WeddingProfile } from '../types';

interface PartnerInvite {
  id: string;
  invited_email: string;
  token: string;
  accepted_at: string | null;
  created_at: string;
}

interface Props {
  profile: WeddingProfile;
  isPro: boolean;
  onShowPricing: () => void;
  currentUserId: string;
}

export default function PartnerCollaboration({ profile, isPro, onShowPricing, currentUserId: _currentUserId }: Props) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState<PartnerInvite[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!isPro) return;
    loadInvites();
  }, [isPro, profile.id]);

  async function loadInvites() {
    const { data } = await supabase
      .from('partner_invites')
      .select('*')
      .eq('wedding_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setInvites(data);
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) {
      setError('Please enter an email address.');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');
    const { error: err } = await supabase.from('partner_invites').insert({
      wedding_id: profile.id,
      invited_email: inviteEmail.trim(),
    });
    if (err) {
      console.error(err);
      setError('We could not send that invite. Please try again.');
    } else {
      setInviteEmail('');
      setSuccess(`Invite sent to ${inviteEmail.trim()}!`);
      setTimeout(() => setSuccess(''), 4000);
      loadInvites();
    }
    setSending(false);
  }

  async function revokeInvite(id: string) {
    await supabase.from('partner_invites').delete().eq('id', id);
    setInvites(prev => prev.filter(i => i.id !== id));
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}?invite=${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (!isPro) {
    return (
      <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-2xl border border-[#c9a96e]/20 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[#c9a96e]/10 flex items-center justify-center">
            <Users size={18} className="text-[#8a6d3b]" />
          </div>
          <div>
            <div className="text-white font-medium text-sm">Partner Collaboration</div>
            <div className="text-[#6b5d4f] text-xs">Plan together in real time</div>
          </div>
        </div>
        <p className="text-[#6b5d4f] text-xs mb-4">Invite your partner or wedding planner to co-manage your wedding — shared data, live updates, activity feed.</p>
        <button
          onClick={onShowPricing}
          className="flex items-center gap-1.5 bg-[#8a6d3b] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#7a6030] transition-colors font-medium"
        >
          <Zap size={11} /> Upgrade to Pro
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-[#c9a96e]/10 flex items-center justify-center">
          <Users size={18} className="text-[#8a6d3b]" />
        </div>
        <div>
          <div className="text-[#2a1f15] font-medium text-sm">Partner Collaboration</div>
          <div className="text-[#6b5d4f] text-xs">Invite someone to co-plan your wedding</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="email"
          placeholder="partner@email.com"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendInvite()}
          className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/30 focus:border-[#c9a96e]"
        />
        <button
          onClick={sendInvite}
          disabled={sending || !inviteEmail.trim()}
          className="flex items-center gap-1.5 bg-[#8a6d3b] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <Mail size={14} /> Send Invite
        </button>
      </div>

      {error && <p className="text-rose-600 text-xs mb-3">{error}</p>}
      {success && <p className="text-emerald-600 text-xs mb-3">{success}</p>}

      {invites.length > 0 && (
        <div className="space-y-2">
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between py-2 px-3 bg-stone-50 rounded-lg">
              <div className="flex items-center gap-2">
                {inv.accepted_at ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                ) : (
                  <Clock size={12} className="text-amber-500" />
                )}
                <span className="text-sm text-[#2a1f15]">{inv.invited_email}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${inv.accepted_at ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {inv.accepted_at ? 'Active' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {!inv.accepted_at && (
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="text-[#6b5d4f] hover:text-[#8a6d3b] p-1 rounded transition-colors"
                    title="Copy invite link"
                  >
                    <Link size={13} />
                  </button>
                )}
                <button
                  onClick={() => revokeInvite(inv.id)}
                  className="text-[#6b5d4f] hover:text-rose-500 p-1 rounded transition-colors"
                  title="Revoke invite"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {copied && (
        <p className="text-emerald-600 text-xs mt-2">Invite link copied to clipboard!</p>
      )}
    </div>
  );
}
