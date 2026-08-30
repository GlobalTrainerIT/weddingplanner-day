import { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, CheckCircle, Clock, X, Lock, Download, Link, ChevronDown, ChevronRight, AlertTriangle, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { n, fmt, fmtMoney } from '../lib/utils';
import { exportBudgetPDF } from '../lib/pdfExport';
import { getTotalCommitted, getTotalPaid, getTotalScheduled, getCatTotals, CANONICAL_CATEGORIES } from '../lib/budgetSelectors';
import type { BudgetItem, BudgetPayment, Vendor, WeddingProfile } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { showToast } from './Toast';

interface Props {
  items: BudgetItem[];
  profile: WeddingProfile | null;
  vendors: Vendor[];
  onUpdate: React.Dispatch<React.SetStateAction<BudgetItem[]>>;
  payments: BudgetPayment[];
  onUpdatePayments: (payments: BudgetPayment[]) => void;
  isPro: boolean;
  onShowPricing: () => void;
}

const CATEGORIES = [...CANONICAL_CATEGORIES];


const PAYMENT_PRESETS = ['Deposit', 'Second payment', 'Final payment', 'Custom'];

const emptyForm = {
  category: 'Venue',
  item_name: '',
  estimated_cost: '' as string | number,
  actual_cost: '' as string | number,
  deposit_paid: '' as string | number,
  due_date: '',
  paid: false,
  notes: '',
  vendor_id: '' as string,
  paid_by: 'couple' as string,
};

// ===== Payment helpers =====

function paymentsForItem(payments: BudgetPayment[], itemId: string): BudgetPayment[] {
  return payments.filter(p => p.budget_item_id === itemId);
}

function totalScheduled(payments: BudgetPayment[]): number {
  return payments.reduce((s, p) => s + n(p.amount), 0);
}

function totalPaid(payments: BudgetPayment[]): number {
  return payments.filter(p => p.paid_at).reduce((s, p) => s + n(p.amount), 0);
}

function balanceDue(payments: BudgetPayment[]): number {
  return payments.filter(p => !p.paid_at).reduce((s, p) => s + n(p.amount), 0);
}

function nextPaymentDue(payments: BudgetPayment[]): BudgetPayment | null {
  const unpaid = payments.filter(p => !p.paid_at && p.due_date);
  if (unpaid.length === 0) return null;
  return unpaid.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))[0];
}

