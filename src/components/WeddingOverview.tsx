import { useState, useCallback } from 'react';
import { Heart, CreditCard as Edit3, Save, X, Users, Link, Copy, Check, Share2, Eye, Timer, Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';
import type { WeddingProfile } from '../types';
import { generateShareSlug } from '../lib/shareSlug';

interface Props {
  profile: WeddingProfile | null;
  onUpdate: (p: WeddingProfile) => void;
}

const themes = ['Garden Romantic', 'Modern Minimalist', 'Rustic Boho', 'Black Tie Formal', 'Beach Tropical', 'Vintage Glam', 'Industrial Chic', 'Classic Timeless'];
const palettes = ['Ivory & Gold', 'Dusty Rose & Sage', 'Navy & Blush', 'Terracotta & Cream', 'Black & White', 'Lavender & Silver', 'Emerald & Gold', 'Mauve & Champagne'];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)' },
  { code: 'NZD', symbol: 'NZ$', label: 'NZ Dollar (NZ$)' },
  { code: 'ZAR', symbol: 'R', label: 'South African Rand (R)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (S$)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham' },
  { code: 'MXN', symbol: 'Mex$', label: 'Mexican Peso (Mex$)' },
];

const generateSlug = generateShareSlug;

export default function WeddingOverview({ profile, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<WeddingProfile>>(profile || {});
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [togglingRsvp, setTogglingRsvp] = useState(false);
  const [togglingCountdown, setTogglingCountdown] = useState(false);

  const inviteLink = `${window.location.origin}?invite=${profile?.id?.slice(0, 8) ?? 'abc123'}-${Math.random().toString(36).slice(2, 7)}`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('wedding_profile')
      .update({
        partner1_name: form.partner1_name,
        partner2_name: form.partner2_name,
        wedding_date: form.wedding_date || null,
        venue: form.venue,
        theme: form.theme,
        total_budget: form.total_budget,
        color_palette: form.color_palette,
        currency_code: form.currency_code || 'USD',
        currency_symbol: form.currency_symbol || '$',
        notes: form.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile?.id || '')
      .select()
      .single();
    setSaving(false);
    if (error) { showToast('Failed to save wedding details', 'error'); return; }
    if (data) {
      onUpdate(data);
      setEditing(false);
      showToast('Wedding details saved');
    }
  };

  const toggleRsvp = async () => {
    if (!profile) return;
    setTogglingRsvp(true);
    const newEnabled = !profile.rsvp_enabled;
    let slug = profile.rsvp_slug;
    if (newEnabled && !slug) {
      slug = generateSlug(profile.partner1_name, profile.partner2_name);
    }
    const { data, error } = await supabase
      .from('wedding_profile')
      .update({ rsvp_enabled: newEnabled, rsvp_slug: slug })
      .eq('id', profile.id)
      .select()
      .single();
    if (error) showToast('Failed to toggle RSVP page', 'error');
    if (data) onUpdate(data as WeddingProfile);
    setTogglingRsvp(false);
  };

  const toggleCountdown = async () => {
    if (!profile) return;
    setTogglingCountdown(true);
    const newEnabled = !profile.countdown_enabled;
    let slug = profile.countdown_slug;
    if (newEnabled && !slug) {
      slug = generateSlug(profile.partner1_name, profile.partner2_name);
    }
    const { data, error } = await supabase
      .from('wedding_profile')
      .update({ countdown_enabled: newEnabled, countdown_slug: slug })
      .eq('id', profile.id)
      .select()
      .single();
    if (error) showToast('Failed to toggle countdown page', 'error');
    if (data) onUpdate(data as WeddingProfile);
    setTogglingCountdown(false);
  };

  const rsvpUrl = profile?.rsvp_slug ? `${window.location.origin}/rsvp/${profile.rsvp_slug}` : '';
  const countdownUrl = profile?.countdown_slug ? `${window.location.origin}/countdown/${profile.countdown_slug}` : '';

  const [shareCardLoading, setShareCardLoading] = useState<'portrait' | 'story' | null>(null);

  const generateShareCard = useCallback((variant: 'portrait' | 'story') => {
    if (!profile) return;
    setShareCardLoading(variant);
    const W = 1080;
    const H = variant === 'portrait' ? 1350 : 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1510');
    grad.addColorStop(0.5, '#2e2218');
    grad.addColorStop(1, '#1a1510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative circle
    ctx.strokeStyle = 'rgba(201, 169, 110, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.4, 350, 0, Math.PI * 2);
    ctx.stroke();

    // Heart symbol
    ctx.fillStyle = '#c9a96e';
    ctx.font = '60px serif';
    ctx.textAlign = 'center';
    ctx.fillText('♥', W / 2, H * 0.22);

    // "We're getting married"
    ctx.fillStyle = '#a08050';
    ctx.font = '600 36px Georgia, serif';
    ctx.fillText("WE'RE GETTING MARRIED", W / 2, H * 0.28);

    // Couple names
    ctx.fillStyle = '#fffaf0';
    ctx.font = 'italic 90px Georgia, serif';
    const p1 = profile.partner1_name || 'Partner 1';
    const p2 = profile.partner2_name || 'Partner 2';
    ctx.fillText(`${p1} & ${p2}`, W / 2, H * 0.42);

    // Divider
    ctx.strokeStyle = 'rgba(201, 169, 110, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.35, H * 0.48);
    ctx.lineTo(W * 0.65, H * 0.48);
    ctx.stroke();

    // Date
    if (profile.wedding_date) {
      const dateStr = new Date(`${profile.wedding_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      ctx.fillStyle = '#c9a96e';
      ctx.font = '52px Georgia, serif';
      ctx.fillText(dateStr, W / 2, H * 0.55);
    }

    // Venue
    if (profile.venue) {
      ctx.fillStyle = '#a08050';
      ctx.font = '36px Georgia, serif';
      ctx.fillText(profile.venue, W / 2, H * 0.62);
    }

    // Watermark
    ctx.fillStyle = '#4a3a2a';
    ctx.font = '28px Georgia, serif';
    ctx.fillText('Planned with Vow — weddingplanner.day', W / 2, H * 0.95);

    canvas.toBlob(blob => {
      if (!blob) { setShareCardLoading(null); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${p1}-${p2}-${variant === 'portrait' ? 'portrait-1080x1350' : 'story-1080x1920'}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setShareCardLoading(null);
    }, 'image/png');
  }, [profile]);

  const formattedDate = form.wedding_date
    ? new Date(`${form.wedding_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const formattedBudget = form.total_budget
    ? `${form.currency_symbol || '$'}${Number(form.total_budget).toLocaleString('en-US')}`
    : '—';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Wedding Overview</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">Your wedding vision and key details</p>
        </div>
        {!editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 border border-[#c9a96e] text-[#8a6d3b] px-4 py-2 rounded-lg text-sm hover:bg-[#c9a96e]/5 transition-colors"
            >
              <Users size={15} /> Invite Partner
            </button>
            <button onClick={() => { setForm(profile || {}); setEditing(true); }} className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030] transition-colors">
              <Edit3 size={15} /> Edit Details
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex items-center gap-1 border border-stone-300 text-[#5d4e3e] px-4 py-2 rounded-lg text-sm hover:bg-stone-50">
              <X size={15} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030] disabled:opacity-50">
              <Save size={15} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1510] to-[#2e2218] p-8">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 30% 70%, #c9a96e, transparent 60%)'}} />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <Heart size={18} className="text-[#8a6d3b] fill-[#c9a96e]" />
              <span className="text-[#8a6d3b] text-xs tracking-widest uppercase">The Happy Couple</span>
            </div>
            <Field label="Partner 1 Name" value={form.partner1_name || ''} editing={editing} onChange={v => setForm(f => ({...f, partner1_name: v}))} />
            <Field label="Partner 2 Name" value={form.partner2_name || ''} editing={editing} onChange={v => setForm(f => ({...f, partner2_name: v}))} />
            <Field label="Wedding Date" value={editing ? (form.wedding_date || '') : formattedDate} editing={editing} type="date" onChange={v => setForm(f => ({...f, wedding_date: v}))} />
            <Field label="Venue" value={form.venue || ''} editing={editing} onChange={v => setForm(f => ({...f, venue: v}))} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[#8a6d3b] text-xs tracking-widest uppercase">Wedding Details</span>
            </div>
            <Field label="Total Budget" value={editing ? String(form.total_budget || '') : formattedBudget} editing={editing} type="number" onChange={v => setForm(f => ({...f, total_budget: parseFloat(v) || 0}))} prefix={editing ? (form.currency_symbol || '$') : undefined} />
            {editing ? (
              <div>
                <label className="text-[#a08050] text-xs tracking-wider uppercase block mb-1">Currency</label>
                <select
                  value={form.currency_code || 'USD'}
                  onChange={e => {
                    const c = CURRENCIES.find(cc => cc.code === e.target.value);
                    setForm(f => ({ ...f, currency_code: e.target.value, currency_symbol: c?.symbol || '$' }));
                  }}
                  className="w-full bg-[#2a1f15] border border-[#4a3a2a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c9a96e]"
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <div className="text-[#a08050] text-xs tracking-wider uppercase mb-1">Currency</div>
                <div className="text-white">{form.currency_code || 'USD'} ({form.currency_symbol || '$'})</div>
              </div>
            )}
            {editing ? (
              <div>
                <label className="text-[#a08050] text-xs tracking-wider uppercase block mb-1">Theme</label>
                <select value={form.theme || ''} onChange={e => setForm(f => ({...f, theme: e.target.value}))} className="w-full bg-[#2a1f15] border border-[#4a3a2a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c9a96e]">
                  <option value="">Select theme…</option>
                  {themes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <div className="text-[#a08050] text-xs tracking-wider uppercase mb-1">Theme</div>
                <div className="text-white">{form.theme || '—'}</div>
              </div>
            )}
            {editing ? (
              <div>
                <label className="text-[#a08050] text-xs tracking-wider uppercase block mb-1">Color Palette</label>
                <select value={form.color_palette || ''} onChange={e => setForm(f => ({...f, color_palette: e.target.value}))} className="w-full bg-[#2a1f15] border border-[#4a3a2a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c9a96e]">
                  <option value="">Select palette…</option>
                  {palettes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <div className="text-[#a08050] text-xs tracking-wider uppercase mb-1">Color Palette</div>
                <div className="text-white">{form.color_palette || '—'}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sharing panel */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Share2 size={18} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-serif text-lg">Public Sharing</h2>
        </div>

        <div className="space-y-4">
          {/* RSVP */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-lg bg-[#c9a96e]/10 flex items-center justify-center flex-shrink-0">
                <Eye size={16} className="text-[#8a6d3b]" />
              </div>
              <div>
                <div className="text-[#2a1f15] text-sm font-medium">Public RSVP Page</div>
                <div className="text-[#6b5d4f] text-xs">Guests find their name and RSVP online — no login required</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profile?.rsvp_enabled && rsvpUrl && (
                <button
                  onClick={() => handleCopy(rsvpUrl, 'rsvp')}
                  className="flex items-center gap-1.5 text-xs text-[#5d4e3e] border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  {copied === 'rsvp' ? <><Check size={12} className="text-emerald-500" /> Copied</> : <><Copy size={12} /> Copy link</>}
                </button>
              )}
              <button
                onClick={toggleRsvp}
                disabled={togglingRsvp}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${profile?.rsvp_enabled ? 'bg-[#c9a96e]' : 'bg-stone-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${profile?.rsvp_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-lg bg-[#c9a96e]/10 flex items-center justify-center flex-shrink-0">
                <Timer size={16} className="text-[#8a6d3b]" />
              </div>
              <div>
                <div className="text-[#2a1f15] text-sm font-medium">Shareable Countdown</div>
                <div className="text-[#6b5d4f] text-xs">Public countdown with Instagram story download</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profile?.countdown_enabled && countdownUrl && (
                <button
                  onClick={() => handleCopy(countdownUrl, 'countdown')}
                  className="flex items-center gap-1.5 text-xs text-[#5d4e3e] border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  {copied === 'countdown' ? <><Check size={12} className="text-emerald-500" /> Copied</> : <><Copy size={12} /> Copy link</>}
                </button>
              )}
              <button
                onClick={toggleCountdown}
                disabled={togglingCountdown}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${profile?.countdown_enabled ? 'bg-[#c9a96e]' : 'bg-stone-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${profile?.countdown_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share the news card generator */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon size={18} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-serif text-lg">Share the News</h2>
        </div>
        <p className="text-[#6b5d4f] text-sm mb-4">Download a beautiful announcement image to share on social media or send to family and friends.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => generateShareCard('portrait')}
            disabled={shareCardLoading === 'portrait'}
            className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50"
          >
            {shareCardLoading === 'portrait' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Portrait 1080×1350
          </button>
          <button
            onClick={() => generateShareCard('story')}
            disabled={shareCardLoading === 'story'}
            className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50"
          >
            {shareCardLoading === 'story' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Story 1080×1920
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-[#2a1f15] font-serif text-lg mb-3">Wedding Notes &amp; Vision</h2>
        {editing ? (
          <textarea
            value={form.notes || ''}
            onChange={e => setForm(f => ({...f, notes: e.target.value}))}
            rows={5}
            placeholder="Describe your wedding vision, must-haves, special requests…"
            className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm text-[#2a1f15] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none"
          />
        ) : (
          <p className="text-[#5d4e3e] text-sm leading-relaxed whitespace-pre-wrap">{form.notes || 'No notes yet. Click Edit Details to add your wedding vision.'}</p>
        )}
      </div>

      {/* Invite Partner modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#c9a96e]/10 flex items-center justify-center">
                  <Users size={18} className="text-[#8a6d3b]" />
                </div>
                <div>
                  <div className="text-[#2a1f15] font-serif text-lg font-semibold">Invite Partner</div>
                  <div className="text-[#6b5d4f] text-xs">Share access to your wedding planner</div>
                </div>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-[#6b5d4f] hover:text-[#2a1f15] transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-[#5d4e3e] text-sm mb-4 leading-relaxed">
              Share this link with your partner or co-planner. Anyone with this link can join your wedding planning workspace.
            </p>
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 mb-4">
              <Link size={14} className="text-[#6b5d4f] flex-shrink-0" />
              <span className="text-[#5d4e3e] text-xs truncate flex-1">{inviteLink}</span>
            </div>
            <button
              onClick={() => handleCopy(inviteLink, 'invite')}
              className="w-full flex items-center justify-center gap-2 bg-[#8a6d3b] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors"
            >
              {copied === 'invite' ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Invite Link</>}
            </button>
          </div>
        </div>
      )}

      {/* Palette swatches */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-[#2a1f15] font-serif text-lg mb-4">Color Palette Preview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Ivory', hex: '#fffff0' },
            { name: 'Champagne', hex: '#f7e7ce' },
            { name: 'Dusty Rose', hex: '#dcb4ac' },
            { name: 'Sage Green', hex: '#b2bfaa' },
            { name: 'Warm Taupe', hex: '#c4a882' },
            { name: 'Gold', hex: '#c9a96e' },
            { name: 'Blush', hex: '#f2d0c4' },
            { name: 'Cream', hex: '#f5f0e8' },
          ].map(c => (
            <div key={c.name} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-stone-200 shadow-sm flex-shrink-0" style={{ backgroundColor: c.hex }} />
              <div>
                <div className="text-[#2a1f15] text-sm font-medium">{c.name}</div>
                <div className="text-[#6b5d4f] text-xs">{c.hex}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, editing, type = 'text', onChange, prefix }: {
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  onChange: (v: string) => void;
  prefix?: string;
}) {
  return (
    <div>
      <div className="text-[#a08050] text-xs tracking-wider uppercase mb-1">{label}</div>
      {editing ? (
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a08050] text-sm">{prefix}</span>}
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            className={`w-full bg-[#2a1f15] border border-[#4a3a2a] text-white rounded-lg py-2 text-sm focus:outline-none focus:border-[#c9a96e] ${prefix ? 'pl-7 pr-3' : 'px-3'}`}
          />
        </div>
      ) : (
        <div className="text-white text-sm">
          {prefix && <span className="text-[#a08050] mr-1">{prefix}</span>}
          {value || '—'}
        </div>
      )}
    </div>
  );
}
