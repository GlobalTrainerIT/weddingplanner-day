import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Circle, Plus, Trash2, Lock, Download, Calendar, Pencil, X, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportChecklistPDF } from '../lib/pdfExport';
import { showToast } from './Toast';
import type { ChecklistItem, WeddingProfile, Guest, Vendor } from '../types';
import { computeDueDate, getTaskStatus, formatAssignee, assigneeColor, type TaskStatus } from '../lib/dueDates';
import { daysUntil } from '../lib/useCountdown';
import { POST_WEDDING_TASKS } from '../lib/checklistDefaults';

interface Props {
  items: ChecklistItem[];
  onUpdate: React.Dispatch<React.SetStateAction<ChecklistItem[]>>;
  weddingId: string;
  isPro: boolean;
  onShowPricing: () => void;
  profile?: WeddingProfile | null;
  guests?: Guest[];
  vendors?: Vendor[];
}

const BASE_TIMEFRAMES = ['18+ Months', '12 Months', '9 Months', '6 Months', '3 Months', '1 Month', '2 Weeks', '1 Week', 'Day Before', 'Wedding Day'];

const SYSTEM_TASK_CONDITIONS: { task: string; isSatisfied: (p: WeddingProfile | null | undefined, g: Guest[], v: Vendor[]) => boolean }[] = [
  { task: 'Set a wedding date', isSatisfied: p => !!p?.wedding_date },
  { task: 'Set your overall wedding budget', isSatisfied: p => !!p && p.total_budget > 0 },
  { task: 'Research and book venue', isSatisfied: p => !!(p && p.venue && p.venue.trim()) },
];

const ASSIGNEES = ['partner_1', 'partner_2', 'planner', 'other'] as const;

const STATUS_STYLES: Record<TaskStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  overdue: { label: 'Overdue', cls: 'bg-rose-100 text-rose-700', icon: <AlertCircle size={10} /> },
  due_this_week: { label: 'This week', cls: 'bg-amber-100 text-amber-700', icon: <Clock size={10} /> },
  due_this_month: { label: 'This month', cls: 'bg-sky-100 text-sky-700', icon: <Calendar size={10} /> },
  upcoming: { label: 'Upcoming', cls: 'bg-stone-100 text-stone-600', icon: <Calendar size={10} /> },
  done: { label: 'Done', cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle size={10} /> },
  no_date: { label: '', cls: '', icon: null },
};

