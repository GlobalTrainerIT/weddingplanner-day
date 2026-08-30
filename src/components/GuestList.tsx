import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Search, Users, CheckCircle, Clock, X, Mail, Gift, Lock, Zap, Download, ChevronUp, ChevronDown, ChevronsUpDown, Upload, Link2, Home, User, ChevronRight, ArrowRightCircle, SplitSquareHorizontal, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportGuestListPDF } from '../lib/pdfExport';
import { showToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import RsvpSharePanel from './RsvpSharePanel';
import type { Guest, WeddingProfile, Household } from '../types';

const FREE_GUEST_LIMIT = 25;

interface Props {
  guests: Guest[];
  onUpdate: (guests: Guest[]) => void;
  partner1: string;
  partner2: string;
  weddingId: string;
  isPro: boolean;
  onShowPricing: () => void;
  profile: WeddingProfile | null;
  onUpdateProfile: (p: WeddingProfile) => void;
  households: Household[];
  onUpdateHouseholds: (h: Household[]) => void;
}

const emptyGuest: Omit<Guest, 'id' | 'wedding_id'> = {
  first_name: '', last_name: '', email: '', phone: '', address: '',
  group_name: '', side: 'both', rsvp_status: 'pending', meal_choice: '',
  has_plus_one: false, plus_one_name: '', plus_one_rsvp: 'pending',
  table_number: null, invite_sent: false, thank_you_sent: false,
  gift_received: '', dietary_restrictions: '', notes: '',
  household_id: null, age_group: 'adult', relationship: '',
  plus_one_allowed: false, seat_number: null,
};

const RSVP_OPTIONS = [
  { value: 'pending', label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  { value: 'confirmed', label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
  { value: 'declined', label: 'Declined', cls: 'bg-rose-100 text-rose-700' },
];

function RsvpDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const current = RSVP_OPTIONS.find(o => o.value === value) ?? RSVP_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setOpen(v => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${current.cls}`}
      >
        {current.label}
        <ChevronDown size={10} className="flex-shrink-0" />
      </button>
      {open && createPortal(
        <div
          className="fixed z-[200] bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden min-w-[130px]"
          style={{ top: pos.top, left: pos.left }}
        >
          {RSVP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-stone-50 transition-colors flex items-center gap-2 ${value === opt.value ? 'bg-stone-50' : ''}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.value === 'confirmed' ? 'bg-emerald-400' : opt.value === 'declined' ? 'bg-rose-400' : 'bg-amber-400'}`} />
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

type SortKey = 'name' | 'rsvp_status' | 'table_number' | null;
type SortDir = 'asc' | 'desc';

function SortButton({ col, sort, dir, onClick }: { col: SortKey; sort: SortKey; dir: SortDir; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-0.5 hover:text-[#8a6d3b] transition-colors group">
      {sort === col ? (dir === 'asc' ? <ChevronUp size={12} className="text-[#8a6d3b]" /> : <ChevronDown size={12} className="text-[#8a6d3b]" />) : <ChevronsUpDown size={12} className="opacity-40 group-hover:opacity-100" />}
    </button>
  );
}

export default function GuestList({ guests, onUpdate, partner1, partner2, weddingId, isPro, onShowPricing, profile, onUpdateProfile, households, onUpdateHouseholds }: Props) {
  const [search, setSearch] = useState('');
  const [showRsvpPanel, setShowRsvpPanel] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyGuest });
  const [editId, setEditId] = useState<string | null>(null);
  const [filterRsvp, setFilterRsvp] = useState('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sortCol, setSortCol] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [viewMode, setViewMode] = useState<'household' | 'guest'>('household');
  const [expandedHouseholds, setExpandedHouseholds] = useState<Set<string>>(new Set());
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [newHouseholdAddress, setNewHouseholdAddress] = useState('');
  const [newHouseholdInviteMethod, setNewHouseholdInviteMethod] = useState<'email' | 'post'>('post');
  const [showNewHouseholdForm, setShowNewHouseholdForm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const confirmed = guests.filter(g => g.rsvp_status === 'confirmed').length;
  const declined = guests.filter(g => g.rsvp_status === 'declined').length;
  const pending = guests.filter(g => g.rsvp_status === 'pending').length;
  const plusOnes = guests.filter(g => g.has_plus_one && g.plus_one_rsvp === 'confirmed').length;
  const totalAttending = confirmed + plusOnes;
  const inviteSent = guests.filter(g => g.invite_sent).length;
  const thankYouSent = guests.filter(g => g.thank_you_sent).length;

  const atLimit = !isPro && guests.length >= FREE_GUEST_LIMIT;

  const filtered = guests.filter(g => {
    const matchSearch = search === '' ||
      `${g.first_name} ${g.last_name} ${g.email} ${g.group_name}`.toLowerCase().includes(search.toLowerCase());
    const matchRsvp = filterRsvp === 'all' || g.rsvp_status === filterRsvp;
    return matchSearch && matchRsvp;
  }).sort((a, b) => {
    if (!sortCol) return 0;
    let va: string | number = '';
    let vb: string | number = '';
    if (sortCol === 'name') { va = `${a.first_name} ${a.last_name}`.toLowerCase(); vb = `${b.first_name} ${b.last_name}`.toLowerCase(); }
    if (sortCol === 'rsvp_status') { va = a.rsvp_status; vb = b.rsvp_status; }
    if (sortCol === 'table_number') { va = a.table_number ?? 9999; vb = b.table_number ?? 9999; }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (col: SortKey) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const allSelected = filtered.length > 0 && filtered.every(g => selected.has(g.id));
  const someSelected = selected.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(g => g.id)));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openAdd = () => {
    if (atLimit) { onShowPricing(); return; }
    setForm({ ...emptyGuest });
    setEditId(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (g: Guest) => {
    setForm({
      first_name: g.first_name, last_name: g.last_name, email: g.email, phone: g.phone,
      address: g.address, group_name: g.group_name, side: g.side, rsvp_status: g.rsvp_status,
      meal_choice: g.meal_choice, has_plus_one: g.has_plus_one, plus_one_name: g.plus_one_name,
      plus_one_rsvp: g.plus_one_rsvp, table_number: g.table_number, invite_sent: g.invite_sent,
      thank_you_sent: g.thank_you_sent, gift_received: g.gift_received,
      dietary_restrictions: g.dietary_restrictions, notes: g.notes,
      household_id: g.household_id, age_group: g.age_group, relationship: g.relationship,
      plus_one_allowed: g.plus_one_allowed, seat_number: g.seat_number,
    });
    setEditId(g.id);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.first_name.trim()) { setError('First name is required.'); return; }
    setSaving(true);
    setError('');
    const payload = { wedding_id: weddingId, ...form };
    if (editId) {
      const { data, error: err } = await supabase.from('guests').update(payload).eq('id', editId).select().single();
      if (err) { console.error(err); setError('We could not save this guest. Please try again.'); setSaving(false); return; }
      if (data) { onUpdate(guests.map(g => g.id === editId ? data : g)); showToast('Guest updated'); }
    } else {
      const { data, error: err } = await supabase.from('guests').insert(payload).select().single();
      if (err) { console.error(err); setError(guests.length >= FREE_GUEST_LIMIT ? "You've reached the guest limit on the free plan." : 'We could not save this guest. Please try again.'); setSaving(false); return; }
      if (data) { onUpdate([...guests, data]); showToast('Guest added'); }
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
  };

  // ===== Household helpers =====

  const createHousehold = async (name: string, address: string, inviteMethod: 'email' | 'post'): Promise<Household | null> => {
    const { data, error: err } = await supabase
      .from('households')
      .insert({ wedding_id: weddingId, name, address, invite_method: inviteMethod })
      .select()
      .single();
    if (err) { console.error(err); setError('We could not create this household. Please try again.'); return null; }
    if (data) onUpdateHouseholds([...households, data]);
    return data;
  };

  const updateHousehold = async (id: string, updates: Partial<Household>) => {
    const { data } = await supabase.from('households').update(updates).eq('id', id).select().single();
    if (data) onUpdateHouseholds(households.map(h => h.id === id ? data : h));
  };

  const toggleHouseholdExpand = (id: string) => {
    setExpandedHouseholds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const createHouseholdFromSelected = async () => {
    const selectedGuests = guests.filter(g => selected.has(g.id));
    if (selectedGuests.length === 0) return;
    const lastName = selectedGuests[0].last_name || 'Household';
    const name = `The ${lastName}s`;
    const address = selectedGuests.find(g => g.address)?.address || '';
    const newH = await createHousehold(name, address, 'post');
    if (!newH) return;
    const ids = Array.from(selected);
    await supabase.from('guests').update({ household_id: newH.id }).in('id', ids);
    onUpdate(guests.map(g => ids.includes(g.id) ? { ...g, household_id: newH.id } : g));
    setSelected(new Set());
    showToast(`Created "${name}" with ${ids.length} member${ids.length !== 1 ? 's' : ''}`);
  };

  const moveSelectedToHousehold = async (householdId: string) => {
    const ids = Array.from(selected);
    await supabase.from('guests').update({ household_id: householdId }).in('id', ids);
    onUpdate(guests.map(g => ids.includes(g.id) ? { ...g, household_id: householdId } : g));
    setSelected(new Set());
    setShowMoveModal(false);
    const h = households.find(hh => hh.id === householdId);
    showToast(`Moved ${ids.length} guest${ids.length !== 1 ? 's' : ''} to ${h?.name || 'household'}`);
  };

  const splitSelectedFromHousehold = async () => {
    const ids = Array.from(selected);
    await supabase.from('guests').update({ household_id: null }).in('id', ids);
    onUpdate(guests.map(g => ids.includes(g.id) ? { ...g, household_id: null } : g));
    setSelected(new Set());
    showToast(`${ids.length} guest${ids.length !== 1 ? 's' : ''} moved to individual`);
  };

  const toggleHouseholdInviteSent = async (h: Household) => {
    await updateHousehold(h.id, { invite_sent: !h.invite_sent });
  };

  const toggleHouseholdThankYouSent = async (h: Household) => {
    await updateHousehold(h.id, { thank_you_sent: !h.thank_you_sent });
  };

  const doDelete = async (id: string) => {
    const deleted = guests.find(g => g.id === id);
    const afterDelete = guests.filter(g => g.id !== id);
    await supabase.from('guests').delete().eq('id', id);
    onUpdate(afterDelete);
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    setConfirmDelete(null);
    showToast(`${deleted ? `${deleted.first_name} ${deleted.last_name}` : 'Guest'} deleted`, 'deleted', deleted ? async () => {
      const { data } = await supabase.from('guests').upsert(deleted).select().single();
      if (data) onUpdate([...afterDelete, data]);
      else showToast('Could not restore guest', 'error');
    } : undefined);
  };

  const doBulkDelete = async () => {
    const ids = Array.from(selected);
    await supabase.from('guests').delete().in('id', ids);
    onUpdate(guests.filter(g => !ids.includes(g.id)));
    setSelected(new Set());
    setConfirmBulkDelete(false);
    showToast(`${ids.length} guest${ids.length !== 1 ? 's' : ''} deleted`, 'deleted');
  };

  const bulkToggleField = async (field: 'invite_sent' | 'thank_you_sent', value: boolean) => {
    const ids = Array.from(selected);
    await supabase.from('guests').update({ [field]: value }).in('id', ids);
    onUpdate(guests.map(g => ids.includes(g.id) ? { ...g, [field]: value } : g));
    showToast(`Updated ${ids.length} guest${ids.length !== 1 ? 's' : ''}`);
  };

  const toggleField = async (id: string, field: 'invite_sent' | 'thank_you_sent', current: boolean) => {
    const { data } = await supabase.from('guests').update({ [field]: !current }).eq('id', id).select().single();
    if (data) onUpdate(guests.map(g => g.id === id ? data : g));
  };

  const updateRsvp = async (id: string, status: string) => {
    const { data } = await supabase.from('guests').update({ rsvp_status: status }).eq('id', id).select().single();
    if (data) onUpdate(guests.map(g => g.id === id ? data : g));
    showToast('RSVP updated');
  };

  return (
    <div className="space-y-6">
      {/* Confirm delete single */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Guest?"
          message={`Are you sure you want to delete ${confirmDelete.name}? This cannot be undone.`}
          onConfirm={() => doDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {/* Confirm bulk delete */}
      {confirmBulkDelete && (
        <ConfirmDialog
          title={`Delete ${selected.size} Guest${selected.size !== 1 ? 's' : ''}?`}
          message={`Are you sure you want to delete ${selected.size} selected guest${selected.size !== 1 ? 's' : ''}? This cannot be undone.`}
          onConfirm={doBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Guest List</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">
            {isPro
              ? 'Manage all your wedding guests'
              : <span>{guests.length} / {FREE_GUEST_LIMIT} guests <span className="text-[#8a6d3b]">(free limit)</span></span>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRsvpPanel(true)}
            className={`flex items-center gap-2 border px-3 py-2 rounded-lg text-sm transition-colors ${profile?.rsvp_enabled ? 'border-[#c9a96e]/40 bg-[#c9a96e]/5 text-[#b8955a]' : 'border-stone-200 text-[#5d4e3e] hover:bg-stone-50'}`}
          >
            <Link2 size={14} /> RSVP Page
          </button>
          <button
            onClick={() => setShowCsvImport(true)}
            className="flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-3 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={() => {
              if (!isPro) { onShowPricing(); return; }
              exportGuestListPDF(guests, { partner1, partner2, weddingDate: null });
            }}
            className="flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-3 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors"
            title={isPro ? 'Export to PDF' : 'Pro feature'}
          >
            {!isPro && <Lock size={13} className="text-[#8a6d3b]" />}
            <Download size={14} /> Export PDF
          </button>
          {atLimit ? (
            <button
              onClick={onShowPricing}
              className="flex items-center gap-2 bg-gradient-to-r from-[#c9a96e] to-[#b8955a] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              <Lock size={14} /> Upgrade for unlimited guests
            </button>
          ) : (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030] transition-colors"
            >
              <Plus size={15} /> Add Guest
            </button>
          )}
        </div>
      </div>

      {atLimit && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#1a1510] to-[#2e2218] border border-[#c9a96e]/30 rounded-xl px-5 py-4">
          <Lock size={18} className="text-[#8a6d3b] flex-shrink-0" />
          <div className="flex-1">
            <div className="text-white text-sm font-medium">You've reached the 25 guest limit on the free plan</div>
            <div className="text-[#a08050] text-xs mt-0.5">Upgrade to Pro for unlimited guests</div>
          </div>
          <button onClick={onShowPricing} className="flex items-center gap-1.5 bg-[#8a6d3b] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#7a6030] transition-colors font-medium whitespace-nowrap">
            <Zap size={12} /> Upgrade to Pro
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Invited" value={guests.length} icon={<Users size={18} />} color="stone" />
        <StatCard label="Confirmed" value={confirmed} sub={plusOnes > 0 ? `+ ${plusOnes} plus ones` : undefined} icon={<CheckCircle size={18} />} color="emerald" />
        <StatCard label="Pending" value={pending} icon={<Clock size={18} />} color="amber" />
        <StatCard label="Total Attending" value={totalAttending} sub={`${declined} declined`} icon={<Users size={18} />} color="sky" />
      </div>

      {/* Progress trackers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniProgress label="Invites Sent" current={inviteSent} total={guests.length} color="#c9a96e" />
        <MiniProgress label="Thank You Cards" current={thankYouSent} total={confirmed} color="#7aaa8a" />
        <MiniProgress label="RSVPs Received" current={confirmed + declined} total={guests.length} color="#e88c8c" />
      </div>

      {/* Meal summary — caterer headcount card */}
      {totalAttending > 0 && (() => {
        const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed');
        const mealMap: Record<string, number> = {};
        for (const g of confirmedGuests) {
          const m = g.meal_choice?.trim() || 'No preference';
          mealMap[m] = (mealMap[m] ?? 0) + 1;
        }
        const hasMeals = Object.keys(mealMap).some(k => k !== 'No preference');
        return (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-emerald-800 font-medium text-sm">Final Headcount & Meals</h3>
                <p className="text-emerald-600 text-xs mt-0.5">Use this when sending the final count to your caterer</p>
              </div>
              <div className="text-right">
                <div className="text-emerald-900 font-serif text-2xl font-bold">{totalAttending}</div>
                <div className="text-emerald-600 text-xs">total attending</div>
              </div>
            </div>
            {hasMeals ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(mealMap).sort((a, b) => b[1] - a[1]).map(([meal, count]) => (
                  <div key={meal} className="bg-white border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <span className="text-emerald-800 font-semibold text-sm">{count}</span>
                    <span className="text-emerald-700 text-xs">{meal}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-emerald-600 text-xs mt-1">Add meal choices when editing guests to get a per-meal breakdown.</p>
            )}
          </div>
        );
      })()}

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or group…"
            className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'confirmed', 'pending', 'declined'].map(f => (
            <button
              key={f}
              onClick={() => setFilterRsvp(f)}
              className={`px-3 py-2 rounded-lg text-xs capitalize transition-colors ${
                filterRsvp === f ? 'bg-[#8a6d3b] text-white' : 'border border-stone-200 text-[#5d4e3e] hover:bg-stone-50'
              }`}
            >
              {f === 'all' ? `All (${filtered.length})` : f}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions toolbar */}
      {someSelected && (
        <div className="flex items-center gap-3 bg-[#1a1510] border border-[#c9a96e]/20 rounded-xl px-4 py-3 flex-wrap">
          <span className="text-[#8a6d3b] text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2 flex-wrap ml-auto">
            <button onClick={createHouseholdFromSelected} className="text-xs bg-white/10 text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5">
              <Home size={12} /> Create Household
            </button>
            <button onClick={() => setShowMoveModal(true)} className="text-xs bg-white/10 text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5">
              <ArrowRightCircle size={12} /> Move to Household
            </button>
            <button onClick={splitSelectedFromHousehold} className="text-xs bg-white/10 text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5">
              <SplitSquareHorizontal size={12} /> Split from Household
            </button>
            <button onClick={() => bulkToggleField('invite_sent', true)} className="text-xs bg-white/10 text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5">
              <Mail size={12} /> Mark Invite Sent
            </button>
            <button onClick={() => bulkToggleField('thank_you_sent', true)} className="text-xs bg-white/10 text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5">
              <Gift size={12} /> Mark Thank You Sent
            </button>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="text-xs bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={12} /> Delete Selected
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-white/50 hover:text-white transition-colors px-2">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1 w-fit">
        <button onClick={() => setViewMode('household')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'household' ? 'bg-white text-[#2a1f15] shadow-sm' : 'text-[#6b5d4f]'}`}>
          <Home size={13} /> By Household
        </button>
        <button onClick={() => setViewMode('guest')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'guest' ? 'bg-white text-[#2a1f15] shadow-sm' : 'text-[#6b5d4f]'}`}>
          <User size={13} /> By Guest
        </button>
      </div>

      {/* Guest table — By Guest view */}
      {viewMode === 'guest' && (
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100 text-[#5d4e3e] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-[#c9a96e] w-4 h-4 cursor-pointer" />
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="flex items-center gap-1">
                    Name <SortButton col="name" sort={sortCol} dir={sortDir} onClick={() => toggleSort('name')} />
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="flex items-center gap-1">
                    RSVP <SortButton col="rsvp_status" sort={sortCol} dir={sortDir} onClick={() => toggleSort('rsvp_status')} />
                  </span>
                </th>
                <th className="px-4 py-3 text-left">Meal</th>
                <th className="px-4 py-3 text-center">Plus One</th>
                <th className="px-4 py-3 text-center">
                  <span className="flex items-center justify-center gap-1">
                    Table <SortButton col="table_number" sort={sortCol} dir={sortDir} onClick={() => toggleSort('table_number')} />
                  </span>
                </th>
                <th className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 justify-center" title="Invite Sent">
                    <Mail size={14} /> <span className="hidden sm:inline">Invite sent</span>
                  </span>
                </th>
                <th className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 justify-center" title="Thank You Sent">
                    <Gift size={14} /> <span className="hidden sm:inline">Thank you</span>
                  </span>
                </th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} className={`border-t border-stone-50 hover:bg-stone-50/50 transition-colors ${selected.has(g.id) ? 'bg-[#c9a96e]/5' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggleSelect(g.id)} className="accent-[#c9a96e] w-4 h-4 cursor-pointer" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#2a1f15]">{g.first_name} {g.last_name}</div>
                    {g.group_name && <div className="text-xs text-[#6b5d4f]">{g.group_name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <RsvpDropdown value={g.rsvp_status} onChange={status => updateRsvp(g.id, status)} />
                  </td>
                  <td className="px-4 py-3 text-[#5d4e3e]">{g.meal_choice || '—'}</td>
                  <td className="px-4 py-3 text-center text-[#5d4e3e] text-xs">{g.has_plus_one ? (g.plus_one_name || 'Yes') : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {g.table_number
                      ? <span className="bg-[#c9a96e]/20 text-[#8a6a30] px-2 py-0.5 rounded text-xs font-medium">T{g.table_number}</span>
                      : <span className="text-[#6b5d4f] text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleField(g.id, 'invite_sent', g.invite_sent)} className={`w-5 h-5 rounded border-2 mx-auto flex items-center justify-center transition-colors ${g.invite_sent ? 'bg-[#c9a96e] border-[#c9a96e]' : 'border-stone-300 hover:border-[#c9a96e]'}`}>
                      {g.invite_sent && <CheckCircle size={12} className="text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleField(g.id, 'thank_you_sent', g.thank_you_sent)} className={`w-5 h-5 rounded border-2 mx-auto flex items-center justify-center transition-colors ${g.thank_you_sent ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300 hover:border-emerald-400'}`}>
                      {g.thank_you_sent && <CheckCircle size={12} className="text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => openEdit(g)} className="text-[#8a6d3b] text-xs font-medium hover:underline">Edit</button>
                      <button onClick={() => setConfirmDelete({ id: g.id, name: `${g.first_name} ${g.last_name}` })}>
                        <Trash2 size={13} className="text-rose-300 hover:text-rose-600 transition-colors" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-[#6b5d4f]">
                    {guests.length === 0 ? 'No guests yet. Click "Add Guest" to get started!' : 'No guests match your search or filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Household view */}
      {viewMode === 'household' && (
        <HouseholdView
          guests={filtered}
          households={households}
          expanded={expandedHouseholds}
          onToggleExpand={toggleHouseholdExpand}
          onToggleInviteSent={toggleHouseholdInviteSent}
          onToggleThankYouSent={toggleHouseholdThankYouSent}
          onEditGuest={openEdit}
          onDeleteGuest={(id, name) => setConfirmDelete({ id, name })}
          onUpdateRsvp={updateRsvp}
          selected={selected}
          onToggleSelect={toggleSelect}
        />
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#2a1f15] font-serif text-xl">{editId ? 'Edit Guest' : 'Add Guest'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" /></button>
            </div>
            {error && <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              {/* Household picker */}
              <div className="col-span-2">
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Household</label>
                <div className="flex gap-2">
                  <select
                    value={form.household_id || ''}
                    onChange={e => setForm(f => ({ ...f, household_id: e.target.value || null }))}
                    className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                  >
                    <option value="">Individual (no household)</option>
                    {households.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  {!showNewHouseholdForm ? (
                    <button
                      type="button"
                      onClick={() => setShowNewHouseholdForm(true)}
                      className="flex items-center gap-1 text-xs border border-stone-200 text-[#5d4e3e] px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap"
                    >
                      <Home size={12} /> New
                    </button>
                  ) : null}
                </div>
                {showNewHouseholdForm && (
                  <div className="mt-2 border border-stone-200 rounded-lg p-3 bg-stone-50/50 space-y-2">
                    <input
                      value={newHouseholdName}
                      onChange={e => setNewHouseholdName(e.target.value)}
                      placeholder="Household name (e.g. The Whitfields)"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 bg-white"
                    />
                    <input
                      value={newHouseholdAddress}
                      onChange={e => setNewHouseholdAddress(e.target.value)}
                      placeholder="Mailing address (optional)"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 bg-white"
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-[#5d4e3e] cursor-pointer">
                        <input type="radio" checked={newHouseholdInviteMethod === 'post'} onChange={() => setNewHouseholdInviteMethod('post')} className="accent-[#c9a96e]" />
                        Invite by post
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-[#5d4e3e] cursor-pointer">
                        <input type="radio" checked={newHouseholdInviteMethod === 'email'} onChange={() => setNewHouseholdInviteMethod('email')} className="accent-[#c9a96e]" />
                        Invite by email
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newHouseholdName.trim()) return;
                          const h = await createHousehold(newHouseholdName.trim(), newHouseholdAddress.trim(), newHouseholdInviteMethod);
                          if (h) {
                            setForm(f => ({ ...f, household_id: h.id }));
                            setNewHouseholdName('');
                            setNewHouseholdAddress('');
                            setShowNewHouseholdForm(false);
                            showToast(`Created "${h.name}"`);
                          }
                        }}
                        className="bg-[#8a6d3b] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#7a6030] transition-colors"
                      >Create</button>
                      <button
                        type="button"
                        onClick={() => { setShowNewHouseholdForm(false); setNewHouseholdName(''); setNewHouseholdAddress(''); }}
                        className="border border-stone-200 text-[#5d4e3e] text-xs px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">First Name <span className="text-rose-500">*</span></label>
                <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="e.g. Jane" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" autoFocus />
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Last Name</label>
                <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="e.g. Smith" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@email.com" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Group / Family</label>
                <input value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))} placeholder="e.g. Smith Family" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Side</label>
                <select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                  <option value="partner1">{partner1 || 'Partner 1'}</option>
                  <option value="partner2">{partner2 || 'Partner 2'}</option>
                  <option value="both">Both / Mutual</option>
                </select>
              </div>
              <div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Age Group</label>
                <select value={form.age_group} onChange={e => setForm(f => ({ ...f, age_group: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                  <option value="adult">Adult</option>
                  <option value="child">Child</option>
                  <option value="infant">Infant</option>
                </select>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Relationship</label>
                <input value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} placeholder="e.g. Cousin, College friend" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">RSVP Status</label>
                <select value={form.rsvp_status} onChange={e => setForm(f => ({ ...f, rsvp_status: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Meal Choice</label>
                <select value={form.meal_choice} onChange={e => setForm(f => ({ ...f, meal_choice: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                  <option value="">Not selected</option>
                  <option value="Chicken">Chicken</option>
                  <option value="Fish">Fish</option>
                  <option value="Beef">Beef</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Kids Meal">Kids Meal</option>
                </select>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Table Number</label>
                <input type="number" min="1" value={form.table_number ?? ''} onChange={e => setForm(f => ({ ...f, table_number: e.target.value ? parseInt(e.target.value) : null }))} placeholder="e.g. 5" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Dietary Restrictions</label>
                <input value={form.dietary_restrictions} onChange={e => setForm(f => ({ ...f, dietary_restrictions: e.target.value }))} placeholder="e.g. Gluten-free" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={form.has_plus_one} onChange={e => setForm(f => ({ ...f, has_plus_one: e.target.checked }))} className="accent-[#c9a96e] w-4 h-4" />
                  <span className="text-[#5d4e3e] text-sm">Has a plus one</span>
                </label>
                {form.has_plus_one && (
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div>
                      <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Plus One Name</label>
                      <input value={form.plus_one_name} onChange={e => setForm(f => ({ ...f, plus_one_name: e.target.value }))} placeholder="Full name" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
                    </div>
                    <div>
                      <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Plus One RSVP</label>
                      <select value={form.plus_one_rsvp} onChange={e => setForm(f => ({ ...f, plus_one_rsvp: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="declined">Declined</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Mailing Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="For invitation mailing" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div className="col-span-2">
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Gift Received</label>
                <input value={form.gift_received} onChange={e => setForm(f => ({ ...f, gift_received: e.target.value }))} placeholder="Description or value of gift" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div className="col-span-2 flex gap-6">
                <label className="flex items-center gap-2 text-sm text-[#5d4e3e] cursor-pointer">
                  <input type="checkbox" checked={form.invite_sent} onChange={e => setForm(f => ({ ...f, invite_sent: e.target.checked }))} className="accent-[#c9a96e] w-4 h-4" />
                  Invite Sent
                </label>
                <label className="flex items-center gap-2 text-sm text-[#5d4e3e] cursor-pointer">
                  <input type="checkbox" checked={form.thank_you_sent} onChange={e => setForm(f => ({ ...f, thank_you_sent: e.target.checked }))} className="accent-[#c9a96e] w-4 h-4" />
                  Thank You Card Sent
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#8a6d3b] text-white py-2.5 rounded-lg text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : editId ? 'Update Guest' : 'Add Guest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Household modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowMoveModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#2a1f15] font-serif text-lg">Move to Household</h3>
              <button onClick={() => setShowMoveModal(false)}><X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" /></button>
            </div>
            <p className="text-sm text-[#5d4e3e] mb-3">Move {selected.size} selected guest{selected.size !== 1 ? 's' : ''} to an existing household:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {households.length === 0 ? (
                <p className="text-sm text-[#6b5d4f] py-4 text-center">No households yet. Use "Create Household" instead.</p>
              ) : households.map(h => (
                <button
                  key={h.id}
                  onClick={() => moveSelectedToHousehold(h.id)}
                  className="w-full flex items-center justify-between border border-stone-200 rounded-lg px-3 py-2.5 hover:bg-stone-50 transition-colors text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-[#2a1f15]">{h.name}</div>
                    <div className="text-xs text-[#6b5d4f]">{guests.filter(g => g.household_id === h.id).length} member{guests.filter(g => g.household_id === h.id).length !== 1 ? 's' : ''}</div>
                  </div>
                  <ArrowRightCircle size={16} className="text-[#8a6d3b]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RSVP Share Panel */}
      {profile && (
        <RsvpSharePanel
          open={showRsvpPanel}
          onClose={() => setShowRsvpPanel(false)}
          profile={profile}
          guests={guests}
          onProfileUpdated={onUpdateProfile}
        />
      )}

      {/* CSV Import Modal */}
      {showCsvImport && (
        <CsvImportModal
          weddingId={weddingId}
          onClose={() => setShowCsvImport(false)}
          onImport={imported => {
            onUpdate([...guests, ...imported]);
            setShowCsvImport(false);
            showToast(`${imported.length} guest${imported.length !== 1 ? 's' : ''} imported`);
          }}
          existingHouseholds={households}
          onUpdateHouseholds={onUpdateHouseholds}
        />
      )}
    </div>
  );
}

const CSV_TEMPLATE = `First Name,Last Name,Email,Phone,Dietary Restrictions,Plus One,Table Number,RSVP Status,Address
Jane,Smith,jane@email.com,(555) 123-4567,Vegetarian,Yes,1,confirmed,123 Main St
John,Smith,john@email.com,,Gluten-free,No,1,pending,123 Main St
Bob,Whitfield,bob@email.com,,No,No,2,confirmed,456 Oak Ave
Mary,Whitfield,mary@email.com,,Vegan,No,2,pending,456 Oak Ave`;

function parseCsv(text: string): { row: Record<string, string>; error?: string }[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''));
  return lines.slice(1).map((line, i) => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (vals.length < 2) return { row: {}, error: `Row ${i + 2}: too few columns` };
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
    if (!row.first_name && !row['first_name']) return { row, error: `Row ${i + 2}: missing first name` };
    return { row };
  });
}

function CsvImportModal({ weddingId, onClose, onImport, existingHouseholds: _existingHouseholds, onUpdateHouseholds }: {
  weddingId: string;
  onClose: () => void;
  onImport: (guests: Guest[]) => void;
  existingHouseholds: Household[];
  onUpdateHouseholds: (h: Household[]) => void;
}) {
  const [parsed, setParsed] = useState<{ row: Record<string, string>; error?: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState<'upload' | 'review-households'>('upload');
  const [suggestedHouseholds, setSuggestedHouseholds] = useState<{ name: string; address: string; guestIndices: number[] }[]>([]);
  const [acceptedHouseholds, setAcceptedHouseholds] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setParsed(parseCsv(text));
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'guest-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = parsed.filter(p => !p.error);

  // Auto-suggest households by matching surname + address
  const suggestHouseholds = () => {
    const groups: { key: string; name: string; address: string; indices: number[] }[] = [];
    validRows.forEach(({ row }, idx) => {
      const lastName = (row.last_name || row['last_name'] || '').trim().toLowerCase();
      const address = (row.address || '').trim().toLowerCase();
      if (!lastName) return;
      const key = address ? `${lastName}|${address}` : lastName;
      const existing = groups.find(g => g.key === key);
      if (existing) {
        existing.indices.push(idx);
      } else {
        groups.push({
          key,
          name: `The ${(row.last_name || '').charAt(0).toUpperCase() + (row.last_name || '').slice(1).toLowerCase()}s`,
          address: row.address || '',
          indices: [idx],
        });
      }
    });
    setSuggestedHouseholds(groups.filter(g => g.indices.length >= 2).map(g => ({ name: g.name, address: g.address, guestIndices: g.indices })));
    setAcceptedHouseholds(new Set(groups.filter(g => g.indices.length >= 2).map((_, i) => i)));
    setStep('review-households');
  };

  const handleImport = async () => {
    setImporting(true);

    // Create accepted households
    const createdHouseholdMap: Record<number, string> = {};
    for (let i = 0; i < suggestedHouseholds.length; i++) {
      if (!acceptedHouseholds.has(i)) continue;
      const sug = suggestedHouseholds[i];
      const { data } = await supabase
        .from('households')
        .insert({ wedding_id: weddingId, name: sug.name, address: sug.address, invite_method: 'post' })
        .select()
        .single();
      if (data) createdHouseholdMap[i] = data.id;
    }

    const toInsert = validRows.map(({ row }, idx) => {
      let householdId: string | null = null;
      for (let i = 0; i < suggestedHouseholds.length; i++) {
        if (acceptedHouseholds.has(i) && suggestedHouseholds[i].guestIndices.includes(idx)) {
          householdId = createdHouseholdMap[i] || null;
        }
      }
      return {
        wedding_id: weddingId,
        first_name: row.first_name || row['first_name'] || '',
        last_name: row.last_name || row['last_name'] || '',
        email: row.email || '',
        phone: row.phone || '',
        dietary_restrictions: row.dietary_restrictions || '',
        has_plus_one: (row.plus_one || '').toLowerCase() === 'yes',
        plus_one_name: '', plus_one_rsvp: 'pending',
        table_number: row.table_number ? parseInt(row.table_number) || null : null,
        rsvp_status: ['confirmed', 'declined', 'pending'].includes((row.rsvp_status || '').toLowerCase()) ? (row.rsvp_status || 'pending').toLowerCase() : 'pending',
        meal_choice: '', address: row.address || '', group_name: '', side: 'both',
        invite_sent: false, thank_you_sent: false, gift_received: '', notes: '',
        household_id: householdId, age_group: 'adult', relationship: '', plus_one_allowed: false,
      };
    });
    const { data } = await supabase.from('guests').insert(toInsert).select();

    // Refresh households list
    const { data: updatedHouseholds } = await supabase.from('households').select('*').eq('wedding_id', weddingId).order('name');
    if (updatedHouseholds) onUpdateHouseholds(updatedHouseholds);

    setImporting(false);
    if (data) onImport(data);
  };

  const toggleAcceptHousehold = (i: number) => {
    setAcceptedHouseholds(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[#2a1f15] font-serif text-xl">Import Guests from CSV</h3>
          <button onClick={onClose}><X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" /></button>
        </div>

        {step === 'upload' && (
          <>
            <div className="bg-stone-50 rounded-xl p-4 mb-5 text-sm text-[#5d4e3e]">
              <p className="font-medium mb-1">Expected CSV format:</p>
              <code className="text-xs text-[#2a1f15] font-mono">First Name, Last Name, Email, Phone, Dietary Restrictions, Plus One, Table Number, RSVP Status, Address</code>
              <p className="mt-2 text-xs text-[#6b5d4f]">RSVP Status: confirmed, pending, or declined. Plus One: Yes or No. Address is optional but helps auto-group households.</p>
            </div>

            <div className="flex gap-3 mb-5">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030] transition-colors"
              >
                <Upload size={14} /> Choose CSV File
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
              <button onClick={downloadTemplate} className="flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-4 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors">
                <Download size={14} /> Download Template
              </button>
              {fileName && <span className="text-xs text-[#6b5d4f] self-center">{fileName}</span>}
            </div>

            {parsed.length > 0 && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#2a1f15]">{validRows.length} valid row{validRows.length !== 1 ? 's' : ''} ready to import</span>
                  {parsed.some(p => p.error) && (
                    <span className="text-xs text-rose-600">{parsed.filter(p => p.error).length} row{parsed.filter(p => p.error).length !== 1 ? 's' : ''} with errors (will be skipped)</span>
                  )}
                </div>
                <div className="border border-stone-200 rounded-xl overflow-hidden mb-5">
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead className="bg-stone-50 border-b border-stone-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-[#5d4e3e]">Name</th>
                          <th className="px-3 py-2 text-left text-[#5d4e3e]">Email</th>
                          <th className="px-3 py-2 text-left text-[#5d4e3e]">RSVP</th>
                          <th className="px-3 py-2 text-left text-[#5d4e3e]">Table</th>
                          <th className="px-3 py-2 text-left text-[#5d4e3e]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((p, i) => (
                          <tr key={i} className={`border-t border-stone-50 ${p.error ? 'bg-rose-50' : ''}`}>
                            <td className="px-3 py-1.5 text-[#2a1f15]">{p.row.first_name} {p.row.last_name}</td>
                            <td className="px-3 py-1.5 text-[#5d4e3e]">{p.row.email || '—'}</td>
                            <td className="px-3 py-1.5 text-[#5d4e3e]">{p.row.rsvp_status || 'pending'}</td>
                            <td className="px-3 py-1.5 text-[#5d4e3e]">{p.row.table_number || '—'}</td>
                            <td className="px-3 py-1.5">{p.error ? <span className="text-rose-600">{p.error}</span> : <span className="text-emerald-600">OK</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors">Cancel</button>
                  {suggestedHouseholds.length === 0 && validRows.length >= 2 ? (
                    <button onClick={suggestHouseholds} className="flex-1 bg-[#8a6d3b] text-white py-2.5 rounded-lg text-sm hover:bg-[#7a6030] transition-colors flex items-center justify-center gap-2">
                      <Home size={14} /> Review Households
                    </button>
                  ) : (
                    <button onClick={handleImport} disabled={validRows.length === 0 || importing} className="flex-1 bg-[#8a6d3b] text-white py-2.5 rounded-lg text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50">
                      {importing ? 'Importing…' : `Import ${validRows.length} Guest${validRows.length !== 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {step === 'review-households' && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-amber-800">Review suggested households</div>
                  <div className="text-xs text-amber-700 mt-1">We grouped guests by matching surname and address. Uncheck any grouping you don't want — guests will be imported as individuals instead.</div>
                </div>
              </div>
            </div>

            {suggestedHouseholds.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#6b5d4f]">
                No household groupings detected. All guests will be imported as individuals.
              </div>
            ) : (
              <div className="space-y-2 mb-5">
                {suggestedHouseholds.map((sug, i) => (
                  <label key={i} className="flex items-start gap-3 border border-stone-200 rounded-lg p-3 cursor-pointer hover:bg-stone-50/50 transition-colors">
                    <input type="checkbox" checked={acceptedHouseholds.has(i)} onChange={() => toggleAcceptHousehold(i)} className="mt-1 accent-[#c9a96e]" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[#2a1f15]">{sug.name}</div>
                      {sug.address && <div className="text-xs text-[#6b5d4f] mt-0.5">{sug.address}</div>}
                      <div className="text-xs text-[#5d4e3e] mt-1">
                        {sug.guestIndices.length} members: {sug.guestIndices.map(idx => validRows[idx]?.row.first_name).filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('upload')} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors">Back</button>
              <button onClick={handleImport} disabled={importing} className="flex-1 bg-[#8a6d3b] text-white py-2.5 rounded-lg text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50">
                {importing ? 'Importing…' : `Import ${validRows.length} Guest${validRows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: number; sub?: string; icon: React.ReactNode; color: string }) {
  const c: Record<string, string> = { stone: 'bg-stone-50 border-stone-200 text-stone-700', emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700', amber: 'bg-amber-50 border-amber-200 text-amber-700', sky: 'bg-sky-50 border-sky-200 text-sky-700' };
  return (
    <div className={`${c[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1 opacity-60">{icon}<span className="text-xs uppercase tracking-wider font-medium">{label}</span></div>
      <div className="font-serif text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-0.5 opacity-70">{sub}</div>}
    </div>
  );
}

function MiniProgress({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-[#5d4e3e]">{label}</span>
        <span className="text-[#2a1f15] font-medium">{current} / {total}</span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="text-[#6b5d4f] text-xs mt-1">{pct}%</div>
    </div>
  );
}

// ===== Household View Component =====

function getHouseholdRsvpStatus(members: Guest[]): 'all' | 'partial' | 'none' {
  const responded = members.filter(g => g.rsvp_status === 'confirmed' || g.rsvp_status === 'declined');
  if (responded.length === 0) return 'none';
  if (responded.length === members.length) return 'all';
  return 'partial';
}

function HouseholdView({
  guests, households, expanded, onToggleExpand,
  onToggleInviteSent, onToggleThankYouSent, onEditGuest, onDeleteGuest, onUpdateRsvp, selected, onToggleSelect,
}: {
  guests: Guest[];
  households: Household[];
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleInviteSent: (h: Household) => void;
  onToggleThankYouSent: (h: Household) => void;
  onEditGuest: (g: Guest) => void;
  onDeleteGuest: (id: string, name: string) => void;
  onUpdateRsvp: (id: string, status: string) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const rsvpBadge: Record<string, { label: string; cls: string }> = {
    all: { label: 'All replied', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    partial: { label: 'Partially replied', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    none: { label: 'No reply', cls: 'bg-stone-50 text-stone-500 border-stone-200' },
  };

  // Group guests by household
  const householdGroups = households.map(h => ({
    household: h,
    members: guests.filter(g => g.household_id === h.id),
  })).filter(g => g.members.length > 0);

  const individualGuests = guests.filter(g => !g.household_id);

  return (
    <div className="space-y-3">
      {householdGroups.map(({ household, members }) => {
        const isExpanded = expanded.has(household.id);
        const rsvpStatus = getHouseholdRsvpStatus(members);
        const badge = rsvpBadge[rsvpStatus];
        const attendingCount = members.filter(g => g.rsvp_status === 'confirmed').length;

        return (
          <div key={household.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Household header row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50/50 transition-colors"
              onClick={() => onToggleExpand(household.id)}
            >
              <div className="w-8 h-8 bg-[#c9a96e]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Home size={15} className="text-[#8a6d3b]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#2a1f15] truncate">{household.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                </div>
                <div className="text-xs text-[#6b5d4f] mt-0.5 flex items-center gap-2">
                  <span>{members.length} {members.length !== 1 ? 'members' : 'member'}</span>
                  {attendingCount > 0 && <span>· {attendingCount} attending</span>}
                  {household.address && <span className="truncate">· {household.address}</span>}
                </div>
              </div>
              {/* Invite + Thank You toggles */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleInviteSent(household); }}
                className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${household.invite_sent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'}`}
                title={household.invite_sent ? 'Invite sent' : 'Mark invite sent'}
              >
                <Mail size={11} /> {household.invite_sent ? 'Sent' : 'Not sent'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleThankYouSent(household); }}
                className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1 ${household.thank_you_sent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'}`}
                title={household.thank_you_sent ? 'Thank you sent' : 'Mark thank you sent'}
              >
                <Gift size={11} /> {household.thank_you_sent ? 'Sent' : 'Not sent'}
              </button>
              {isExpanded ? <ChevronDown size={16} className="text-[#6b5d4f] flex-shrink-0" /> : <ChevronRight size={16} className="text-[#6b5d4f] flex-shrink-0" />}
            </div>

            {/* Expanded member rows */}
            {isExpanded && (
              <div className="border-t border-stone-100">
                {members.map(g => (
                  <div key={g.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-50 last:border-0 hover:bg-stone-50/30">
                    <input type="checkbox" checked={selected.has(g.id)} onChange={() => onToggleSelect(g.id)} className="accent-[#c9a96e]" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[#2a1f15]">{g.first_name} {g.last_name}</span>
                      {g.email && <span className="text-xs text-[#6b5d4f] ml-2">{g.email}</span>}
                    </div>
                    <select
                      value={g.rsvp_status}
                      onChange={e => onUpdateRsvp(g.id, e.target.value)}
                      className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-[#5d4e3e]"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="declined">Declined</option>
                    </select>
                    <button onClick={() => onEditGuest(g)} className="text-[#8a6d3b] text-xs hover:underline">Edit</button>
                    <button onClick={() => onDeleteGuest(g.id, `${g.first_name} ${g.last_name}`)}><Trash2 size={12} className="text-rose-400 hover:text-rose-600" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Individual guests (no household) */}
      {individualGuests.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50/50 transition-colors"
            onClick={() => onToggleExpand('__individual__')}
          >
            <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <User size={15} className="text-stone-500" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-[#2a1f15]">Individual Guests</span>
              <span className="text-xs text-[#6b5d4f] ml-2">{individualGuests.length} {individualGuests.length !== 1 ? 'guests' : 'guest'} without a household</span>
            </div>
            {expanded.has('__individual__') ? <ChevronDown size={16} className="text-[#6b5d4f]" /> : <ChevronRight size={16} className="text-[#6b5d4f]" />}
          </div>
          {expanded.has('__individual__') && (
            <div className="border-t border-stone-100">
              {individualGuests.map(g => (
                <div key={g.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-50 last:border-0 hover:bg-stone-50/30">
                  <input type="checkbox" checked={selected.has(g.id)} onChange={() => onToggleSelect(g.id)} className="accent-[#c9a96e]" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#2a1f15]">{g.first_name} {g.last_name}</span>
                    {g.email && <span className="text-xs text-[#6b5d4f] ml-2">{g.email}</span>}
                  </div>
                  <select
                    value={g.rsvp_status}
                    onChange={e => onUpdateRsvp(g.id, e.target.value)}
                    className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-[#5d4e3e]"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="declined">Declined</option>
                  </select>
                  <button onClick={() => onEditGuest(g)} className="text-[#8a6d3b] text-xs hover:underline">Edit</button>
                  <button onClick={() => onDeleteGuest(g.id, `${g.first_name} ${g.last_name}`)}><Trash2 size={12} className="text-rose-400 hover:text-rose-600" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {guests.length === 0 && (
        <div className="text-center py-12 text-[#6b5d4f]">
          <Users size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No guests yet. Add guests or import from CSV to get started.</p>
        </div>
      )}
    </div>
  );
}
