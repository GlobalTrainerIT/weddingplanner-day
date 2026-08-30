import { useState } from 'react';
import { Plus, Trash2, Star, X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BridalPartyMember } from '../types';

interface Props {
  members: BridalPartyMember[];
  onUpdate: (members: BridalPartyMember[]) => void;
  partner1: string;
  partner2: string;
  weddingId: string;
}

const ALL_ROLES = ['Maid of Honor', 'Best Man', 'Bridesmaid', 'Groomsman', 'Flower Girl', 'Ring Bearer', 'Usher', 'Junior Bridesmaid', 'Other'];

const empty: Omit<BridalPartyMember, 'id' | 'wedding_id'> = {
  name: '', role: 'Bridesmaid', side: 'partner1', phone: '', email: '',
  outfit_details: '', outfit_ordered: false, gift_given: false, gift_details: '', notes: '',
};

export default function BridalParty({ members, onUpdate, partner1, partner2, weddingId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);

  const p1Members = members.filter(m => m.side === 'partner1');
  const p2Members = members.filter(m => m.side === 'partner2');

  const handleSave = async () => {
    const payload = { wedding_id: weddingId, ...form };
    if (editId) {
      const { data } = await supabase.from('bridal_party').update(payload).eq('id', editId).select().single();
      if (data) onUpdate(members.map(m => m.id === editId ? data : m));
    } else {
      const { data } = await supabase.from('bridal_party').insert(payload).select().single();
      if (data) onUpdate([...members, data]);
    }
    setForm({ ...empty }); setShowForm(false); setEditId(null);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('bridal_party').delete().eq('id', id);
    onUpdate(members.filter(m => m.id !== id));
  };

  const toggle = async (id: string, field: 'outfit_ordered' | 'gift_given', val: boolean) => {
    const { data } = await supabase.from('bridal_party').update({ [field]: !val }).eq('id', id).select().single();
    if (data) onUpdate(members.map(m => m.id === id ? data : m));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Bridal Party</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">Your most important people</p>
        </div>
        <button onClick={() => { setForm({ ...empty }); setEditId(null); setShowForm(true); }} className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030]">
          <Plus size={15} /> Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-xl p-4 text-center">
          <div className="font-serif text-3xl font-bold text-rose-800 dark:text-rose-300">{p1Members.length}</div>
          <div className="text-rose-600 dark:text-rose-400 text-xs mt-1 uppercase tracking-wider">{partner1 || 'Partner 1'}'s Party</div>
        </div>
        <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 rounded-xl p-4 text-center">
          <div className="font-serif text-3xl font-bold text-sky-800 dark:text-sky-300">{p2Members.length}</div>
          <div className="text-sky-600 dark:text-sky-400 text-xs mt-1 uppercase tracking-wider">{partner2 || 'Partner 2'}'s Party</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 text-center">
          <div className="font-serif text-3xl font-bold text-amber-800 dark:text-amber-300">{members.filter(m => m.outfit_ordered).length}/{members.length}</div>
          <div className="text-amber-600 dark:text-amber-400 text-xs mt-1 uppercase tracking-wider">Outfits Ordered</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 text-center">
          <div className="font-serif text-3xl font-bold text-emerald-800 dark:text-emerald-300">{members.filter(m => m.gift_given).length}/{members.length}</div>
          <div className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 uppercase tracking-wider">Gifts Given</div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PartyColumn title={`${partner1 || 'Partner 1'}'s Party`} members={p1Members} onEdit={m => { setForm({...m}); setEditId(m.id); setShowForm(true); }} onDelete={handleDelete} onToggle={toggle} color="rose" />
        <PartyColumn title={`${partner2 || 'Partner 2'}'s Party`} members={p2Members} onEdit={m => { setForm({...m}); setEditId(m.id); setShowForm(true); }} onDelete={handleDelete} onToggle={toggle} color="sky" />
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#2a1f15] dark:text-[#e8dcc8] font-serif text-xl">{editId ? 'Edit Member' : 'Add Member'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#6b5d4f] dark:text-[#a89878]" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[#5d4e3e] dark:text-[#a89878] text-xs uppercase tracking-wider mb-1 block">Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} onKeyDown={e => e.key === 'Enter' && handleSave()} className="w-full border border-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-[#e8dcc8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div>
                <label className="text-[#5d4e3e] dark:text-[#a89878] text-xs uppercase tracking-wider mb-1 block">Side</label>
                <select value={form.side} onChange={e => setForm(f => ({...f, side: e.target.value}))} className="w-full border border-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-[#e8dcc8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                  <option value="partner1">{partner1 || 'Partner 1'}</option>
                  <option value="partner2">{partner2 || 'Partner 2'}</option>
                </select>
              </div>
              <div>
                <label className="text-[#5d4e3e] dark:text-[#a89878] text-xs uppercase tracking-wider mb-1 block">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} className="w-full border border-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-[#e8dcc8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                  {ALL_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              {[['Phone', 'phone'], ['Email', 'email']].map(([label, key]) => (
                <div key={key}>
                  <label className="text-[#5d4e3e] dark:text-[#a89878] text-xs uppercase tracking-wider mb-1 block">{label}</label>
                  <input value={(form as unknown as Record<string, string>)[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} className="w-full border border-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-[#e8dcc8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-[#5d4e3e] dark:text-[#a89878] text-xs uppercase tracking-wider mb-1 block">Outfit Details</label>
                <input value={form.outfit_details} onChange={e => setForm(f => ({...f, outfit_details: e.target.value}))} placeholder="Color, style, store…" className="w-full border border-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-[#e8dcc8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div className="col-span-2">
                <label className="text-[#5d4e3e] dark:text-[#a89878] text-xs uppercase tracking-wider mb-1 block">Gift Details</label>
                <input value={form.gift_details} onChange={e => setForm(f => ({...f, gift_details: e.target.value}))} placeholder="Gift idea, store, budget…" className="w-full border border-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-[#e8dcc8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div className="col-span-2 flex gap-4">
                {([['outfit_ordered', form.outfit_ordered, 'Outfit Ordered'], ['gift_given', form.gift_given, 'Gift Given']] as [keyof typeof form, boolean, string][]).map(([field, val, label]) => (
                  <label key={field} className="flex items-center gap-2 text-sm text-[#5d4e3e] dark:text-[#a89878]">
                    <input type="checkbox" checked={val} onChange={e => setForm(f => ({...f, [field]: e.target.checked}))} className="accent-[#c9a96e]" />
                    {label}
                  </label>
                ))}
              </div>
              <div className="col-span-2">
                <label className="text-[#5d4e3e] dark:text-[#a89878] text-xs uppercase tracking-wider mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} className="w-full border border-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-[#e8dcc8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-stone-200 dark:border-stone-700 text-[#5d4e3e] dark:text-[#a89878] py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030]">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PartyColumn({ title, members, onEdit, onDelete, onToggle, color }: {
  title: string;
  members: BridalPartyMember[];
  onEdit: (m: BridalPartyMember) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, field: 'outfit_ordered' | 'gift_given', val: boolean) => void;
  color: string;
}) {
  const bg = color === 'rose'
    ? 'from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-rose-900/30 border-rose-200 dark:border-rose-800/50'
    : 'from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-sky-900/30 border-sky-200 dark:border-sky-800/50';
  const accent = color === 'rose' ? 'text-rose-700 dark:text-rose-300' : 'text-sky-700 dark:text-sky-300';
  return (
    <div className={`bg-gradient-to-br ${bg} border rounded-2xl p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <Star size={16} className={accent} />
        <h3 className={`font-serif text-lg ${accent}`}>{title}</h3>
        <span className={`text-xs opacity-60 ${accent}`}>({members.length})</span>
      </div>
      <div className="space-y-3">
        {members.map(m => (
          <div key={m.id} className="bg-white dark:bg-stone-900/60 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[#2a1f15] dark:text-[#e8dcc8] font-medium">{m.name}</div>
                <div className="text-[#6b5d4f] dark:text-[#a89878] text-xs">{m.role}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(m)} className="text-[#8a6d3b] text-xs hover:underline">Edit</button>
                <button onClick={() => onDelete(m.id)}><Trash2 size={12} className="text-rose-300 hover:text-rose-500" /></button>
              </div>
            </div>
            {m.outfit_details && <div className="text-xs text-[#5d4e3e] dark:text-[#a89878] mb-2">Outfit: {m.outfit_details}</div>}
            <div className="flex gap-3">
              <button onClick={() => onToggle(m.id, 'outfit_ordered', m.outfit_ordered)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${m.outfit_ordered ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'}`}>
                <CheckCircle size={10} /> Outfit
              </button>
              <button onClick={() => onToggle(m.id, 'gift_given', m.gift_given)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${m.gift_given ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'}`}>
                <CheckCircle size={10} /> Gift
              </button>
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="text-center py-6 text-[#6b5d4f] dark:text-[#a89878] text-sm">No members added yet.</div>
        )}
      </div>
    </div>
  );
}
