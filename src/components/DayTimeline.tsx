import { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, Download, Lock, Zap, ChevronUp, AlertTriangle, Share2, X, Link2, Check, MapPin, Users as UsersIcon, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { WeddingProfile, Vendor, BridalPartyMember, TimelineEvent, TimelineAssignment } from '../types';
import { randomSuffix } from '../lib/shareSlug';

interface Props {
  weddingId: string;
  isPro?: boolean;
  onShowPricing?: () => void;
  profile: WeddingProfile | null;
  vendors: Vendor[];
  bridalParty: BridalPartyMember[];
}

const CATEGORIES = ['Prep', 'Photography', 'Ceremony', 'Reception', 'Other'];
const categoryColors: Record<string, string> = {
  Prep: 'bg-rose-100 text-rose-700 border-rose-200',
  Photography: 'bg-amber-100 text-amber-700 border-amber-200',
  Ceremony: 'bg-sky-100 text-sky-700 border-sky-200',
  Reception: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Other: 'bg-stone-100 text-stone-700 border-stone-200',
};
const dotColors: Record<string, string> = {
  Prep: 'bg-rose-400',
  Photography: 'bg-amber-400',
  Ceremony: 'bg-sky-400',
  Reception: 'bg-emerald-400',
  Other: 'bg-stone-400',
};

const AVATAR_COLORS = ['#c9a96e', '#dc2626', '#0ea5e9', '#16a34a', '#7c3aed', '#db2777', '#ea580c', '#0891b2'];

/** Escape any value before it is interpolated into exported HTML. */
function escHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Time helpers
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(mins: number): string {
  let m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${mm.toString().padStart(2, '0')} ${period}`;
}

function addMinutes(time: string, mins: number): string {
  const total = parseTime(time) + mins;
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}



// Generator template
interface TemplateEvent {
  title: string;
  category: string;
  duration: number;
  location: string;
  notes: string;
  offsetFromCeremony: number; // negative = before, positive = after
  scaleWithParty?: boolean;
  scaleWithGuests?: boolean;
}

const TEMPLATE: TemplateEvent[] = [
  { title: 'Hair & Makeup Begins', category: 'Prep', duration: 120, location: 'Getting Ready Suite', notes: 'Bridal party hair and makeup', offsetFromCeremony: -300, scaleWithParty: true },
  { title: 'Photographer Arrives', category: 'Photography', duration: 60, location: 'Getting Ready Suite', notes: 'Detail shots and getting ready', offsetFromCeremony: -180 },
  { title: 'Dress On', category: 'Prep', duration: 30, location: 'Getting Ready Suite', notes: 'Final touches', offsetFromCeremony: -120 },
  { title: 'First Look', category: 'Photography', duration: 30, location: 'Ceremony Venue', notes: 'Private first look with partner', offsetFromCeremony: -90 },
  { title: 'Bridal Party Portraits', category: 'Photography', duration: 60, location: 'Ceremony Venue', notes: 'Bridal party portrait session', offsetFromCeremony: -60, scaleWithParty: true },
  { title: 'Guests Begin Arriving', category: 'Ceremony', duration: 30, location: 'Ceremony Venue', notes: 'Ushers seat guests', offsetFromCeremony: -30 },
  { title: 'Ceremony Begins', category: 'Ceremony', duration: 45, location: 'Ceremony Venue', notes: 'Processional and ceremony', offsetFromCeremony: 0 },
  { title: 'Cocktail Hour', category: 'Reception', duration: 60, location: 'Cocktail Area', notes: 'Couple takes portraits during cocktail hour', offsetFromCeremony: 45, scaleWithGuests: true },
  { title: 'Grand Entrance', category: 'Reception', duration: 15, location: 'Reception Hall', notes: 'Couple and bridal party announced', offsetFromCeremony: 105 },
  { title: 'First Dance', category: 'Reception', duration: 10, location: 'Reception Hall', notes: '', offsetFromCeremony: 120 },
  { title: 'Dinner Served', category: 'Reception', duration: 75, location: 'Reception Hall', notes: 'Plated or buffet dinner', offsetFromCeremony: 130, scaleWithGuests: true },
  { title: 'Toasts & Speeches', category: 'Reception', duration: 30, location: 'Reception Hall', notes: 'Best man, maid of honor, family', offsetFromCeremony: 205 },
  { title: 'Cake Cutting', category: 'Reception', duration: 15, location: 'Reception Hall', notes: '', offsetFromCeremony: 235 },
  { title: 'Open Dancing', category: 'Reception', duration: 180, location: 'Reception Hall', notes: 'Open dance floor', offsetFromCeremony: 250 },
  { title: 'Last Dance', category: 'Reception', duration: 10, location: 'Reception Hall', notes: 'Final dance', offsetFromCeremony: 430 },
  { title: 'Grand Exit', category: 'Reception', duration: 15, location: 'Exit', notes: 'Send-off', offsetFromCeremony: 440 },
];

export default function DayTimeline({ weddingId, isPro, onShowPricing, profile, vendors, bridalParty }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [assignments, setAssignments] = useState<TimelineAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [form, setForm] = useState({ title: '', start_time: '12:00', duration_minutes: 60, location: '', notes: '', category: 'Ceremony' });
  const [formAssignments, setFormAssignments] = useState<TimelineAssignment[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [genCeremonyTime, setGenCeremonyTime] = useState('14:00');
  const [genPreview, setGenPreview] = useState<TimelineEvent[] | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shiftOffer, setShiftOffer] = useState<{ eventId: string; deltaMin: number } | null>(null);
  const [toast, setToast] = useState('');
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const loadEvents = useCallback(async () => {
    if (!weddingId) return;
    setLoading(true);
    const [evRes, asRes] = await Promise.all([
      supabase.from('timeline_events').select('*').eq('wedding_id', weddingId).order('start_time'),
      supabase.from('timeline_assignments').select('*').eq('wedding_id', weddingId),
    ]);
    setEvents((evRes.data || []) as TimelineEvent[]);
    setAssignments((asRes.data || []) as TimelineAssignment[]);

    // Load share state
    const { data: prof } = await supabase.from('wedding_profile').select('timeline_share_slug, timeline_share_enabled').eq('id', weddingId).maybeSingle();
    if (prof) {
      setShareSlug(prof.timeline_share_slug || null);
      setShareEnabled(prof.timeline_share_enabled || false);
    }
    setLoading(false);
  }, [weddingId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Validation
  useEffect(() => {
    const warnings: string[] = [];
    const sorted = [...events].sort((a, b) => a.start_time.localeCompare(b.start_time));

    // Overlap detection
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const aEnd = parseTime(a.start_time) + a.duration_minutes;
      const bStart = parseTime(sorted[i + 1].start_time);
      if (aEnd > bStart) {
        warnings.push(`"${a.title}" overlaps with "${sorted[i + 1].title}"`);
      }
    }

    // Gap detection (>30 min)
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const aEnd = parseTime(a.start_time) + a.duration_minutes;
      const bStart = parseTime(sorted[i + 1].start_time);
      const gap = bStart - aEnd;
      if (gap > 30) {
        warnings.push(`Gap of ${gap} minutes between "${a.title}" and "${sorted[i + 1].title}"`);
      }
    }

    // Vendor double-booking
    const vendorEvents: Record<string, TimelineEvent[]> = {};
    assignments.forEach(a => {
      if (a.assignee_type === 'vendor' && a.vendor_id) {
        const ev = events.find(e => e.id === a.timeline_event_id);
        if (ev) {
          if (!vendorEvents[a.vendor_id]) vendorEvents[a.vendor_id] = [];
          vendorEvents[a.vendor_id].push(ev);
        }
      }
    });
    for (const [vid, evs] of Object.entries(vendorEvents)) {
      const vendor = vendors.find(v => v.id === vid);
      const sortedEvs = [...evs].sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (let i = 0; i < sortedEvs.length - 1; i++) {
        const a = sortedEvs[i];
        const aEnd = parseTime(a.start_time) + a.duration_minutes;
        const bStart = parseTime(sortedEvs[i + 1].start_time);
        if (aEnd > bStart) {
          warnings.push(`${vendor?.business_name || 'Vendor'} is double-booked: "${a.title}" and "${sortedEvs[i + 1].title}"`);
        }
      }
    }

    setValidationWarnings(warnings);
  }, [events, assignments, vendors]);

  // ===== CRUD =====

  async function saveEvent(ev: Omit<TimelineEvent, 'id' | 'wedding_id' | 'created_at' | 'sort_order'> & { id?: string }) {
    if (ev.id) {
      const { data } = await supabase.from('timeline_events').update({
        title: ev.title, start_time: ev.start_time, duration_minutes: ev.duration_minutes,
        location: ev.location, notes: ev.notes, category: ev.category,
      }).eq('id', ev.id).select().single();
      return data as TimelineEvent | null;
    } else {
      const maxSort = events.length > 0 ? Math.max(...events.map(e => e.sort_order)) : 0;
      const { data } = await supabase.from('timeline_events').insert({
        wedding_id: weddingId, title: ev.title, start_time: ev.start_time,
        duration_minutes: ev.duration_minutes, location: ev.location, notes: ev.notes,
        category: ev.category, sort_order: maxSort + 1,
      }).select().single();
      return data as TimelineEvent | null;
    }
  }

  async function saveAssignments(eventId: string, newAssignments: TimelineAssignment[]) {
    // Delete existing
    await supabase.from('timeline_assignments').delete().eq('timeline_event_id', eventId);
    // Insert new
    if (newAssignments.length > 0) {
      const rows = newAssignments.map((a, i) => ({
        timeline_event_id: eventId,
        wedding_id: weddingId,
        assignee_type: a.assignee_type,
        vendor_id: a.vendor_id,
        person_name: a.person_name,
        person_role: a.person_role,
        sort_order: i,
      }));
      await supabase.from('timeline_assignments').insert(rows);
    }
  }

  async function handleSaveForm() {
    if (!form.title) return;
    const saved = await saveEvent({ ...form, id: editingEvent?.id });
    if (saved) {
      if (editingEvent) {
        setEvents(prev => prev.map(e => e.id === saved.id ? saved : e));
      } else {
        setEvents(prev => [...prev, saved].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      }
      await saveAssignments(saved.id, formAssignments);
      // Reload assignments
      const { data: asRes } = await supabase.from('timeline_assignments').select('*').eq('wedding_id', weddingId);
      if (asRes) setAssignments(asRes as TimelineAssignment[]);
    }
    setShowForm(false);
    setEditingEvent(null);
    setFormAssignments([]);
    showToast(editingEvent ? 'Event updated' : 'Event added');
  }

  async function deleteEvent(id: string) {
    await supabase.from('timeline_assignments').delete().eq('timeline_event_id', id);
    await supabase.from('timeline_events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
    setAssignments(prev => prev.filter(a => a.timeline_event_id !== id));
    showToast('Event deleted');
  }

  function openEdit(ev: TimelineEvent) {
    setEditingEvent(ev);
    setForm({ title: ev.title, start_time: ev.start_time, duration_minutes: ev.duration_minutes, location: ev.location, notes: ev.notes, category: ev.category });
    setFormAssignments(assignments.filter(a => a.timeline_event_id === ev.id));
    setShowForm(true);
  }

  function openAdd() {
    setEditingEvent(null);
    setForm({ title: '', start_time: '12:00', duration_minutes: 60, location: '', notes: '', category: 'Ceremony' });
    setFormAssignments([]);
    setShowForm(true);
  }

  // ===== Shift cascade =====

  async function shiftEvent(ev: TimelineEvent, newTime: string) {
    const delta = parseTime(newTime) - parseTime(ev.start_time);
    if (delta === 0) return;

    // Check if there are events after this one
    const afterEvents = events.filter(e => e.start_time > ev.start_time).sort((a, b) => a.start_time.localeCompare(b.start_time));

    if (afterEvents.length > 0 && delta !== 0) {
      setShiftOffer({ eventId: ev.id, deltaMin: delta });
      // Apply the shift to just this event for now
      const updated = { ...ev, start_time: newTime };
      await supabase.from('timeline_events').update({ start_time: newTime }).eq('id', ev.id);
      setEvents(prev => prev.map(e => e.id === ev.id ? updated : e).sort((a, b) => a.start_time.localeCompare(b.start_time)));
    } else {
      const updated = { ...ev, start_time: newTime };
      await supabase.from('timeline_events').update({ start_time: newTime }).eq('id', ev.id);
      setEvents(prev => prev.map(e => e.id === ev.id ? updated : e).sort((a, b) => a.start_time.localeCompare(b.start_time)));
    }
  }

  async function applyShiftCascade() {
    if (!shiftOffer) return;
    const { eventId, deltaMin } = shiftOffer;
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    const toShift = events.filter(e => e.start_time >= ev.start_time && e.id !== eventId);
    // Update all in DB
    const updates = toShift.map(e => {
      const newTime = addMinutes(e.start_time, deltaMin);
      return supabase.from('timeline_events').update({ start_time: newTime }).eq('id', e.id);
    });
    await Promise.all(updates);
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) return e; // already shifted
      if (e.start_time >= ev.start_time) return { ...e, start_time: addMinutes(e.start_time, deltaMin) };
      return e;
    }).sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setShiftOffer(null);
    showToast(`Shifted ${toShift.length + 1} events by ${Math.abs(deltaMin)} min ${deltaMin > 0 ? 'later' : 'earlier'}`);
  }

  function cancelShiftCascade() {
    // Revert the single event shift
    if (!shiftOffer) return;
    const ev = events.find(e => e.id === shiftOffer.eventId);
    if (ev) {
      const originalTime = addMinutes(ev.start_time, -shiftOffer.deltaMin);
      supabase.from('timeline_events').update({ start_time: originalTime }).eq('id', ev.id);
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, start_time: originalTime } : e).sort((a, b) => a.start_time.localeCompare(b.start_time)));
    }
    setShiftOffer(null);
  }

  // ===== Generator =====

  function generateTimeline() {
    const ceremonyMin = parseTime(genCeremonyTime);
    const partySize = bridalParty.length;
    const guestCount = profile?.total_budget ? 100 : 100; // fallback

    const generated: Omit<TimelineEvent, 'id' | 'wedding_id' | 'created_at'>[] = TEMPLATE.map((t, i) => {
      let duration = t.duration;
      if (t.scaleWithParty && partySize > 6) duration += Math.ceil((partySize - 6) / 3) * 15;
      if (t.scaleWithGuests && guestCount > 150) duration += 15;
      const startMin = ceremonyMin + t.offsetFromCeremony;
      const h = Math.floor((startMin % 1440 + 1440) % 1440 / 60);
      const m = startMin % 60;
      return {
        title: t.title,
        start_time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        duration_minutes: duration,
        location: t.location,
        notes: t.notes,
        category: t.category,
        sort_order: i,
      };
    });
    setGenPreview(generated as TimelineEvent[]);
  }

  async function acceptGenerated() {
    if (!genPreview) return;
    // Delete existing events
    await supabase.from('timeline_assignments').delete().in('timeline_event_id', events.map(e => e.id));
    await supabase.from('timeline_events').delete().eq('wedding_id', weddingId);
    // Insert new
    const rows = genPreview.map((g, i) => ({
      wedding_id: weddingId, title: g.title, start_time: g.start_time,
      duration_minutes: g.duration_minutes, location: g.location, notes: g.notes,
      category: g.category, sort_order: i,
    }));
    const { data } = await supabase.from('timeline_events').insert(rows).select();
    if (data) {
      setEvents(data as TimelineEvent[]);
      setAssignments([]);
    }
    setGenPreview(null);
    setShowGenerator(false);
    showToast(`Generated ${genPreview.length} events`);
  }

  function discardGenerated() {
    setGenPreview(null);
    setShowGenerator(false);
  }

  // ===== Export =====

  function exportFullPDF() {
    if (!isPro) { onShowPricing?.(); return; }
    exportTimelineRunSheet(events, assignments, vendors, {
      partner1: profile?.partner1_name || 'Partner 1',
      partner2: profile?.partner2_name || 'Partner 2',
      weddingDate: profile?.wedding_date || null,
    });
  }

  function exportFilteredPDF(filterType: 'vendor' | 'person', filterId: string | null, filterName: string) {
    if (!isPro) { onShowPricing?.(); return; }
    const filteredEventIds = new Set(
      assignments.filter(a => {
        if (filterType === 'vendor') return a.assignee_type === 'vendor' && a.vendor_id === filterId;
        return a.assignee_type === 'person' && a.person_name === filterName;
      }).map(a => a.timeline_event_id)
    );
    const filteredEvents = events.filter(e => filteredEventIds.has(e.id));
    exportTimelineRunSheet(events, assignments, vendors, {
      partner1: profile?.partner1_name || 'Partner 1',
      partner2: profile?.partner2_name || 'Partner 2',
      weddingDate: profile?.wedding_date || null,
    }, { type: filterType, name: filterName, events: filteredEvents });
    setShowExportModal(false);
  }

  // ===== Share =====

  async function enableShare() {
    const slug = shareSlug || randomSuffix(16);
    await supabase.from('wedding_profile').update({ timeline_share_slug: slug, timeline_share_enabled: true }).eq('id', weddingId);
    setShareSlug(slug);
    setShareEnabled(true);
    showToast('Share link enabled');
  }

  async function disableShare() {
    await supabase.from('wedding_profile').update({ timeline_share_enabled: false }).eq('id', weddingId);
    setShareEnabled(false);
    showToast('Share link revoked');
  }

  // ===== Assignments helpers =====

  function addFormAssignment(type: 'vendor' | 'person') {
    if (type === 'vendor') {
      setFormAssignments(prev => [...prev, {
        id: `temp-${Date.now()}`, timeline_event_id: editingEvent?.id || '', wedding_id: weddingId,
        assignee_type: 'vendor', vendor_id: '', person_name: '', person_role: '', sort_order: prev.length,
      }]);
    } else {
      setFormAssignments(prev => [...prev, {
        id: `temp-${Date.now()}`, timeline_event_id: editingEvent?.id || '', wedding_id: weddingId,
        assignee_type: 'person', vendor_id: null, person_name: '', person_role: '', sort_order: prev.length,
      }]);
    }
  }

  function updateFormAssignment(idx: number, updates: Partial<TimelineAssignment>) {
    setFormAssignments(prev => prev.map((a, i) => i === idx ? { ...a, ...updates } : a));
  }

  function removeFormAssignment(idx: number) {
    setFormAssignments(prev => prev.filter((_, i) => i !== idx));
  }

  function getEventAssignments(eventId: string): TimelineAssignment[] {
    return assignments.filter(a => a.timeline_event_id === eventId).sort((a, b) => a.sort_order - b.sort_order);
  }

  function getAssignmentLabel(a: TimelineAssignment): { name: string; role: string } {
    if (a.assignee_type === 'vendor' && a.vendor_id) {
      const v = vendors.find(v => v.id === a.vendor_id);
      return { name: v?.business_name || 'Unknown', role: v?.category || '' };
    }
    return { name: a.person_name, role: a.person_role };
  }

  // All unique people for export filter
  const allPeople = Array.from(new Set(assignments.filter(a => a.assignee_type === 'person').map(a => a.person_name))).filter(Boolean);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9a96e]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Wedding Day Timeline</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">Your complete day-of run sheet</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowShareModal(true)} className="flex items-center gap-1.5 border border-stone-200 text-[#5d4e3e] px-3 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors">
            <Share2 size={14} /> Share
          </button>
          <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 border border-stone-200 text-[#5d4e3e] px-3 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors" title={isPro ? 'Export run sheet' : 'Pro feature'}>
            {!isPro && <Lock size={13} className="text-[#8a6d3b]" />}
            <Download size={14} /> Export
          </button>
          <button onClick={() => { setGenCeremonyTime('14:00'); setGenPreview(null); setShowGenerator(true); }} className="flex items-center gap-1.5 bg-[#c9a96e]/10 text-[#8a6d3b] px-3 py-2 rounded-lg text-sm hover:bg-[#c9a96e]/20 transition-colors">
            <Zap size={14} /> Build my timeline
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030]">
            <Plus size={15} /> Add Event
          </button>
        </div>
      </div>

      {/* Validation warnings */}
      {validationWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-2">
            <AlertTriangle size={15} /> {validationWarnings.length} validation {validationWarnings.length !== 1 ? 'warnings' : 'warning'}
          </div>
          <div className="space-y-1">
            {validationWarnings.map((w, i) => (
              <div key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5">•</span> {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilterCat(filterCat === cat ? null : cat)} className={`text-xs px-3 py-1 rounded-full border transition-opacity ${categoryColors[cat]} ${filterCat && filterCat !== cat ? 'opacity-30' : ''}`}>{cat}</button>
        ))}
      </div>

      {/* Timeline */}
      {events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
          <Clock size={32} className="mx-auto text-stone-300 mb-3" />
          <h3 className="text-[#2a1f15] font-serif text-lg mb-1">No timeline events yet</h3>
          <p className="text-[#6b5d4f] text-sm mb-4">Generate a full day schedule or add events manually.</p>
          <button onClick={() => { setGenCeremonyTime('14:00'); setGenPreview(null); setShowGenerator(true); }} className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030]">
            <Sparkles size={14} /> Build my timeline
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[88px] top-0 bottom-0 w-px bg-stone-200" />
          <div className="space-y-3">
            {events.filter(e => !filterCat || e.category === filterCat).map((event) => {
              const evAssignments = getEventAssignments(event.id);
              const endTime = addMinutes(event.start_time, event.duration_minutes);
              return (
                <div key={event.id} className="relative flex items-start gap-6 group">
                  <div className="w-20 flex-shrink-0 text-right pt-3">
                    <span className="text-[#5d4e3e] text-xs font-medium block">{formatTime(parseTime(event.start_time))}</span>
                    <span className="text-[#6b5d4f] text-[10px]">{event.duration_minutes}m</span>
                  </div>
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-4 z-10 ring-2 ring-white ${dotColors[event.category] || 'bg-stone-400'}`} />
                  <div className="flex-1 bg-white rounded-xl border border-stone-200 p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColors[event.category]}`}>{event.category}</span>
                          <span className="text-[#6b5d4f] text-xs">→ {formatTime(parseTime(endTime))}</span>
                        </div>
                        <h4 className="text-[#2a1f15] font-medium">{event.title}</h4>
                        {event.location && <p className="text-[#5d4e3e] text-xs mt-0.5 flex items-center gap-1"><MapPin size={10} /> {event.location}</p>}
                        {event.notes && <p className="text-[#5d4e3e] text-xs mt-1">{event.notes}</p>}

                        {/* Assignments */}
                        {evAssignments.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <UsersIcon size={12} className="text-[#6b5d4f]" />
                            {evAssignments.map(a => {
                              const { name, role } = getAssignmentLabel(a);
                              return (
                                <div key={a.id} className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-full pl-1 pr-2 py-0.5" title={`${name}${role ? ` — ${role}` : ''}`}>
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold flex-shrink-0" style={{ background: getAvatarColor(name) }}>
                                    {getInitials(name)}
                                  </div>
                                  <span className="text-xs text-[#5d4e3e] truncate max-w-[80px]">{name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                        <input
                          type="time"
                          value={event.start_time}
                          onChange={e => shiftEvent(event, e.target.value)}
                          className="text-xs border border-stone-200 rounded px-1 py-0.5 text-[#5d4e3e] focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
                          title="Change start time"
                        />
                        <button onClick={() => openEdit(event)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-stone-100 rounded text-[#5d4e3e]" title="Edit">
          <ChevronUp size={14} className="rotate-45" />
                        </button>
                        <button onClick={() => deleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 rounded" title="Delete">
                          <Trash2 size={13} className="text-rose-300 hover:text-rose-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shift cascade offer */}
      {shiftOffer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1510] text-white rounded-xl px-5 py-3 shadow-2xl flex items-center gap-4 z-50">
          <span className="text-sm">Shift all later events by {Math.abs(shiftOffer.deltaMin)} min {shiftOffer.deltaMin > 0 ? 'later' : 'earlier'}?</span>
          <button onClick={applyShiftCascade} className="bg-[#8a6d3b] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#7a6030]">Yes, shift all</button>
          <button onClick={cancelShiftCascade} className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/20">Just this one</button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#8a6d3b] text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* Add/Edit event modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#2a1f15] font-serif text-xl">{editingEvent ? 'Edit Event' : 'Add Timeline Event'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Start Time</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
                </div>
                <div>
                  <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Duration (min)</label>
                  <input type="number" min="5" max="600" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Math.max(5, parseInt(e.target.value) || 60) }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
                </div>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Event Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" placeholder="e.g. Ceremony Begins" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" placeholder="e.g. Main Hall" />
                </div>
                <div>
                  <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none" placeholder="Optional details…" />
              </div>

              {/* Assignments */}
              <div className="border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#5d4e3e] text-xs uppercase tracking-wider">Attach vendors & people</label>
                </div>
                <div className="space-y-2">
                  {formAssignments.map((a, idx) => {
                    const { name: _name } = a.assignee_type === 'vendor' ? getAssignmentLabel(a) : { name: a.person_name };
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        {a.assignee_type === 'vendor' ? (
                          <select value={a.vendor_id || ''} onChange={e => updateFormAssignment(idx, { vendor_id: e.target.value })} className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white">
                            <option value="">Select vendor…</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name} ({v.category})</option>)}
                          </select>
                        ) : (
                          <>
                            <input value={a.person_name} onChange={e => updateFormAssignment(idx, { person_name: e.target.value })} placeholder="Name" className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                            <input value={a.person_role} onChange={e => updateFormAssignment(idx, { person_role: e.target.value })} placeholder="Role (optional)" className="w-32 border border-stone-200 rounded-lg px-3 py-2 text-sm" />
                          </>
                        )}
                        <button onClick={() => removeFormAssignment(idx)} className="text-rose-300 hover:text-rose-500 p-1"><X size={14} /></button>
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <button onClick={() => addFormAssignment('vendor')} className="flex items-center gap-1 text-xs border border-stone-200 text-[#5d4e3e] px-3 py-1.5 rounded-lg hover:bg-stone-50">+ Vendor</button>
                    <button onClick={() => addFormAssignment('person')} className="flex items-center gap-1 text-xs border border-stone-200 text-[#5d4e3e] px-3 py-1.5 rounded-lg hover:bg-stone-50">+ Person</button>
                    {bridalParty.length > 0 && (
                      <div className="relative">
                        <select
                          onChange={e => {
                            const bp = bridalParty.find(b => b.id === e.target.value);
                            if (bp) setFormAssignments(prev => [...prev, {
                              id: `temp-${Date.now()}`, timeline_event_id: editingEvent?.id || '', wedding_id: weddingId,
                              assignee_type: 'person', vendor_id: null, person_name: bp.name, person_role: bp.role, sort_order: prev.length,
                            }]);
                            e.target.value = '';
                          }}
                          className="text-xs border border-stone-200 text-[#5d4e3e] px-3 py-1.5 rounded-lg bg-white"
                          defaultValue=""
                        >
                          <option value="" disabled>+ Bridal party…</option>
                          {bridalParty.map(b => <option key={b.id} value={b.id}>{b.name} ({b.role})</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2 rounded-lg text-sm hover:bg-stone-50">Cancel</button>
              <button onClick={handleSaveForm} className="flex-1 bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030]">{editingEvent ? 'Save Changes' : 'Add Event'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Generator modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !genPreview && setShowGenerator(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#2a1f15] font-serif text-xl flex items-center gap-2"><Sparkles size={18} className="text-[#8a6d3b]" /> Build My Timeline</h3>
              <button onClick={() => { setShowGenerator(false); setGenPreview(null); }}><X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" /></button>
            </div>

            {!genPreview ? (
              <>
                <p className="text-[#5d4e3e] text-sm mb-4">Generate a draft schedule from your ceremony time. We'll create events backwards (hair & makeup, first look, portraits) and forwards (cocktail hour, dinner, speeches, dancing, send-off), scaled to your bridal party size.</p>
                <div className="bg-stone-50 rounded-xl p-4 space-y-3 mb-4">
                  <div>
                    <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Ceremony start time</label>
                    <input type="time" value={genCeremonyTime} onChange={e => setGenCeremonyTime(e.target.value)} className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
                    <p className="text-[#6b5d4f] text-xs mt-1">{formatTime(parseTime(genCeremonyTime))}</p>
                  </div>
                  <div className="text-xs text-[#6b5d4f]">
                    <p>Bridal party: {bridalParty.length} members</p>
                    <p>This will generate {TEMPLATE.length} events. You can edit everything after.</p>
                  </div>
                </div>
                {events.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-xs mb-4">
                    This will replace your existing {events.length} events. The generated timeline is a preview — you can discard it to keep your current schedule.
                  </div>
                )}
                <button onClick={generateTimeline} className="w-full bg-[#8a6d3b] text-white py-2.5 rounded-lg text-sm hover:bg-[#7a6030] flex items-center justify-center gap-2">
                  <Zap size={14} /> Generate Preview
                </button>
              </>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                  <span className="text-amber-700 text-xs">Preview — review below. Accept to replace your timeline, or discard to keep your current one.</span>
                </div>
                <div className="border border-stone-200 rounded-xl overflow-hidden mb-4">
                  <div className="max-h-80 overflow-y-auto">
                    {genPreview.map((ev, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-stone-50 last:border-0">
                        <span className="text-xs font-medium text-[#5d4e3e] w-20">{formatTime(parseTime(ev.start_time))}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${categoryColors[ev.category]}`}>{ev.category}</span>
                        <span className="text-sm text-[#2a1f15] flex-1">{ev.title}</span>
                        <span className="text-xs text-[#6b5d4f]">{ev.duration_minutes}m</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={discardGenerated} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2.5 rounded-lg text-sm hover:bg-stone-50">Discard</button>
                  <button onClick={acceptGenerated} className="flex-1 bg-[#8a6d3b] text-white py-2.5 rounded-lg text-sm hover:bg-[#7a6030] flex items-center justify-center gap-2"><Check size={14} /> Accept & Apply</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#2a1f15] font-serif text-xl">Export Run Sheet</h3>
              <button onClick={() => setShowExportModal(false)}><X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" /></button>
            </div>
            <div className="space-y-4">
              <button onClick={() => { exportFullPDF(); setShowExportModal(false); }} className="w-full flex items-center justify-between border border-stone-200 rounded-xl px-4 py-3 hover:bg-stone-50 transition-colors">
                <div className="text-left">
                  <div className="text-sm font-medium text-[#2a1f15]">Full run sheet</div>
                  <div className="text-xs text-[#6b5d4f]">All events with all attachments</div>
                </div>
                <Download size={16} className="text-[#8a6d3b]" />
              </button>

              {vendors.length > 0 && (
                <div>
                  <div className="text-xs text-[#6b5d4f] uppercase tracking-wider mb-2">Per vendor</div>
                  <div className="space-y-2">
                    {vendors.map(v => {
                      const count = assignments.filter(a => a.assignee_type === 'vendor' && a.vendor_id === v.id).length;
                      if (count === 0) return null;
                      return (
                        <button key={v.id} onClick={() => exportFilteredPDF('vendor', v.id, v.business_name)} className="w-full flex items-center justify-between border border-stone-200 rounded-lg px-3 py-2 hover:bg-stone-50 transition-colors">
                          <div className="text-left">
                            <div className="text-sm text-[#2a1f15]">{v.business_name}</div>
                            <div className="text-xs text-[#6b5d4f]">{v.category} · {count} events</div>
                          </div>
                          <Download size={14} className="text-[#8a6d3b]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {allPeople.length > 0 && (
                <div>
                  <div className="text-xs text-[#6b5d4f] uppercase tracking-wider mb-2">Per person</div>
                  <div className="space-y-2">
                    {allPeople.map(name => {
                      const count = assignments.filter(a => a.assignee_type === 'person' && a.person_name === name).length;
                      return (
                        <button key={name} onClick={() => exportFilteredPDF('person', null, name)} className="w-full flex items-center justify-between border border-stone-200 rounded-lg px-3 py-2 hover:bg-stone-50 transition-colors">
                          <div className="text-left">
                            <div className="text-sm text-[#2a1f15]">{name}</div>
                            <div className="text-xs text-[#6b5d4f]">{count} events</div>
                          </div>
                          <Download size={14} className="text-[#8a6d3b]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {vendors.length === 0 && allPeople.length === 0 && (
                <p className="text-sm text-[#6b5d4f] text-center py-4">Attach vendors or people to events first to export filtered copies.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#2a1f15] font-serif text-xl">Share Run Sheet</h3>
              <button onClick={() => setShowShareModal(false)}><X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" /></button>
            </div>
            <p className="text-[#5d4e3e] text-sm mb-4">Generate a read-only link that anyone can view — perfect for sharing with your venue coordinator or vendors.</p>
            {shareEnabled && shareSlug ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                  <Check size={16} className="text-emerald-600" />
                  <span className="text-sm text-emerald-700">Sharing is active</span>
                </div>
                <div className="border border-stone-200 rounded-lg p-3 bg-stone-50">
                  <div className="text-xs text-[#6b5d4f] mb-1">Public link:</div>
                  <div className="flex items-center gap-2">
                    <input readOnly value={`${window.location.origin}/timeline/${shareSlug}`} className="flex-1 text-xs text-[#2a1f15] bg-transparent border-none focus:outline-none" />
                    <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/timeline/${shareSlug}`); showToast('Link copied'); }} className="text-[#8a6d3b] p-1"><Link2 size={14} /></button>
                  </div>
                </div>
                <button onClick={disableShare} className="w-full border border-rose-200 text-rose-600 py-2 rounded-lg text-sm hover:bg-rose-50">Revoke link</button>
              </div>
            ) : (
              <button onClick={enableShare} className="w-full bg-[#8a6d3b] text-white py-2.5 rounded-lg text-sm hover:bg-[#7a6030] flex items-center justify-center gap-2">
                <Share2 size={14} /> Enable sharing
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== PDF Export =====

function exportTimelineRunSheet(
  events: TimelineEvent[],
  assignments: TimelineAssignment[],
  vendors: Vendor[],
  meta: { partner1: string; partner2: string; weddingDate: string | null },
  filter?: { type: 'vendor' | 'person'; name: string; events: TimelineEvent[] }
) {
  const dateStr = meta.weddingDate ? new Date(meta.weddingDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const isFiltered = !!filter;
  const displayEvents = isFiltered ? filter!.events : events;

  function getAssignmentsFor(eventId: string): { name: string; role: string }[] {
    return assignments.filter(a => a.timeline_event_id === eventId).map(a => {
      if (a.assignee_type === 'vendor' && a.vendor_id) {
        const v = vendors.find(v => v.id === a.vendor_id);
        return { name: v?.business_name || 'Unknown', role: v?.category || '' };
      }
      return { name: a.person_name, role: a.person_role };
    });
  }

  const eventsHtml = displayEvents.map(ev => {
    const assigns = getAssignmentsFor(ev.id);
    const assignHtml = assigns.length > 0
      ? `<div style="margin-top:4px;font-size:10px;color:#6a5a4a;">${assigns.map(a => `${escHtml(a.name)}${a.role ? ` (${escHtml(a.role)})` : ''}`).join(' · ')}</div>`
      : '';
    return `
      <tr>
        <td style="font-weight:bold;white-space:nowrap">${formatTime(parseTime(ev.start_time))}</td>
        <td style="color:#9a8a7a;white-space:nowrap">${Number(ev.duration_minutes) || 0}m</td>
        <td><span style="font-size:10px;background:#f5f0ea;padding:1px 6px;border-radius:8px;color:#6a5a4a;">${escHtml(ev.category)}</span></td>
        <td style="font-weight:500">${escHtml(ev.title)}</td>
        <td>${escHtml(ev.location || '—')}</td>
        <td style="color:#9a8a7a;font-size:10px;">${escHtml(ev.notes || '')}</td>
      </tr>
      ${assignHtml ? `<tr><td colspan="6" style="padding-top:0;border:none;padding-bottom:4px;">${assignHtml.replace(/<div/g, '<div').replace(/margin-top:4px/, 'margin-top:0')}</div></td></tr>` : ''}
    `;
  }).join('');

  // Full-day context for filtered export
  const contextHtml = isFiltered ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:11px;color:#9a8a7a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Full-day context</div>
      <table style="font-size:10px;width:100%;color:#9a8a7a;">
        <tbody>
          ${events.map(ev => `<tr><td style="white-space:nowrap">${escHtml(formatTime(parseTime(ev.start_time)))}</td><td>${escHtml(ev.title)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const title = isFiltered ? `${filter!.name}'s Copy` : 'Day-of Run Sheet';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)} — ${escHtml(meta.partner1)} &amp; ${escHtml(meta.partner2)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, serif; color: #2a1f15; background: #fff; }
    .header { background: linear-gradient(135deg, #1a1510 0%, #2e2218 100%); color: #fff; padding: 24px 32px; }
    .header-title { font-size: 22px; font-weight: bold; }
    .header-sub { color: #c9a96e; font-size: 12px; margin-top: 4px; }
    .header-meta { color: #9a8a7a; font-size: 11px; margin-top: 6px; }
    .content { padding: 24px 32px; }
    h2 { font-size: 13px; color: #c9a96e; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    th { background: #f5f0ea; text-align: left; padding: 6px 8px; font-size: 10px; color: #6a5a4a; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 6px 8px; border-bottom: 1px solid #f0ebe3; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
  <div class="header">
    <div class="header-title">${escHtml(meta.partner1)} &amp; ${escHtml(meta.partner2)}</div>
    <div class="header-sub">${escHtml(dateStr)}</div>
    <div class="header-meta">${escHtml(title)}</div>
  </div>
  <div class="content">
    ${contextHtml}
    <h2>${isFiltered ? `${escHtml(filter!.name)}'s Events` : 'Run Sheet'}</h2>
    <table>
      <thead><tr><th>Start</th><th>Dur</th><th>Category</th><th>Event</th><th>Location</th><th>Notes</th></tr></thead>
      <tbody>${eventsHtml}</tbody>
    </table>
  </div>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.addEventListener('load', () => setTimeout(() => win.print(), 500));
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