function daysUntilDate(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// ===== Default budget ratios =====

const DEFAULT_BUDGET_RATIOS: { category: string; item_name: string; pct: number }[] = [
  { category: 'Venue', item_name: 'Venue Rental', pct: 30 },
  { category: 'Catering', item_name: 'Catering & Bar', pct: 22 },
  { category: 'Photography', item_name: 'Photographer', pct: 13 },
  { category: 'Florals', item_name: 'Flowers & Décor', pct: 9 },
  { category: 'Dress/Attire', item_name: 'Dress & Attire', pct: 7 },
  { category: 'Music/DJ', item_name: 'DJ / Band', pct: 6 },
  { category: 'Honeymoon', item_name: 'Honeymoon', pct: 5 },
  { category: 'Hair & Makeup', item_name: 'Hair & Makeup', pct: 3 },
  { category: 'Cake', item_name: 'Wedding Cake', pct: 2 },
  { category: 'Transportation', item_name: 'Transportation', pct: 1 },
  { category: 'Invitations', item_name: 'Invitations & Stationery', pct: 1 },
  { category: 'Miscellaneous', item_name: 'Officiant & Misc', pct: 1 },
];

// ===== Main component =====

export default function BudgetTracker({ items, profile, vendors, onUpdate, payments, onUpdatePayments, isPro, onShowPricing }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [seeded, setSeeded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'items' | 'schedule'>('items');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0 && profile?.id && !seeded) {
      setSeeded(true);
      const budget = n(profile.total_budget) || 10000;
      const rows = DEFAULT_BUDGET_RATIOS.map(d => {
        const est = Math.round((budget * d.pct) / 100 / 50) * 50;
        return {
          wedding_id: profile.id, category: d.category, item_name: d.item_name,
          estimated_cost: est, actual_cost: 0, deposit_paid: 0, balance_due: est,
          paid: false, notes: 'Suggested estimate — adjust to match your quotes',
        };
      });
      supabase.from('budget_items').insert(rows).select().then(({ data }) => {
        if (data) onUpdate(data);
      });
    }
  }, [items.length, profile?.id]);

  // ===== Page-level derived values (single source of truth) =====
  const totalCommitted = getTotalCommitted(items);
  const totalScheduledAll = getTotalScheduled(payments);
  const totalPaidAll = getTotalPaid(payments);
  const totalBalanceDue = totalScheduledAll - totalPaidAll;

  const upcomingPayments = payments
    .filter(p => !p.paid_at && p.due_date && (daysUntilDate(p.due_date) ?? 999) <= 30 && (daysUntilDate(p.due_date) ?? 999) >= 0)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  const overduePayments = payments
    .filter(p => !p.paid_at && p.due_date && (daysUntilDate(p.due_date) ?? 0) < 0)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  // ===== Item CRUD (unchanged) =====
  const openAdd = () => { setForm({ ...emptyForm }); setEditId(null); setError(''); setShowForm(true); };
  const openEdit = (item: BudgetItem) => {
    setForm({
      category: item.category, item_name: item.item_name,
      estimated_cost: n(item.estimated_cost), actual_cost: n(item.actual_cost),
      deposit_paid: n(item.deposit_paid), due_date: item.due_date || '',
      paid: item.paid, notes: item.notes, vendor_id: item.vendor_id || '',
      paid_by: item.paid_by || 'couple',
    });
    setEditId(item.id); setError(''); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.item_name.toString().trim()) { setError('Item name is required.'); return; }
    if (n(form.estimated_cost) < 0) { setError('Estimated cost cannot be negative.'); return; }
    if (n(form.actual_cost) < 0) { setError('Actual cost cannot be negative.'); return; }
    if (n(form.deposit_paid) < 0) { setError('Deposit paid cannot be negative.'); return; }
    if (n(form.deposit_paid) > n(form.estimated_cost)) { setError('Deposit cannot exceed the estimated cost.'); return; }
    setSaving(true); setError('');
    const linkedVendor = form.vendor_id ? vendors.find(v => v.id === form.vendor_id) : null;
    const estimated = Math.max(0, n(form.estimated_cost) || (linkedVendor ? n(linkedVendor.price) : 0));
    const actual = Math.max(0, linkedVendor ? n(linkedVendor.price) : n(form.actual_cost));
    const deposit = Math.max(0, linkedVendor ? n(linkedVendor.deposit_paid) : n(form.deposit_paid));
    const balanceDueVal = Math.max(0, estimated - deposit);
    const payload = {
      wedding_id: profile?.id || '', category: form.category,
      item_name: form.item_name.toString().trim(), estimated_cost: estimated,
      actual_cost: actual, deposit_paid: deposit, balance_due: balanceDueVal,
      due_date: form.due_date || null,
      paid: linkedVendor ? (linkedVendor.status === 'paid') : form.paid,
      notes: form.notes, vendor_id: form.vendor_id || null, paid_by: form.paid_by,
    };
    if (editId) {
      const { data, error: err } = await supabase.from('budget_items').update(payload).eq('id', editId).select().single();
      if (err) { showToast('Failed to update budget item', 'error'); setError('We could not save this budget item. Please try again.'); setSaving(false); return; }
      if (data) onUpdate(prev => prev.map(i => i.id === editId ? data : i));
    } else {
      const { data, error: err } = await supabase.from('budget_items').insert(payload).select().single();
      if (err) { showToast('Failed to add budget item', 'error'); setError('We could not save this budget item. Please try again.'); setSaving(false); return; }
      if (data) onUpdate(prev => [...prev, data]);
    }
    setSaving(false); setForm({ ...emptyForm }); setShowForm(false); setEditId(null);
    showToast(editId ? 'Budget item updated' : 'Budget item added');
    setActiveTab('all');
  };

  const handleDelete = (id: string, name: string) => setConfirmDelete({ id, name });

  const doDelete = async () => {
    if (!confirmDelete) return;
    const deletedIndex = items.findIndex(i => i.id === confirmDelete.id);
    const deleted = items[deletedIndex];
    const afterDelete = items.filter(i => i.id !== confirmDelete.id);
    const deletedPayments = payments.filter(p => p.budget_item_id === confirmDelete.id);
    setConfirmDelete(null);
    onUpdate(afterDelete);
    onUpdatePayments(payments.filter(p => p.budget_item_id !== confirmDelete.id));

    const { error: payErr } = await supabase.from('budget_payments').delete().eq('budget_item_id', confirmDelete.id);
    const { error: itemErr } = await supabase.from('budget_items').delete().eq('id', confirmDelete.id);
    if (itemErr || payErr) {
      onUpdate([...afterDelete]);
      onUpdatePayments(payments.filter(p => p.budget_item_id !== confirmDelete.id));
      showToast('Failed to delete item', 'error');
      return;
    }

    showToast(`${confirmDelete.name} deleted`, 'deleted', deleted ? async () => {
      const { data: restoredItem } = await supabase.from('budget_items').insert({
        wedding_id: deleted.wedding_id, item_name: deleted.item_name, category: deleted.category,
        estimated_cost: n(deleted.estimated_cost), deposit_paid: n(deleted.deposit_paid),
        paid: deleted.paid, vendor_id: deleted.vendor_id,
      }).select().single();
      if (restoredItem) {
        const restored = [...afterDelete];
        restored.splice(deletedIndex, 0, restoredItem);
        onUpdate(restored);
        if (deletedPayments.length > 0) {
          const { data: restoredPays } = await supabase.from('budget_payments').insert(
            deletedPayments.map(p => ({
              budget_item_id: restoredItem.id, label: p.label, amount: n(p.amount),
              due_date: p.due_date, paid_at: p.paid_at, method_note: p.method_note,
            }))
          ).select();
          if (restoredPays) onUpdatePayments([...payments.filter(pp => pp.budget_item_id !== confirmDelete.id), ...restoredPays]);
        } else {
          onUpdatePayments(payments);
        }
        showToast(`${deleted.item_name} restored`);
      }
    } : undefined);
  };

  // ===== Payment CRUD =====
  const addPayment = async (itemId: string, label: string, amount: string, dueDate: string, methodNote: string) => {
    const amt = n(amount);
    if (amt <= 0) { showToast('Enter an amount', 'error'); return; }
    const { data, error: err } = await supabase.from('budget_payments').insert({
      budget_item_id: itemId, label, amount: amt, due_date: dueDate || null,
      paid_at: null, method_note: methodNote,
    }).select().single();
    if (err) { console.error(err); showToast('We could not add this payment. Please try again.', 'error'); return; }
    if (data) {
      onUpdatePayments([...payments, data]);
      showToast(`${label} added`);
    }
  };

  const togglePaymentPaid = async (payment: BudgetPayment) => {
    const newPaidAt = payment.paid_at ? null : new Date().toISOString();
    const { data } = await supabase.from('budget_payments')
      .update({ paid_at: newPaidAt }).eq('id', payment.id).select().single();
    if (data) {
      onUpdatePayments(payments.map(p => p.id === payment.id ? data : p));
      showToast(payment.paid_at ? `${payment.label} marked unpaid` : `${payment.label} marked paid`, payment.paid_at ? 'deleted' : 'success', payment.paid_at ? () => {
        // Undo un-mark
        supabase.from('budget_payments').update({ paid_at: new Date().toISOString() }).eq('id', payment.id).select().single().then(({ data: d }) => {
          if (d) onUpdatePayments(payments.map(p => p.id === payment.id ? d : p));
        });
        showToast(`${payment.label} re-marked paid`);
      } : () => {
        supabase.from('budget_payments').update({ paid_at: null }).eq('id', payment.id).select().single().then(({ data: d }) => {
          if (d) onUpdatePayments(payments.map(p => p.id === payment.id ? d : p));
        });
        showToast(`${payment.label} un-marked`);
      });
    }
  };

  const updatePayment = async (payment: BudgetPayment, updates: Partial<BudgetPayment>) => {
    const { data } = await supabase.from('budget_payments').update(updates).eq('id', payment.id).select().single();
    if (data) onUpdatePayments(payments.map(p => p.id === payment.id ? data : p));
  };

  const deletePayment = async (payment: BudgetPayment) => {
    const prev = payments;
    onUpdatePayments(payments.filter(p => p.id !== payment.id));
    const { error: err } = await supabase.from('budget_payments').delete().eq('id', payment.id);
    if (err) {
      onUpdatePayments(prev);
      showToast('Failed to delete payment', 'error');
      return;
    }
    showToast(`${payment.label} deleted`, 'deleted', () => {
      // Undo
      supabase.from('budget_payments').insert({
        budget_item_id: payment.budget_item_id, label: payment.label,
        amount: n(payment.amount), due_date: payment.due_date,
        paid_at: payment.paid_at, method_note: payment.method_note,
      }).select().single().then(({ data: d }) => {
        if (d) onUpdatePayments([...prev.filter(p => p.id !== payment.id), d]);
      });
      showToast(`${payment.label} restored`);
    });
  };

  // ===== Display helpers =====
  const sym = profile?.currency_symbol || '$';
  const money = (v: unknown) => `${sym}${fmt(v)}`;

  const catData = getCatTotals(items);
  const catTotals = catData.totals;
  const usedCategories = catData.categories;
  const catTotalSum = catData.total;
  const catUnmatched = catData.unmatched;
  const categoryTotalsMatch = Math.abs(Object.values(catTotals).reduce((sum, value) => sum + value, 0) - totalCommitted) < 0.01;
  const tabs = ['all', ...usedCategories];
  const filtered = activeTab === 'all' ? items : items.filter(i => {
    const canonicalSet = new Set<string>(CANONICAL_CATEGORIES);
    const cat = canonicalSet.has(i.category) ? i.category : 'Other';
    return cat === activeTab;
  });

  // Schedule view: flat list grouped by month
  const scheduleByMonth: { monthKey: string; monthLabel: string; payments: (BudgetPayment & { itemName: string })[] }[] = [];
  const allUnpaid = payments
    .filter(p => !p.paid_at && p.due_date)
    .map(p => ({ ...p, itemName: items.find(i => i.id === p.budget_item_id)?.item_name || 'Unknown' }))
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  allUnpaid.forEach(p => {
    const d = new Date(`${p.due_date}T00:00:00`);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    let group = scheduleByMonth.find(g => g.monthKey === monthKey);
    if (!group) { group = { monthKey, monthLabel, payments: [] }; scheduleByMonth.push(group); }
    group.payments.push(p);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Budget Tracker</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">Track every dollar of your wedding budget</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!isPro) { onShowPricing(); return; }
              exportBudgetPDF(items, {
                partner1: profile?.partner1_name || 'Partner 1',
                partner2: profile?.partner2_name || 'Partner 2',
                weddingDate: profile?.wedding_date || null,
              }, n(profile?.total_budget));
            }}
            className="flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-3 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors"
            title={isPro ? 'Export to PDF' : 'Pro feature'}
          >
            {!isPro && <Lock size={13} className="text-[#8a6d3b]" />}
            <Download size={14} /> Export PDF
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030] transition-colors">
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      {/* Free plan lock banner */}
      {!isPro && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#1a1510] to-[#2e2218] border border-[#c9a96e]/30 rounded-xl px-5 py-4">
          <Lock size={18} className="text-[#8a6d3b] flex-shrink-0" />
          <div className="flex-1">
            <div className="text-white text-sm font-medium">Unlock Pro features</div>
            <div className="text-[#a08050] text-xs mt-0.5">Add unlimited budget items, export PDF reports, and more</div>
          </div>
          <button onClick={onShowPricing} className="bg-[#8a6d3b] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#7a6030] transition-colors font-medium whitespace-nowrap">Upgrade to Pro</button>
        </div>
      )}

      {/* Summary cards — now derived from payments */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<DollarSign size={20} />} label="Total Committed" value={money(totalCommitted)} sub={`${items.length} items`} color="amber" />
        <SummaryCard icon={<CheckCircle size={20} />} label="Total Paid" value={money(totalPaidAll)} sub={`${payments.filter(p => p.paid_at).length} payments paid`} color="emerald" />
        <SummaryCard icon={<Clock size={20} />} label="Balance Due" value={money(totalBalanceDue)} sub={`${payments.filter(p => !p.paid_at).length} unpaid`} color="stone" />
        <SummaryCard
          icon={<AlertTriangle size={20} />}
          label="Due in 30 days"
          value={money(upcomingPayments.reduce((s, p) => s + n(p.amount), 0))}
          sub={upcomingPayments.length > 0 ? `${upcomingPayments.length} payment${upcomingPayments.length !== 1 ? 's' : ''}` : 'None upcoming'}
          color={upcomingPayments.length > 0 ? 'rose' : 'sky'}
        />
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('items')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'items' ? 'bg-[#8a6d3b] text-white' : 'border border-stone-200 text-[#5d4e3e] hover:bg-stone-50'}`}
        >
          Items View
        </button>
        <button
          onClick={() => setViewMode('schedule')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'schedule' ? 'bg-[#8a6d3b] text-white' : 'border border-stone-200 text-[#5d4e3e] hover:bg-stone-50'}`}
        >
          Payment Schedule
        </button>
      </div>

      {/* ===== SCHEDULE VIEW ===== */}
      {viewMode === 'schedule' && (
        <div className="space-y-4">
          {/* Overdue payments pinned at top */}
          {overduePayments.length > 0 && (
            <div className="bg-rose-50/50 border border-rose-200/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-rose-600" />
                <span className="text-rose-700 font-medium text-sm">Overdue</span>
                <span className="text-rose-600 text-xs bg-rose-100 px-2 py-0.5 rounded-full">{overduePayments.length}</span>
              </div>
              <div className="space-y-2">
                {overduePayments.map(p => {
                  const item = items.find(i => i.id === p.budget_item_id);
                  const days = daysUntilDate(p.due_date);
                  return (
                    <div key={p.id} className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-rose-200/60">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#2a1f15] truncate">{p.label}</div>
                        <div className="text-xs text-[#6b5d4f]">{item?.item_name || 'Unknown'} · {new Date(`${p.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-rose-600">{money(p.amount)}</div>
                        <div className="text-xs text-rose-500">{Math.abs(days ?? 0)}d overdue</div>
                      </div>
                      <button onClick={() => togglePaymentPaid(p)} className="flex-shrink-0 text-xs text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 rounded hover:bg-emerald-50">Mark paid</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grouped by month */}
          {scheduleByMonth.length === 0 && overduePayments.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-[#6b5d4f] text-sm">
              No upcoming payments scheduled. Expand a budget item to add a payment.
            </div>
          ) : (
            scheduleByMonth.map(group => (
              <div key={group.monthKey} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="bg-stone-50 border-b border-stone-100 px-5 py-3 flex items-center justify-between">
                  <span className="text-[#2a1f15] font-medium text-sm">{group.monthLabel}</span>
                  <span className="text-[#6b5d4f] text-xs">{money(group.payments.reduce((s, p) => s + n(p.amount), 0))}</span>
                </div>
                <div className="divide-y divide-stone-50">
                  {group.payments.map(p => {
                    const days = daysUntilDate(p.due_date);
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-stone-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[#2a1f15] truncate">{p.label}</div>
                          <div className="text-xs text-[#6b5d4f]">
                            {p.itemName} · {new Date(`${p.due_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {days !== null && days >= 0 && <span className="ml-1">· {days}d</span>}
                            {p.method_note && <span className="ml-1">· {p.method_note}</span>}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-[#2a1f15] flex-shrink-0">{money(p.amount)}</div>
                        <button onClick={() => togglePaymentPaid(p)} className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-stone-300 hover:border-emerald-400 flex items-center justify-center transition-colors" title="Mark paid">
                          <CheckCircle size={14} className="text-stone-300" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== ITEMS VIEW ===== */}
      {viewMode === 'items' && (
        <>
          {/* Budget bar */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#5d4e3e] font-medium">Budget Used</span>
              <span className="text-[#2a1f15] font-semibold">{n(profile?.total_budget) > 0 ? Math.min(100, Math.round((items.reduce((s, i) => s + n(i.estimated_cost), 0) / n(profile?.total_budget)) * 100)) : 0}%</span>
            </div>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${n(profile?.total_budget) > 0 ? Math.min(100, Math.round((items.reduce((s, i) => s + n(i.estimated_cost), 0) / n(profile?.total_budget)) * 100)) : 0}%`, background: 'linear-gradient(90deg, #c9a96e, #e8c88e)' }} />
            </div>
          </div>

          {/* Category donut */}
          {usedCategories.length > 0 && catTotalSum > 0 && (
            <>
              <BudgetDonut categories={usedCategories} catTotals={catTotals} total={catTotalSum} sym={sym} />
              {!categoryTotalsMatch && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-800">
                  Category totals do not match the committed budget. Please review your budget items.
                </div>
              )}
              {catUnmatched > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                  <span className="text-xs text-amber-800">
                    {fmtMoney(catUnmatched)} in non-standard categories is bucketed into "Other". Consider re-categorizing these items for cleaner reporting.
                  </span>
                </div>
              )}
            </>
          )}

          {/* Items table with expandable rows */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="border-b border-stone-100 px-4 py-3 flex gap-2 overflow-x-auto">
              {tabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors flex-shrink-0 ${activeTab === tab ? 'bg-[#8a6d3b] text-white' : 'text-[#5d4e3e] hover:bg-stone-50 border border-stone-200'}`}>
                  {tab === 'all' ? `All Items (${items.length})` : tab}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100 text-[#5d4e3e] text-xs uppercase tracking-wider">
                    <th className="px-2 py-3 w-8"></th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-right">Scheduled</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-center">Next Due</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const itemPayments = paymentsForItem(payments, item.id);
                    const sched = totalScheduled(itemPayments);
                    const paid = totalPaid(itemPayments);
                    const bal = balanceDue(itemPayments);
                    const next = nextPaymentDue(itemPayments);
                    const est = n(item.estimated_cost);
                    const overScheduled = sched > est && est > 0;
                    const isExpanded = expandedItem === item.id;
                    return (
                      <>
                        <tr key={item.id} className={`border-t border-stone-50 hover:bg-stone-50/50 transition-colors ${overScheduled ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-2 py-3 text-center">
                            <button aria-label={`${isExpanded ? 'Collapse' : 'Expand'} payment schedule for ${item.item_name}`} onClick={() => setExpandedItem(isExpanded ? null : item.id)} className="text-[#6b5d4f] hover:text-[#8a6d3b] p-1">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-[#2a1f15]">{item.item_name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="bg-stone-100 text-[#5d4e3e] px-2 py-0.5 rounded text-xs">{item.category}</span>
                              {item.vendor_id && (() => {
                                const v = vendors.find(vv => vv.id === item.vendor_id);
                                return v ? <span className="text-xs text-[#8a6d3b] flex items-center gap-0.5"><Link size={10} /> {v.business_name}</span> : null;
                              })()}
                              {overScheduled && (
                                <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <AlertTriangle size={10} /> Scheduled ${fmt(sched - est)} over estimate
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-[#2a1f15]">
                            {itemPayments.length > 0 ? money(sched) : <span className="text-[#6b5d4f]">—</span>}
                            {itemPayments.length > 0 && <div className="text-xs text-[#6b5d4f]">{itemPayments.length} payment{itemPayments.length !== 1 ? 's' : ''}</div>}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-700">
                            {paid > 0 ? money(paid) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={bal > 0 ? 'text-[#8a6d3b] font-medium' : 'text-emerald-600'}>
                              {bal > 0 ? money(bal) : itemPayments.length > 0 ? 'Paid' : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-[#5d4e3e]">
                            {next ? (
                              <div>
                                <div>{new Date(`${next.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                <div className="text-[#6b5d4f]">{money(n(next.amount))}</div>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button onClick={() => openEdit(item)} className="text-[#8a6d3b] hover:text-[#b8955a] text-xs font-medium">Edit</button>
                              <button aria-label={`Delete ${item.item_name}`} onClick={() => handleDelete(item.id, item.item_name)}>
                                <Trash2 size={14} className="text-rose-300 hover:text-rose-600 transition-colors" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${item.id}-expand`} className="bg-stone-50/40">
                            <td colSpan={7} className="px-4 py-4">
                              <PaymentSchedule
                                itemName={item.item_name}
                                payments={itemPayments}
                                estimatedCost={est}
                                sym={sym}
                                onAdd={(label, amount, dueDate, methodNote) => addPayment(item.id, label, amount, dueDate, methodNote)}
                                onTogglePaid={togglePaymentPaid}
                                onUpdate={updatePayment}
                                onDelete={deletePayment}
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-[#6b5d4f]">{items.length === 0 ? 'No budget items yet. Click "Add Item" to get started.' : `No items in the "${activeTab}" category.`}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Budget Item"
          message={`Are you sure you want to delete "${confirmDelete.name}"? All payment records for this item will also be removed. This cannot be undone.`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Add/Edit modal (unchanged) */}
      {showForm && (
        <BudgetItemModal
          form={form} setForm={setForm} editId={editId} saving={saving} error={error}
          categories={CATEGORIES} vendors={vendors} profile={profile}
          onSave={handleSave} onClose={() => { setShowForm(false); setEditId(null); }}
        />
      )}
    </div>
  );
}

// ===== Payment Schedule sub-component (expandable row content) =====

function PaymentSchedule({ itemName, payments, estimatedCost, sym, onAdd, onTogglePaid, onUpdate, onDelete }: {
  itemName: string;
  payments: BudgetPayment[];
  estimatedCost: number;
  sym: string;
  onAdd: (label: string, amount: string, dueDate: string, methodNote: string) => void;
  onTogglePaid: (p: BudgetPayment) => void;
  onUpdate: (p: BudgetPayment, updates: Partial<BudgetPayment>) => void;
  onDelete: (p: BudgetPayment) => void;
}) {
  const [showAddRow, setShowAddRow] = useState(false);
  const [newLabel, setNewLabel] = useState('Deposit');
  const [newAmount, setNewAmount] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newMethod, setNewMethod] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: '', amount: '', due_date: '', method_note: '' });
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<BudgetPayment | null>(null);

  const sched = totalScheduled(payments);
  const paid = totalPaid(payments);
  const bal = balanceDue(payments);
  const money = (v: unknown) => `${sym}${fmt(v)}`;

  const handleAdd = () => {
    onAdd(newLabel === 'Custom' ? 'Payment' : newLabel, newAmount, newDue, newMethod);
    setNewAmount(''); setNewDue(''); setNewMethod(''); setNewLabel('Deposit');
    setShowAddRow(false);
  };

  const startEdit = (p: BudgetPayment) => {
    setEditingId(p.id);
    setEditForm({ label: p.label, amount: String(n(p.amount)), due_date: p.due_date || '', method_note: p.method_note || '' });
  };

  const saveEdit = (p: BudgetPayment) => {
    onUpdate(p, {
      label: editForm.label,
      amount: n(editForm.amount),
      due_date: editForm.due_date || null,
      method_note: editForm.method_note,
    });
    setEditingId(null);
  };

  const handleDeletePayment = (p: BudgetPayment) => {
    setConfirmDeletePayment(p);
  };

  const confirmDeletePaymentAction = () => {
    if (!confirmDeletePayment) return;
    const p = confirmDeletePayment;
    setConfirmDeletePayment(null);
    onDelete(p);
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
      {/* Summary line */}
      <div className="flex items-center gap-4 px-4 py-3 bg-stone-50 border-b border-stone-100 text-xs">
        <span className="text-[#5d4e3e]"><strong className="text-[#2a1f15]">{payments.length}</strong> payments</span>
        <span className="text-[#5d4e3e]">Scheduled: <strong className="text-[#2a1f15]">{money(sched)}</strong></span>
        <span className="text-emerald-700">Paid: <strong>{money(paid)}</strong></span>
        <span className="text-[#8a6d3b]">Balance: <strong>{money(bal)}</strong></span>
        {sched > estimatedCost && estimatedCost > 0 && (
          <span className="text-amber-700 flex items-center gap-1 ml-auto">
            <AlertTriangle size={11} /> {money(sched - estimatedCost)} over {money(estimatedCost)} estimate
          </span>
        )}
      </div>

      {/* Payment rows */}
      <div className="divide-y divide-stone-50">
        {payments.length === 0 && !showAddRow && (
          <div className="px-4 py-6 text-center text-sm text-[#6b5d4f]">
            No payments scheduled for {itemName}.
          </div>
        )}
        {payments.map(p => (
          <div key={p.id} className="px-4 py-3 flex items-center gap-3 group hover:bg-stone-50/50 transition-colors">
            {editingId === p.id ? (
              // Inline edit mode
              <div className="flex-1 flex flex-wrap items-center gap-2">
                <input value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} className="border border-stone-200 rounded px-2 py-1 text-xs w-28" placeholder="Label" />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[#6b5d4f]">{sym}</span>
                  <input type="number" min="0" step="0.01" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} className="border border-stone-200 rounded pl-5 pr-2 py-1 text-xs w-24" placeholder="0" />
                </div>
                <input type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} className="border border-stone-200 rounded px-2 py-1 text-xs" />
                <input value={editForm.method_note} onChange={e => setEditForm(f => ({ ...f, method_note: e.target.value }))} className="border border-stone-200 rounded px-2 py-1 text-xs w-32" placeholder="Method note" />
                <button onClick={() => saveEdit(p)} className="text-xs text-emerald-600 font-medium px-2 py-1 hover:bg-emerald-50 rounded">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-[#6b5d4f] px-2 py-1 hover:bg-stone-100 rounded">Cancel</button>
              </div>
            ) : (
              <>
                <button aria-label={p.paid_at ? `Mark ${p.label} unpaid` : `Mark ${p.label} paid`} onClick={() => onTogglePaid(p)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${p.paid_at ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300 hover:border-emerald-400'}`}
                  title={p.paid_at ? 'Mark unpaid' : 'Mark paid'}>
                  {p.paid_at && <CheckCircle size={12} className="text-white fill-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#2a1f15]">
                    {p.label}
                    {p.paid_at && <span className="ml-2 text-xs text-emerald-600">Paid {new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                  <div className="text-xs text-[#6b5d4f]">
                    {p.due_date ? `Due ${new Date(`${p.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No due date'}
                    {p.method_note && ` · ${p.method_note}`}
                  </div>
                </div>
                <div className="text-sm font-semibold text-[#2a1f15] flex-shrink-0">{money(p.amount)}</div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button aria-label={`Edit payment ${p.label}`} onClick={() => startEdit(p)} className="p-1 text-[#6b5d4f] hover:text-[#8a6d3b]" title="Edit"><Pencil size={12} /></button>
                  <button aria-label={`Delete payment ${p.label}`} onClick={() => handleDeletePayment(p)} className="p-1 text-rose-300 hover:text-rose-600" title="Delete"><Trash2 size={12} /></button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add payment inline row */}
        {showAddRow ? (
          <div className="px-4 py-3 bg-amber-50/30 flex flex-wrap items-center gap-2">
            <select value={newLabel} onChange={e => setNewLabel(e.target.value)} className="border border-stone-200 rounded px-2 py-1.5 text-xs w-32">
              {PAYMENT_PRESETS.map(p => <option key={p}>{p}</option>)}
            </select>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[#6b5d4f]">{sym}</span>
              <input type="number" min="0" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className="border border-stone-200 rounded pl-5 pr-2 py-1.5 text-xs w-24" placeholder="0" autoFocus />
            </div>
            <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="border border-stone-200 rounded px-2 py-1.5 text-xs" />
            <input value={newMethod} onChange={e => setNewMethod(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className="border border-stone-200 rounded px-2 py-1.5 text-xs w-32" placeholder="Method (e.g. Check, Card)" />
            <button onClick={handleAdd} className="text-xs bg-[#8a6d3b] text-white px-3 py-1.5 rounded hover:bg-[#7a6030]">Add</button>
            <button onClick={() => setShowAddRow(false)} className="text-xs text-[#6b5d4f] px-2 py-1.5 hover:bg-stone-100 rounded">Cancel</button>
          </div>
        ) : (
          <div className="px-4 py-2">
            <button onClick={() => setShowAddRow(true)} className="text-xs text-[#8a6d3b] hover:text-[#b8955a] font-medium flex items-center gap-1">
              <Plus size={12} /> Add payment
            </button>
          </div>
        )}
      </div>

      {/* Payment delete confirmation */}
      {confirmDeletePayment && (
        <ConfirmDialog
          title="Delete Payment"
          message={`Delete "${confirmDeletePayment.label}" (${money(confirmDeletePayment.amount)})? You can undo this.`}
          onConfirm={confirmDeletePaymentAction}
          onCancel={() => setConfirmDeletePayment(null)}
        />
      )}
    </div>
  );
}

// ===== Budget Item Modal (extracted, unchanged logic) =====

function BudgetItemModal({ form, setForm, editId, saving, error, categories, vendors, profile, onSave, onClose }: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  editId: string | null;
  saving: boolean;
  error: string;
  categories: string[];
  vendors: Vendor[];
  profile: WeddingProfile | null;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[#2a1f15] font-serif text-xl">{editId ? 'Edit Budget Item' : 'Add Budget Item'}</h2>
          <button aria-label="Close budget item dialog" onClick={onClose}><X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" /></button>
        </div>
        {error && <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Item Name <span className="text-rose-500">*</span></label>
            <input value={form.item_name} onChange={e => { setForm(f => ({ ...f, item_name: e.target.value })); }} placeholder="e.g. Grand Ballroom Venue" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" autoFocus />
          </div>
          <div className="col-span-2">
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Estimated / Contracted Cost</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] text-sm">{profile?.currency_symbol || '$'}</span>
              <input type="number" min="0" step="0.01" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))} placeholder="0" className="w-full pl-7 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
            </div>
          </div>
          <div>
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Actual Cost (if known)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] text-sm">{profile?.currency_symbol || '$'}</span>
              <input type="number" min="0" step="0.01" value={form.actual_cost} onChange={e => setForm(f => ({ ...f, actual_cost: e.target.value }))} placeholder="0" className="w-full pl-7 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
            </div>
          </div>
          <div>
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Deposit Paid</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] text-sm">{profile?.currency_symbol || '$'}</span>
              <input type="number" min="0" step="0.01" value={form.deposit_paid} onChange={e => setForm(f => ({ ...f, deposit_paid: e.target.value }))} placeholder="0" className="w-full pl-7 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
            </div>
          </div>
          <div>
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Payment Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
          </div>
          <div className="col-span-2 bg-stone-50 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-[#5d4e3e] text-sm">Balance Due Preview:</span>
            <span className="text-[#8a6d3b] font-bold text-lg">{profile?.currency_symbol || '$'}{Math.max(0, n(form.estimated_cost) - n(form.deposit_paid)).toLocaleString()}</span>
          </div>
          <div className="col-span-2">
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Link to Vendor <span className="text-[#6b5d4f] normal-case">(optional — syncs price & deposit)</span></label>
            <select value={form.vendor_id} onChange={e => {
              const vid = e.target.value;
              const v = vendors.find(vv => vv.id === vid);
              setForm(f => ({ ...f, vendor_id: vid, ...(v ? { item_name: f.item_name || v.business_name, estimated_cost: n(v.price) || f.estimated_cost, actual_cost: n(v.price), deposit_paid: n(v.deposit_paid) } : {}) }));
            }} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
              <option value="">— None —</option>
              {vendors.filter(v => v.status !== 'cancelled').map(v => <option key={v.id} value={v.id}>{v.business_name} ({v.category}) {n(v.price) > 0 ? `· ${profile?.currency_symbol || '$'}${n(v.price).toLocaleString()}` : ''}</option>)}
            </select>
            {form.vendor_id && <p className="text-[#6b5d4f] text-xs mt-1 flex items-center gap-1"><Link size={11} /> Price and deposit will sync from the linked vendor</p>}
          </div>
          <div className="col-span-2">
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Paid by</label>
            <select value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
              <option value="couple">Couple</option>
              <option value="partner_1_family">{profile?.partner1_name || 'Partner 1'}'s family</option>
              <option value="partner_2_family">{profile?.partner2_name || 'Partner 2'}'s family</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Vendor name, confirmation number, etc." className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none" />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.checked }))} className="accent-[#c9a96e] w-4 h-4" />
              <span className="text-[#5d4e3e] text-sm">Mark as paid in full</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex-1 bg-[#8a6d3b] text-white py-2.5 rounded-lg text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50">{saving ? 'Saving…' : editId ? 'Update Item' : 'Add Item'}</button>
        </div>
      </div>
    </div>
  );
}

// ===== Donut + SummaryCard (unchanged) =====

const DONUT_COLORS = ['#c9a96e', '#2a9d8f', '#e76f51', '#457b9d', '#a8dadc', '#e9c46a', '#264653', '#f4a261', '#6a994e', '#bc6c25', '#8ecae6', '#219ebc', '#023047', '#ffb703', '#fb8500'];

function BudgetDonut({ categories, catTotals, total, sym }: { categories: string[]; catTotals: Record<string, number>; total: number; sym: string }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 68;
  const inner = 44;
  const [hovered, setHovered] = useState<string | null>(null);

  const slices: { cat: string; pct: number; start: number; end: number; color: string }[] = [];
  let cumulative = 0;
  categories.forEach((cat, i) => {
    const pct = catTotals[cat] / total;
    slices.push({ cat, pct, start: cumulative * 360, end: (cumulative + pct) * 360, color: DONUT_COLORS[i % DONUT_COLORS.length] });
    cumulative += pct;
  });

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arcPath = (start: number, end: number, outerR: number, innerR: number) => {
    if (end - start >= 360) {
      const p1 = polarToCartesian(0, outerR); const p2 = polarToCartesian(180, outerR);
      const p3 = polarToCartesian(180, innerR); const p4 = polarToCartesian(0, innerR);
      return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 1 1 ${p2.x} ${p2.y} A ${outerR} ${outerR} 0 1 1 ${p1.x} ${p1.y} M ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 1 0 ${p4.x} ${p4.y} A ${innerR} ${innerR} 0 1 0 ${p3.x} ${p3.y} Z`;
    }
    const startOuter = polarToCartesian(start, outerR); const endOuter = polarToCartesian(end, outerR);
    const startInner = polarToCartesian(end, innerR); const endInner = polarToCartesian(start, innerR);
    const large = end - start > 180 ? 1 : 0;
    return `M ${startOuter.x} ${startOuter.y} A ${outerR} ${outerR} 0 ${large} 1 ${endOuter.x} ${endOuter.y} L ${startInner.x} ${startInner.y} A ${innerR} ${innerR} 0 ${large} 0 ${endInner.x} ${endInner.y} Z`;
  };

  const hoveredSlice = slices.find(s => s.cat === hovered);

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <h2 className="text-[#2a1f15] font-medium mb-5">Spending by Category</h2>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex-shrink-0 relative">
          <svg width={size} height={size}>
            {slices.map(s => (
              <path key={s.cat} d={arcPath(s.start, s.end, hovered === s.cat ? r + 4 : r, inner)} fill={s.color} opacity={hovered && hovered !== s.cat ? 0.4 : 1} className="cursor-pointer transition-all duration-150" onMouseEnter={() => setHovered(s.cat)} onMouseLeave={() => setHovered(null)} />
            ))}
            <text x={cx} y={cy - 8} textAnchor="middle" className="text-xs" fill="#2a1f15" fontSize="11" fontWeight="600">{hoveredSlice ? (hoveredSlice.cat.length > 12 ? hoveredSlice.cat.slice(0, 11) + '…' : hoveredSlice.cat) : 'Budget'}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="#c9a96e" fontSize="14" fontWeight="700">{hoveredSlice ? `${Math.round(hoveredSlice.pct * 100)}%` : `${sym}${total.toLocaleString()}`}</text>
            {hoveredSlice && <text x={cx} y={cy + 26} textAnchor="middle" fill="#9a8a7a" fontSize="10">{sym}{catTotals[hoveredSlice.cat].toLocaleString()}</text>}
          </svg>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
          {slices.map((s, i) => (
            <button key={s.cat} onMouseEnter={() => setHovered(s.cat)} onMouseLeave={() => setHovered(null)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${hovered === s.cat ? 'bg-stone-50' : 'hover:bg-stone-50/60'}`}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="text-xs text-[#3a2e22] dark:text-[#e8dcc8] flex-1 truncate">{s.cat}</span>
              <span className="text-xs font-semibold text-[#2a1f15] dark:text-[#e8dcc8] whitespace-nowrap">{sym}{catTotals[s.cat].toLocaleString()}</span>
              <span className="text-xs text-[#6b5d4f] dark:text-[#a89878] w-8 text-right">{Math.round(s.pct * 100)}%</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
    stone: 'bg-stone-50 border-stone-200 text-stone-700',
  };
  return (
    <div className={`${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2 opacity-70">{icon}<span className="text-xs uppercase tracking-wider font-medium">{label}</span></div>
      <div className="font-serif text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );
}
