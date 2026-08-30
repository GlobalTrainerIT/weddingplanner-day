import { useState, useEffect } from 'react';
import { Users, MapPin, CheckCircle, Plus, X, Trash2, Monitor, List, Wand2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Guest, Household, WeddingProfile } from '../types';
import FloorPlanEditor from './FloorPlanEditor';

interface TableDef {
  id: number;
  name: string;
  capacity: number;
}

interface Props {
  guests: Guest[];
  onUpdate: (guests: Guest[]) => void;
  weddingId: string;
  households: Household[];
  profile: WeddingProfile | null;
}

export default function SeatingChart({ guests, onUpdate, weddingId, households, profile }: Props) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isDesktop) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#2a1f15] font-serif text-3xl">Seating Chart</h1>
            <p className="text-[#6b5d4f] text-sm mt-1">Drag tables, objects, and guests onto the floor plan</p>
          </div>
        </div>
        <FloorPlanEditor
          weddingId={weddingId}
          guests={guests}
          households={households}
          onUpdateGuests={onUpdate}
          profile={profile}
        />
      </div>
    );
  }

  return <MobileSeatingChart guests={guests} onUpdate={onUpdate} households={households} />;
}

// ===== Mobile fallback (existing list view) =====

let nextTableId = 1;

function MobileSeatingChart({ guests, onUpdate, households: _households }: { guests: Guest[]; onUpdate: (g: Guest[]) => void; households: Household[] }) {
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [tableInput, setTableInput] = useState('');
  const [tables, setTables] = useState<TableDef[]>([]);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('8');
  const [autoArrangePreview, setAutoArrangePreview] = useState<{ assignments: Record<string, number>; summary: string } | null>(null);
  const [reSeatAll, setReSeatAll] = useState(false);

  const eligibleGuests = guests.filter(g => g.rsvp_status === 'confirmed');
  const seated = eligibleGuests.filter(g => g.table_number != null);
  const unseated = eligibleGuests.filter(g => g.table_number == null);
  const confirmedCount = eligibleGuests.length;

  const assignedNums = [...new Set(guests.map(g => g.table_number).filter((n): n is number => n != null))];
  const allTableIds = [...new Set([...tables.map(t => t.id), ...assignedNums])].sort((a, b) => a - b);

  const getTableDef = (id: number): TableDef =>
    tables.find(t => t.id === id) ?? { id, name: `Table ${id}`, capacity: 8 };

  const guestsAtTable = (id: number) =>
    guests.filter(g => g.table_number === id && g.rsvp_status === 'confirmed');

  const assignTable = async (guestId: string, tableNum: number | null) => {
    const { data } = await supabase
      .from('guests').update({ table_number: tableNum }).eq('id', guestId).select().single();
    if (data) onUpdate(guests.map(g => g.id === guestId ? data : g));
    setAssigningId(null);
    setTableInput('');
  };

  const startAssign = (id: string, current?: number | null) => {
    setAssigningId(id);
    setTableInput(current ? String(current) : '');
  };

  const openAddTable = () => {
    const next = allTableIds.length > 0 ? Math.max(...allTableIds) + 1 : 1;
    setNewTableName(`Table ${next}`);
    setNewTableCapacity('8');
    setShowAddTable(true);
  };

  const confirmAddTable = () => {
    const name = newTableName.trim() || `Table ${nextTableId}`;
    const capacity = Math.max(1, parseInt(newTableCapacity) || 8);
    const numMatch = name.match(/(\d+)$/);
    const id = numMatch ? parseInt(numMatch[1]) : (allTableIds.length > 0 ? Math.max(...allTableIds) + 1 : 1);
    if (!tables.find(t => t.id === id)) {
      setTables(prev => [...prev, { id, name, capacity }]);
      nextTableId = id + 1;
    }
    setShowAddTable(false);
  };

  const removeTable = (id: number) => {
    const affected = guests.filter(g => g.table_number === id);
    Promise.all(affected.map(g =>
      supabase.from('guests').update({ table_number: null }).eq('id', g.id).select().single()
    )).then(results => {
      const updated = results.map(r => r.data).filter(Boolean) as Guest[];
      onUpdate(guests.map(g => updated.find(u => u.id === g.id) ?? g));
    });
    setTables(prev => prev.filter(t => t.id !== id));
  };

  const computeAutoArrange = () => {
    const pool = reSeatAll
      ? [...eligibleGuests]
      : eligibleGuests.filter(g => g.table_number == null);
    if (pool.length === 0 || allTableIds.length === 0) return;

    // Group guests by household
    const byHousehold = new Map<string | null, Guest[]>();
    pool.forEach(g => {
      const key = g.household_id || null;
      const arr = byHousehold.get(key) || [];
      arr.push(g);
      byHousehold.set(key, arr);
    });

    // Sort households by size descending for first-fit bin packing
    const householdGroups = Array.from(byHousehold.entries())
      .map(([hid, members]) => ({ hid, members, size: members.length }))
      .sort((a, b) => b.size - a.size);

    const assignments: Record<string, number> = {};
    const tableFill: Record<number, number> = {};
    allTableIds.forEach(id => {
      if (!reSeatAll) {
        tableFill[id] = guestsAtTable(id).length;
      } else {
        tableFill[id] = 0;
      }
    });

    for (const group of householdGroups) {
      // Try to fit the whole household at one table
      let placed = false;
      for (const tableId of allTableIds) {
        const def = getTableDef(tableId);
        if (tableFill[tableId] + group.size <= def.capacity) {
          group.members.forEach(g => { assignments[g.id] = tableId; });
          tableFill[tableId] += group.size;
          placed = true;
          break;
        }
      }
      // If household doesn't fit at one table, split across tables
      if (!placed) {
        for (const g of group.members) {
          for (const tableId of allTableIds) {
            const def = getTableDef(tableId);
            if (tableFill[tableId] < def.capacity) {
              assignments[g.id] = tableId;
              tableFill[tableId]++;
              break;
            }
          }
        }
      }
    }

    const placedCount = Object.keys(assignments).length;
    const usedTables = new Set(Object.values(assignments)).size;
    setAutoArrangePreview({
      assignments,
      summary: `${placedCount} guest${placedCount !== 1 ? 's' : ''} placed across ${usedTables} table${usedTables !== 1 ? 's' : ''}`,
    });
  };

  const applyAutoArrange = async () => {
    if (!autoArrangePreview) return;
    const { assignments } = autoArrangePreview;
    const results = await Promise.all(
      Object.entries(assignments).map(([gid, tableNum]) =>
        supabase.from('guests').update({ table_number: tableNum }).eq('id', gid).select().single()
      )
    );
    const updated = results.map(r => r.data).filter(Boolean) as Guest[];
    onUpdate(guests.map(g => updated.find(u => u.id === g.id) ?? g));
    setAutoArrangePreview(null);
    setReSeatAll(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Seating Chart</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">Assign confirmed guests to tables</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#6b5d4f] bg-stone-100 px-2.5 py-1.5 rounded-lg">
          <List size={12} /> List view
        </div>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-sky-700 text-xs flex items-center gap-2">
        <Monitor size={14} className="flex-shrink-0" />
        <span>The interactive floor plan editor is available on tablet and desktop. Rotate your device or use a larger screen for the full canvas experience.</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={openAddTable}
          className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030] transition-colors"
        >
          <Plus size={15} /> Add Table
        </button>
        <button
          onClick={computeAutoArrange}
          disabled={eligibleGuests.length === 0 || allTableIds.length === 0}
          className="flex items-center gap-2 bg-[#c9a96e]/10 text-[#8a6d3b] px-4 py-2 rounded-lg text-sm hover:bg-[#c9a96e]/20 transition-colors disabled:opacity-40"
        >
          <Wand2 size={15} /> Auto-arrange
        </button>
        <label className="flex items-center gap-1.5 text-xs text-[#6b5d4f]">
          <input
            type="checkbox"
            checked={reSeatAll}
            onChange={e => setReSeatAll(e.target.checked)}
            className="accent-[#c9a96e]"
          />
          Re-seat everyone
        </label>
      </div>

      {autoArrangePreview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAutoArrangePreview(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Wand2 size={18} className="text-[#8a6d3b]" />
              <h2 className="text-[#2a1f15] font-serif text-lg">Auto-arrange preview</h2>
            </div>
            <p className="text-[#5d4e3e] text-sm mb-2">{autoArrangePreview.summary}</p>
            <p className="text-[#6b5d4f] text-xs mb-5">Household members will be seated together. Nothing is saved until you apply.</p>
            <div className="flex gap-3">
              <button onClick={() => { setAutoArrangePreview(null); setReSeatAll(false); }} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2 rounded-lg text-sm hover:bg-stone-50">Cancel</button>
              <button onClick={applyAutoArrange} className="flex-1 bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030]">Apply</button>
            </div>
          </div>
        </div>
      )}

      {showAddTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#2a1f15] font-serif text-xl">Add Table</h2>
              <button onClick={() => setShowAddTable(false)}><X size={18} className="text-[#6b5d4f]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Table Name / Number</label>
                <input
                  value={newTableName}
                  onChange={e => setNewTableName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmAddTable()}
                  autoFocus
                  placeholder="e.g. Table 1, Head Table, Family"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                />
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Capacity (seats)</label>
                <input
                  type="number" min="1" max="50"
                  value={newTableCapacity}
                  onChange={e => setNewTableCapacity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmAddTable()}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddTable(false)} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2 rounded-lg text-sm hover:bg-stone-50">Cancel</button>
              <button onClick={confirmAddTable} className="flex-1 bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030]">Add Table</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
          <div className="font-serif text-2xl font-bold text-[#2a1f15]">{confirmedCount}</div>
          <div className="text-[#6b5d4f] text-xs mt-1 uppercase tracking-wider">Confirmed</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <div className="font-serif text-2xl font-bold text-emerald-800">{seated.length}</div>
          <div className="text-emerald-600 text-xs mt-1 uppercase tracking-wider">Seated</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="font-serif text-2xl font-bold text-amber-800">{unseated.length}</div>
          <div className="text-amber-600 text-xs mt-1 uppercase tracking-wider">Unassigned</div>
        </div>
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-center">
          <div className="font-serif text-2xl font-bold text-sky-800">{allTableIds.length}</div>
          <div className="text-sky-600 text-xs mt-1 uppercase tracking-wider">Tables</div>
        </div>
      </div>

      {confirmedCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
          No confirmed guests yet. Go to the Guest List and mark guests as "Confirmed" to assign them to tables.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 flex items-center justify-between">
            <h3 className="text-amber-800 font-medium flex items-center gap-2">
              <Users size={16} /> Unassigned ({unseated.length})
            </h3>
          </div>
          <div className="divide-y divide-stone-50 max-h-96 overflow-y-auto">
            {unseated.map(g => (
              <div key={g.id} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50/50 transition-colors">
                <div>
                  <div className="text-[#2a1f15] text-sm font-medium">{g.first_name} {g.last_name}</div>
                  {g.meal_choice && <div className="text-[#6b5d4f] text-xs">{g.meal_choice}</div>}
                </div>
                {assigningId === g.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="1" value={tableInput}
                      onChange={e => setTableInput(e.target.value)}
                      placeholder="Table #"
                      className="w-20 border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#c9a96e]"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') assignTable(g.id, parseInt(tableInput) || null);
                        if (e.key === 'Escape') setAssigningId(null);
                      }}
                    />
                    <button onClick={() => assignTable(g.id, parseInt(tableInput) || null)} className="bg-[#8a6d3b] text-white px-2 py-1 rounded text-xs hover:bg-[#7a6030]">Assign</button>
                    <button onClick={() => setAssigningId(null)} className="border border-stone-200 text-[#5d4e3e] px-2 py-1 rounded text-xs">✕</button>
                  </div>
                ) : (
                  <button onClick={() => startAssign(g.id)} className="text-[#8a6d3b] text-xs border border-[#c9a96e]/30 px-3 py-1 rounded-lg hover:bg-[#c9a96e]/10 transition-colors">
                    Assign Table
                  </button>
                )}
              </div>
            ))}
            {unseated.length === 0 && confirmedCount > 0 && (
              <div className="px-5 py-8 text-center text-emerald-700 text-sm">
                <CheckCircle size={20} className="mx-auto mb-2 text-emerald-500" />
                All confirmed guests have been seated!
              </div>
            )}
            {confirmedCount === 0 && (
              <div className="px-5 py-8 text-center text-[#6b5d4f] text-sm">Confirm guests in the Guest List first.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3">
            <h3 className="text-emerald-800 font-medium flex items-center gap-2">
              <MapPin size={16} /> Table Map ({allTableIds.length} tables)
            </h3>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {allTableIds.map(tableId => {
              const def = getTableDef(tableId);
              const tableGuests = guestsAtTable(tableId);
              const isFull = tableGuests.length >= def.capacity;
              return (
                <div key={tableId} className={`rounded-lg p-3 border ${isFull ? 'bg-rose-50/50 border-rose-100' : 'bg-stone-50 border-stone-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#2a1f15] font-medium text-sm">{def.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${isFull ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-white border-stone-200 text-[#6b5d4f]'}`}>
                        {tableGuests.length}/{def.capacity}
                      </span>
                      <button onClick={() => removeTable(tableId)} className="text-stone-300 hover:text-rose-400 transition-colors" title="Remove table">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {tableGuests.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tableGuests.map(g => (
                        <span key={g.id} className="bg-white border border-stone-200 text-[#2a1f15] text-xs px-2 py-1 rounded flex items-center gap-1">
                          {g.first_name} {g.last_name.charAt(0)}.
                          <button onClick={() => assignTable(g.id, null)} className="text-rose-400 hover:text-rose-600 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#6b5d4f] text-xs italic">Empty — assign guests from the left</p>
                  )}
                </div>
              );
            })}
            {allTableIds.length === 0 && (
              <div className="text-center py-8 text-[#6b5d4f] text-sm">Click "Add Table" to create your first table.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
