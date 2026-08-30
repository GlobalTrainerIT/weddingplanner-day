import { useState, useEffect, useRef } from 'react';
import { Calendar, CheckCircle, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';

interface HoneymoonItem {
  id: string;
  category: string;
  title: string;
  details: string;
  cost: number;
  date: string;
  booked: boolean;
}

const PACKING = ['Passports & IDs', 'Travel insurance docs', 'Flight & hotel confirmations', 'Cash/travel cards', 'Phone chargers', 'Adapters', 'Swimwear', 'Sunscreen', 'Medications', 'Camera', 'Formal outfit for dinner', 'Comfortable walking shoes', 'Wedding dress (if traveling in it)', 'Thank you card stamps'];

export default function Honeymoon({ weddingId }: { weddingId: string }) {
  const [destination, setDestination] = useState('');
  const [budget, setBudget] = useState(0);
  const [items, setItems] = useState<HoneymoonItem[]>([]);
  const [packing, setPacking] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'Flight', title: '', details: '', cost: 0, date: '', booked: false });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.from('notes').select('honeymoon_destination, honeymoon_budget, honeymoon_items, honeymoon_packing')
      .eq('wedding_id', weddingId).maybeSingle().then(({ data, error }) => {
        if (error) { showToast('Failed to load honeymoon data', 'error'); return; }
        if (data) {
          if (data.honeymoon_destination) setDestination(data.honeymoon_destination);
          if (data.honeymoon_budget) setBudget(data.honeymoon_budget);
          if (data.honeymoon_items) setItems(data.honeymoon_items);
          if (data.honeymoon_packing) setPacking(data.honeymoon_packing);
        }
      });
  }, [weddingId]);

  // Debounced save for destination & budget (500ms after last keystroke)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from('notes').upsert(
        { wedding_id: weddingId, honeymoon_destination: destination, honeymoon_budget: budget, updated_at: new Date().toISOString() },
        { onConflict: 'wedding_id' }
      );
      if (error) showToast('Failed to save honeymoon details', 'error');
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [destination, budget, weddingId]);

  const saveItems = async (newItems: HoneymoonItem[]) => {
    setItems(newItems);
    const { error } = await supabase.from('notes').upsert(
      { wedding_id: weddingId, honeymoon_items: newItems, updated_at: new Date().toISOString() },
      { onConflict: 'wedding_id' }
    );
    if (error) showToast('Failed to save itinerary', 'error');
  };

  const addItem = () => {
    if (!form.title) return;
    saveItems([...items, { ...form, id: Date.now().toString() }]);
    setForm({ category: 'Flight', title: '', details: '', cost: 0, date: '', booked: false });
    setShowForm(false);
  };

  const toggleBooked = (id: string) => saveItems(items.map(i => i.id === id ? { ...i, booked: !i.booked } : i));
  const deleteItem = (id: string) => saveItems(items.filter(i => i.id !== id));

  const togglePacking = (item: string, checked: boolean) => {
    const newPacking = { ...packing, [item]: checked };
    setPacking(newPacking);
    supabase.from('notes').upsert(
      { wedding_id: weddingId, honeymoon_packing: newPacking, updated_at: new Date().toISOString() },
      { onConflict: 'wedding_id' }
    ).then(({ error }) => {
      if (error) showToast('Failed to save packing list', 'error');
    });
  };

  const totalEstimated = items.reduce((s, i) => s + i.cost, 0);

  const categories = ['Flight', 'Hotel', 'Car Rental', 'Excursion', 'Dining', 'Activities', 'Other'];
  const catColors: Record<string, string> = {
    Flight: 'bg-sky-100 text-sky-700',
    Hotel: 'bg-rose-100 text-rose-700',
    'Car Rental': 'bg-stone-100 text-stone-700',
    Excursion: 'bg-emerald-100 text-emerald-700',
    Dining: 'bg-amber-100 text-amber-700',
    Activities: 'bg-teal-100 text-teal-700',
    Other: 'bg-stone-100 text-stone-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Honeymoon Planner</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">Plan your perfect post-wedding getaway</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030]">
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Destination & budget */}
      <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2">
            <label className="text-[#a08050] text-xs uppercase tracking-wider block mb-1">Destination</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Paris, France"
              className="w-full bg-[#2a1f15] border border-[#4a3a2a] text-white rounded-lg px-4 py-2.5 text-lg focus:outline-none focus:border-[#c9a96e]" />
          </div>
          <div>
            <label className="text-[#a08050] text-xs uppercase tracking-wider block mb-1">Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a08050]">$</span>
              <input type="number" min="0" value={budget || ''} onChange={e => setBudget(parseFloat(e.target.value) || 0)} placeholder="0"
                className="w-full bg-[#2a1f15] border border-[#4a3a2a] text-white rounded-lg pl-7 pr-3 py-2.5 text-lg focus:outline-none focus:border-[#c9a96e]" />
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-[#8a6d3b] font-serif text-2xl">${budget.toLocaleString()}</div>
            <div className="text-[#a08050] text-xs">Total Budget</div>
          </div>
          <div className="text-center">
            <div className="text-white font-serif text-2xl">${totalEstimated.toLocaleString()}</div>
            <div className="text-[#a08050] text-xs">Estimated Cost</div>
          </div>
          <div className="text-center">
            <div className={`font-serif text-2xl ${budget - totalEstimated >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${(budget - totalEstimated).toLocaleString()}</div>
            <div className="text-[#a08050] text-xs">Remaining</div>
          </div>
        </div>
      </div>

      {/* Itinerary items */}
      <div className="space-y-3">
        <h2 className="text-[#2a1f15] font-serif text-lg">Itinerary & Bookings</h2>
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <button onClick={() => toggleBooked(item.id)} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${item.booked ? 'bg-emerald-500' : 'border-2 border-stone-300'}`}>
              {item.booked && <CheckCircle size={16} className="text-white" />}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs px-2 py-0.5 rounded ${catColors[item.category]}`}>{item.category}</span>
                {item.date && <span className="flex items-center gap-1 text-xs text-[#6b5d4f]"><Calendar size={10} /> {new Date(`${item.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
              </div>
              <div className="text-[#2a1f15] font-medium">{item.title}</div>
              {item.details && <div className="text-[#5d4e3e] text-xs mt-0.5">{item.details}</div>}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[#2a1f15] font-medium">${item.cost.toLocaleString()}</div>
              <button onClick={() => deleteItem(item.id)} className="text-rose-300 hover:text-rose-500 text-xs mt-0.5">Remove</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-[#6b5d4f]">
            Add flights, hotels, excursions and more to plan your honeymoon.
          </div>
        )}
      </div>

      {/* Packing list */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-[#2a1f15] font-serif text-lg mb-4">Packing Checklist</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PACKING.map(item => (
            <label key={item} className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={!!packing[item]} onChange={e => togglePacking(item, e.target.checked)} className="accent-[#c9a96e]" />
              <span className={`text-sm transition-colors ${packing[item] ? 'line-through text-[#6b5d4f]' : 'text-[#2a1f15]'}`}>{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Add item modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[#2a1f15] font-serif text-xl mb-5">Add Honeymoon Item</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Round-trip flights to Paris" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Details</label>
                <input value={form.details} onChange={e => setForm(f => ({...f, details: e.target.value}))} placeholder="Airline, confirmation #, etc." className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Cost</label>
                  <input type="number" min="0" value={form.cost} onChange={e => setForm(f => ({...f, cost: parseFloat(e.target.value) || 0}))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
                </div>
                <div>
                  <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#5d4e3e]">
                <input type="checkbox" checked={form.booked} onChange={e => setForm(f => ({...f, booked: e.target.checked}))} className="accent-[#c9a96e]" />
                Already booked / confirmed
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={addItem} className="flex-1 bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030]">Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
