import { useState, useEffect, useCallback } from 'react';
import { Globe, Save, Copy, Check, Eye, Plus, Trash2, Gift, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';
import type { WeddingProfile, WebsiteContent, WebsiteScheduleItem, WebsiteFaqItem, RegistryLink } from '../types';
import { generateShareSlug } from '../lib/shareSlug';

interface Props {
  profile: WeddingProfile | null;
  onUpdateProfile: (p: WeddingProfile) => void;
}

const EMPTY_CONTENT: WebsiteContent = {
  story: '',
  schedule: [],
  travel_notes: '',
  faqs: [],
  registry_links: [],
};

function isHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function WeddingWebsiteEditor({ profile, onUpdateProfile }: Props) {
  const [content, setContent] = useState<WebsiteContent>(profile?.website_content || EMPTY_CONTENT);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.website_content) {
      setContent(profile.website_content);
    }
  }, [profile?.website_content]);

  const websiteUrl = profile?.website_slug ? `${window.location.origin}/w/${profile.website_slug}` : '';

  const handleSave = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('wedding_profile')
      .update({ website_content: content, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select()
      .single();
    setSaving(false);
    if (error) { showToast('Failed to save website content', 'error'); return; }
    if (data) {
      onUpdateProfile(data as WeddingProfile);
      showToast('Website content saved');
    }
  }, [profile, content, onUpdateProfile]);

  const toggleWebsite = async () => {
    if (!profile) return;
    setToggling(true);
    const newEnabled = !profile.website_enabled;
    let slug = profile.website_slug;
    if (newEnabled && !slug) {
      slug = generateShareSlug(profile.partner1_name, profile.partner2_name);
    }
    const { data, error } = await supabase
      .from('wedding_profile')
      .update({ website_enabled: newEnabled, website_slug: slug })
      .eq('id', profile.id)
      .select()
      .single();
    if (error) showToast('Failed to toggle website', 'error');
    if (data) onUpdateProfile(data as WeddingProfile);
    setToggling(false);
  };

  const handleCopy = () => {
    if (!websiteUrl) return;
    navigator.clipboard.writeText(websiteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addRegistryLink = () => {
    setRegistryError(null);
    setContent(prev => ({
      ...prev,
      registry_links: [...prev.registry_links, { label: '', url: '', note: '' }],
    }));
  };

  const updateRegistryLink = (index: number, field: keyof RegistryLink, value: string) => {
    setContent(prev => ({
      ...prev,
      registry_links: prev.registry_links.map((r, i) => i === index ? { ...r, [field]: value } : r),
    }));
  };

  const removeRegistryLink = (index: number) => {
    setContent(prev => ({
      ...prev,
      registry_links: prev.registry_links.filter((_, i) => i !== index),
    }));
  };

  const validateRegistryLinks = (): boolean => {
    for (const link of content.registry_links) {
      if (link.url && !isHttpsUrl(link.url)) {
        setRegistryError('Registry URLs must be valid http:// or https:// links.');
        return false;
      }
    }
    setRegistryError(null);
    return true;
  };

  const handleSaveWithValidation = () => {
    if (!validateRegistryLinks()) return;
    handleSave();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Wedding Website</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">Your public one-page wedding site for guests</p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.website_enabled && websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#5d4e3e] border border-stone-200 px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <Eye size={12} /> Preview
            </a>
          )}
          <button
            onClick={handleSaveWithValidation}
            disabled={saving}
            className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Enable/disable + share link */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-[#c9a96e]/10 flex items-center justify-center flex-shrink-0">
            <Globe size={16} className="text-[#8a6d3b]" />
          </div>
          <div>
            <div className="text-[#2a1f15] text-sm font-medium">Public Wedding Website</div>
            <div className="text-[#6b5d4f] text-xs">A beautiful one-page site for your guests</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile?.website_enabled && websiteUrl && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-[#5d4e3e] border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              {copied ? <><Check size={12} className="text-emerald-500" /> Copied</> : <><Copy size={12} /> Copy link</>}
            </button>
          )}
          <button
            onClick={toggleWebsite}
            disabled={toggling}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${profile?.website_enabled ? 'bg-[#c9a96e]' : 'bg-stone-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${profile?.website_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Our Story */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-[#2a1f15] font-serif text-lg mb-3">Our Story</h2>
        <textarea
          value={content.story}
          onChange={e => setContent(prev => ({ ...prev, story: e.target.value }))}
          rows={4}
          placeholder="Share how you met, the proposal story, or a sweet message to your guests…"
          className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm text-[#2a1f15] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none"
        />
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#2a1f15] font-serif text-lg">Schedule</h2>
          <button
            onClick={() => setContent(prev => ({ ...prev, schedule: [...prev.schedule, { time: '', title: '', location: '', note: '' }] }))}
            className="flex items-center gap-1 text-xs text-[#8a6d3b] hover:underline"
          >
            <Plus size={12} /> Add event
          </button>
        </div>
        <div className="space-y-3">
          {content.schedule.map((item: WebsiteScheduleItem, i: number) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-3 bg-stone-50 rounded-lg">
              <input
                type="text"
                value={item.time}
                onChange={e => setContent(prev => ({ ...prev, schedule: prev.schedule.map((s, j) => j === i ? { ...s, time: e.target.value } : s) }))}
                placeholder="3:00 PM"
                className="w-full sm:w-24 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
              />
              <input
                type="text"
                value={item.title}
                onChange={e => setContent(prev => ({ ...prev, schedule: prev.schedule.map((s, j) => j === i ? { ...s, title: e.target.value } : s) }))}
                placeholder="Ceremony"
                className="w-full sm:flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
              />
              <input
                type="text"
                value={item.location}
                onChange={e => setContent(prev => ({ ...prev, schedule: prev.schedule.map((s, j) => j === i ? { ...s, location: e.target.value } : s) }))}
                placeholder="Main Hall"
                className="w-full sm:w-32 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
              />
              <button
                onClick={() => setContent(prev => ({ ...prev, schedule: prev.schedule.filter((_, j) => j !== i) }))}
                className="text-stone-300 hover:text-rose-500 transition-colors p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {content.schedule.length === 0 && (
            <p className="text-[#6b5d4f] text-xs italic">No events yet. Add ceremony and reception times so guests know the plan.</p>
          )}
        </div>
      </div>

      {/* Travel */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-[#2a1f15] font-serif text-lg mb-3">Travel &amp; Accommodation</h2>
        <textarea
          value={content.travel_notes}
          onChange={e => setContent(prev => ({ ...prev, travel_notes: e.target.value }))}
          rows={3}
          placeholder="Hotel block info, parking details, nearest airport, shuttle info…"
          className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm text-[#2a1f15] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none"
        />
      </div>

      {/* Registry */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#2a1f15] font-serif text-lg flex items-center gap-2"><Gift size={16} /> Registry</h2>
          <button onClick={addRegistryLink} className="flex items-center gap-1 text-xs text-[#8a6d3b] hover:underline">
            <Plus size={12} /> Add link
          </button>
        </div>
        {registryError && <p className="text-rose-600 text-xs mb-3">{registryError}</p>}
        <div className="space-y-3">
          {content.registry_links.map((link: RegistryLink, i: number) => (
            <div key={i} className="flex flex-col gap-2 p-3 bg-stone-50 rounded-lg">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={link.label}
                  onChange={e => updateRegistryLink(i, 'label', e.target.value)}
                  placeholder="Label (e.g. Zola, Amazon, Honeymoon Fund)"
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
                />
                <button onClick={() => removeRegistryLink(i)} className="text-stone-300 hover:text-rose-500 transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>
              <input
                type="url"
                value={link.url}
                onChange={e => updateRegistryLink(i, 'url', e.target.value)}
                placeholder="https://"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
              />
              <input
                type="text"
                value={link.note}
                onChange={e => updateRegistryLink(i, 'note', e.target.value)}
                placeholder="Optional note"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
              />
            </div>
          ))}
          {content.registry_links.length === 0 && (
            <p className="text-[#6b5d4f] text-xs italic">Add links to your registry — Zola, Amazon, or a Venmo/PayPal link for a honeymoon fund.</p>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#2a1f15] font-serif text-lg">FAQ</h2>
          <button
            onClick={() => setContent(prev => ({ ...prev, faqs: [...prev.faqs, { question: '', answer: '' }] }))}
            className="flex items-center gap-1 text-xs text-[#8a6d3b] hover:underline"
          >
            <Plus size={12} /> Add FAQ
          </button>
        </div>
        <div className="space-y-3">
          {content.faqs.map((faq: WebsiteFaqItem, i: number) => (
            <div key={i} className="flex flex-col gap-2 p-3 bg-stone-50 rounded-lg">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={faq.question}
                  onChange={e => setContent(prev => ({ ...prev, faqs: prev.faqs.map((f, j) => j === i ? { ...f, question: e.target.value } : f) }))}
                  placeholder="Question"
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
                />
                <button
                  onClick={() => setContent(prev => ({ ...prev, faqs: prev.faqs.filter((_, j) => j !== i) }))}
                  className="text-stone-300 hover:text-rose-500 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                value={faq.answer}
                onChange={e => setContent(prev => ({ ...prev, faqs: prev.faqs.map((f, j) => j === i ? { ...f, answer: e.target.value } : f) }))}
                rows={2}
                placeholder="Answer"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40 resize-none"
              />
            </div>
          ))}
          {content.faqs.length === 0 && (
            <p className="text-[#6b5d4f] text-xs italic">Add common questions about dress code, kids, parking, etc.</p>
          )}
        </div>
      </div>
    </div>
  );
}