export default function Checklist({ items, onUpdate, weddingId, isPro, onShowPricing, profile, guests = [], vendors = [] }: Props) {
  const isPostWedding = (() => {
    const d = daysUntil(profile?.wedding_date ?? null);
    return d !== null && d === 0 && !!profile?.wedding_date && new Date(`${profile.wedding_date}T00:00:00`) < new Date();
  })();
  const TIMEFRAMES = isPostWedding ? [...BASE_TIMEFRAMES, 'After the Big Day'] : BASE_TIMEFRAMES;
  const [activeTab, setActiveTab] = useState(TIMEFRAMES[0]);
  const [newTask, setNewTask] = useState('');
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editForm, setEditForm] = useState({ due_date: '', assignee: 'partner_1', assignee_name: '', notes: '' });

  // Auto-complete system tasks whose condition is already satisfied.
  // Uses a ref to avoid stale closures and a guard to prevent re-triggering.
  const lastAutoCompleted = useRef<string>('');
  useEffect(() => {
    const sig = `${profile?.wedding_date}|${profile?.total_budget}|${profile?.venue}|${guests.length}|${vendors.length}`;
    if (sig === lastAutoCompleted.current) return;
    lastAutoCompleted.current = sig;

    const toUpdate = items.filter(item => {
      if (item.category === 'Custom') return false;
      const match = SYSTEM_TASK_CONDITIONS.find(c => c.task === item.task);
      if (!match) return false;
      const shouldComplete = match.isSatisfied(profile, guests, vendors);
      return shouldComplete !== item.completed;
    });

    if (toUpdate.length === 0) return;

    // Process sequentially to avoid stale state cascades
    toUpdate.forEach(async item => {
      const shouldComplete = SYSTEM_TASK_CONDITIONS.find(c => c.task === item.task)!.isSatisfied(profile, guests, vendors);
      const { data, error } = await supabase.from('checklist_items')
        .update({ completed: shouldComplete, completed_at: shouldComplete ? new Date().toISOString() : null })
        .eq('id', item.id).select().single();
      if (error) { showToast('Failed to update task', 'error'); return; }
      if (data) onUpdate(prev => prev.map(i => i.id === item.id ? data : i));
    });
  }, [profile?.wedding_date, profile?.total_budget, profile?.venue, guests.length, vendors.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed post-wedding tasks when entering post-wedding mode
  useEffect(() => {
    if (!isPostWedding || !weddingId) return;
    const existing = items.filter(i => i.timeframe === 'After the Big Day');
    if (existing.length > 0) return;
    const toInsert = POST_WEDDING_TASKS.map(t => ({
      ...t, wedding_id: weddingId, completed: false, assignee: 'partner_1', overridden: false,
      due_date: computeDueDate('After the Big Day', profile?.wedding_date || '') ,
    }));
    supabase.from('checklist_items').insert(toInsert).select().then(({ data }) => {
      if (data) onUpdate(prev => [...prev, ...data]);
    });
  }, [isPostWedding, weddingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (item: ChecklistItem) => {
    const { data, error } = await supabase.from('checklist_items')
      .update({ completed: !item.completed, completed_at: !item.completed ? new Date().toISOString() : null })
      .eq('id', item.id).select().single();
    if (error) { showToast('Failed to toggle task', 'error'); return; }
    if (data) onUpdate(prev => prev.map(i => i.id === item.id ? data : i));
  };

  const addTask = async () => {
    if (!newTask.trim() || !isPro) return;
    let dueDate = profile?.wedding_date ? computeDueDate(activeTab, profile.wedding_date) : null;
    // If the computed phase date is in the past, default to today + 7 days
    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(`${dueDate}T00:00:00`);
      if (due < today) {
        const future = new Date(today);
        future.setDate(future.getDate() + 7);
        dueDate = future.toISOString().slice(0, 10);
      }
    }
    const { data, error } = await supabase.from('checklist_items').insert({
      wedding_id: weddingId, timeframe: activeTab, task: newTask, category: 'Custom',
      completed: false, due_date: dueDate, assignee: 'partner_1', overridden: false,
    }).select().single();
    if (error) { showToast('Failed to add task', 'error'); return; }
    if (data) onUpdate(prev => [...prev, data]);
    setNewTask('');
  };

  const deleteTask = async (id: string, taskName: string) => {
    if (!isPro) return;
    if (!window.confirm(`Delete "${taskName}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('checklist_items').delete().eq('id', id);
    if (error) { showToast('Failed to delete task', 'error'); return; }
    showToast('Task deleted', 'deleted');
    onUpdate(prev => prev.filter(i => i.id !== id));
  };

  const openEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setEditForm({
      due_date: item.due_date || '',
      assignee: item.assignee || 'partner_1',
      assignee_name: item.assignee_name || '',
      notes: item.notes || '',
    });
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    const overridden = editForm.due_date !== (profile?.wedding_date ? computeDueDate(editingItem.timeframe, profile.wedding_date) : null);
    const { data, error } = await supabase.from('checklist_items').update({
      due_date: editForm.due_date || null,
      assignee: editForm.assignee,
      assignee_name: editForm.assignee_name,
      notes: editForm.notes,
      overridden,
    }).eq('id', editingItem.id).select().single();
    if (error) { showToast('Failed to save task', 'error'); return; }
    if (data) onUpdate(prev => prev.map(i => i.id === editingItem.id ? data : i));
    setEditingItem(null);
  };

  const totalDone = items.filter(i => i.completed).length;
  const totalItems = items.length;
  const pct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  const tabItems = items.filter(i => i.timeframe === activeTab);
  const tabDone = tabItems.filter(i => i.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Master Checklist</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">Your complete wedding planning timeline</p>
        </div>
        <button
          onClick={() => {
            if (!isPro) { onShowPricing(); return; }
            exportChecklistPDF(items, {
              partner1: profile?.partner1_name || 'Partner 1',
              partner2: profile?.partner2_name || 'Partner 2',
              weddingDate: profile?.wedding_date || null,
            });
          }}
          className="flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-3 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors mt-1"
          title={isPro ? 'Export to PDF' : 'Pro feature'}
        >
          {!isPro && <Lock size={13} className="text-[#8a6d3b]" />}
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* Free plan soft upsell */}
      {!isPro && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#1a1510] to-[#2e2218] border border-[#c9a96e]/30 rounded-xl px-5 py-4">
          <Lock size={18} className="text-[#8a6d3b] flex-shrink-0" />
          <div className="flex-1">
            <div className="text-white text-sm font-medium">Unlock Pro features</div>
            <div className="text-[#a08050] text-xs mt-0.5">Add custom tasks, export your checklist as PDF, and more</div>
          </div>
          <button onClick={onShowPricing} className="bg-[#8a6d3b] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#7a6030] transition-colors font-medium whitespace-nowrap">
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* Overall progress */}
      <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#8a6d3b] text-sm tracking-wider uppercase">Overall Progress</span>
          <span className="text-white font-serif text-2xl font-bold">{pct}%</span>
        </div>
        <div className="h-3 bg-[#3a2e22] rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-[#c9a96e] to-[#e8c88e] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[#a08050] text-xs">{totalDone} of {totalItems} tasks complete</div>
      </div>

      {/* Timeframe tabs */}
      <div className="flex gap-2 flex-wrap">
        {TIMEFRAMES.map(tf => {
          const tfItems = items.filter(i => i.timeframe === tf);
          const tfDone = tfItems.filter(i => i.completed).length;
          const allDone = tfItems.length > 0 && tfDone === tfItems.length;
          return (
            <button key={tf} onClick={() => setActiveTab(tf)}
              className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === tf ? 'bg-[#8a6d3b] text-white shadow-md' :
                allDone ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                'border border-stone-200 text-[#5d4e3e] hover:bg-stone-50'
              }`}>
              {allDone && <CheckCircle size={11} />}
              {tf}
              {tfItems.length > 0 && <span className="opacity-60">({tfDone}/{tfItems.length})</span>}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="bg-stone-50 border-b border-stone-100 px-5 py-3 flex items-center justify-between">
          <div>
            <span className="text-[#2a1f15] font-medium">{activeTab}</span>
            <span className="text-[#6b5d4f] text-sm ml-2">{tabDone}/{tabItems.length} done</span>
          </div>
          <div className="w-24 h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#c9a96e] rounded-full transition-all" style={{ width: `${tabItems.length > 0 ? (tabDone / tabItems.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="divide-y divide-stone-50" style={{ paddingBottom: '96px' }}>
          {tabItems.map(item => {
            const isCustom = item.category === 'Custom';
            const status = getTaskStatus(item, profile?.created_at);
            const statusStyle = STATUS_STYLES[status];
            const assigneeLabel = formatAssignee(item, profile);
            const assigneeClr = assigneeColor(item.assignee || 'partner_1');
            return (
            <div key={item.id} className={`flex items-center gap-3 px-5 py-3.5 group transition-colors hover:bg-stone-50/50 ${item.completed ? 'opacity-60' : ''}`}>
              <button onClick={() => toggle(item)} className="flex-shrink-0" aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}>
                {item.completed
                  ? <CheckCircle size={20} className="text-emerald-500 fill-emerald-50" />
                  : <Circle size={20} className="text-stone-300 group-hover:text-[#8a6d3b] transition-colors" />}
              </button>
              <button onClick={() => toggle(item)} className="flex-1 text-left min-w-0">
                <span className={`text-sm ${item.completed ? 'line-through text-[#6b5d4f]' : 'text-[#2a1f15]'}`}>{item.task}</span>
                {item.category && <span className="ml-2 text-xs text-[#6b5d4f] bg-stone-100 px-1.5 py-0.5 rounded">{item.category}</span>}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.due_date && (
                    <span className="text-xs text-[#6b5d4f] flex items-center gap-1">
                      <Calendar size={10} /> {new Date(`${item.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {statusStyle.label && !item.completed && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 ${statusStyle.cls}`}>
                      {statusStyle.icon} {statusStyle.label}
                    </span>
                  )}
                  {assigneeLabel && (
                    <span className="text-xs flex items-center gap-1" style={{ color: assigneeClr }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: assigneeClr }}>
                        {assigneeLabel.charAt(0).toUpperCase()}
                      </span>
                      {assigneeLabel}
                    </span>
                  )}
                </div>
              </button>
              {isPro && (
                <>
                  <button
                    onClick={() => openEdit(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1"
                    title="Edit task"
                    aria-label="Edit task"
                  >
                    <Pencil size={13} className="text-[#6b5d4f] hover:text-[#8a6d3b]" />
                  </button>
                  <button
                    onClick={() => deleteTask(item.id, item.task)}
                    className={`transition-opacity flex-shrink-0 p-1 ${isCustom ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    title="Delete task"
                    aria-label="Delete task"
                  >
                    <Trash2 size={13} className="text-rose-300 hover:text-rose-500" />
                  </button>
                </>
              )}
            </div>
            );
          })}
          {tabItems.length === 0 && (
            <div className="px-5 py-6 text-center text-[#6b5d4f] text-sm">No tasks for this timeframe yet.</div>
          )}
        </div>
        {/* Add task — pro only */}
        <div className="border-t border-stone-100 px-5 py-3 flex gap-2">
          <input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder={isPro ? `Add task to ${activeTab}…` : 'Upgrade to add custom tasks…'}
            disabled={!isPro}
            className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 disabled:bg-stone-50 disabled:text-[#6b5d4f] disabled:cursor-not-allowed"
          />
          <button
            onClick={isPro ? addTask : onShowPricing}
            className={`px-3 py-2 rounded-lg transition-colors ${isPro ? 'bg-[#8a6d3b] text-white hover:bg-[#7a6030]' : 'bg-stone-100 text-[#6b5d4f] hover:bg-[#8a6d3b]/10'}`}
          >
            {isPro ? <Plus size={16} /> : <Lock size={16} />}
          </button>
        </div>
      </div>

      {/* All timeframes summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {TIMEFRAMES.map(tf => {
          const tfItems = items.filter(i => i.timeframe === tf);
          const tfDone = tfItems.filter(i => i.completed).length;
          const p = isPro && tfItems.length > 0 ? Math.round((tfDone / tfItems.length) * 100) : 0;
          return (
            <button key={tf} onClick={() => setActiveTab(tf)}
              className="bg-white rounded-lg border border-stone-200 p-3 text-left hover:shadow-sm transition-shadow">
              <div className="text-[#5d4e3e] text-xs mb-2 truncate">{tf}</div>
              <div className="text-[#2a1f15] font-bold text-lg">{isPro ? `${p}%` : <Lock size={14} className="text-[#8a6d3b]/40" />}</div>
              <div className="h-1 bg-stone-100 rounded-full mt-1 overflow-hidden">
                {isPro && <div className="h-full bg-[#c9a96e] rounded-full" style={{ width: `${p}%` }} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Edit task modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingItem(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#2a1f15] font-serif text-xl">Edit Task</h3>
              <button onClick={() => setEditingItem(null)} aria-label="Close" className="text-[#6b5d4f] hover:text-[#2a1f15]">
                <X size={18} />
              </button>
            </div>
            <div className="mb-4 text-sm text-[#5d4e3e] bg-stone-50 rounded-lg px-3 py-2">{editingItem.task}</div>
            <div className="space-y-4">
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Due date</label>
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                />
                {profile?.wedding_date && !editForm.due_date && (
                  <p className="text-xs text-[#6b5d4f] mt-1">Auto-computed from your wedding date. Override by picking a date above.</p>
                )}
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Assignee</label>
                <select
                  value={editForm.assignee}
                  onChange={e => setEditForm(f => ({ ...f, assignee: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                >
                  {ASSIGNEES.map(a => (
                    <option key={a} value={a}>
                      {a === 'partner_1' ? (profile?.partner1_name || 'Partner 1') :
                       a === 'partner_2' ? (profile?.partner2_name || 'Partner 2') :
                       a === 'planner' ? 'Planner' : 'Other'}
                    </option>
                  ))}
                </select>
              </div>
              {editForm.assignee === 'other' && (
                <div>
                  <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Name</label>
                  <input
                    type="text"
                    value={editForm.assignee_name}
                    onChange={e => setEditForm(f => ({ ...f, assignee_name: e.target.value }))}
                    placeholder="Enter name…"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                  />
                </div>
              )}
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Add notes…"
                  rows={3}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingItem(null)} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={saveEdit} className="flex-1 bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030]">Save</button>
            </div>
            {editingItem.category === 'Custom' && (
              <button
                onClick={() => { deleteTask(editingItem.id, editingItem.task); setEditingItem(null); }}
                className="w-full mt-3 text-rose-600 hover:text-rose-700 text-sm font-medium py-2 rounded-lg hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} /> Delete task
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
