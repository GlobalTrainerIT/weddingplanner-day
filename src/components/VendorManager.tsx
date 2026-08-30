import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Star, CheckCircle, Phone, Mail, Globe, X, Lock, Zap, ShoppingBag, MapPin, Award, Search, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { n } from '../lib/utils';
import type { Vendor, WeddingProfile } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { showToast } from './Toast';
import ContractUpload from './ContractUpload';

const MARKETPLACE_VENDORS = [
  { id: 'm1', name: 'Golden Hour Photography', category: 'Photographer', location: 'New York, NY', priceRange: '$3,500 – $6,000', rating: 5, featured: true, blurb: 'Award-winning editorial style with 300+ weddings photographed.' },
  { id: 'm2', name: 'Bloom & Briar Florals', category: 'Florist', location: 'Brooklyn, NY', priceRange: '$2,000 – $5,000', rating: 5, featured: true, blurb: 'Lush garden-style arrangements. Farm-direct sustainable sourcing.' },
  { id: 'm3', name: 'The Grand Terrace', category: 'Venue', location: 'Manhattan, NY', priceRange: '$8,000 – $20,000', rating: 4, featured: true, blurb: 'Rooftop ballroom with panoramic city views. Up to 300 guests.' },
  { id: 'm4', name: 'Savor Catering Co.', category: 'Caterer', location: 'New York, NY', priceRange: '$85 – $150/person', rating: 5, featured: false, blurb: 'Farm-to-table menus. Custom tasting sessions available.' },
  { id: 'm5', name: 'DJ Maestro Events', category: 'DJ/Band', location: 'Queens, NY', priceRange: '$1,800 – $3,500', rating: 4, featured: false, blurb: 'Bilingual DJ, MC services, uplighting packages included.' },
  { id: 'm6', name: 'Vows & Verses Officiant', category: 'Officiant', location: 'New York, NY', priceRange: '$400 – $800', rating: 5, featured: false, blurb: 'Fully ordained. Custom ceremonies, elopements welcome.' },
  { id: 'm7', name: 'Elara Bridal Films', category: 'Videographer', location: 'Jersey City, NJ', priceRange: '$2,500 – $5,500', rating: 5, featured: true, blurb: 'Cinematic highlight reels. Drone footage included at no charge.' },
  { id: 'm8', name: 'Glow Artistry', category: 'Makeup Artist', location: 'New York, NY', priceRange: '$600 – $1,400', rating: 4, featured: false, blurb: 'Bridal beauty team. Airbrush, HD, and natural looks.' },
];

const MARKET_CATEGORIES = ['All', 'Photographer', 'Videographer', 'Florist', 'Venue', 'Caterer', 'DJ/Band', 'Officiant', 'Makeup Artist'];

function VendorMarketplace({ isPro, onShowPricing }: { isPro: boolean; onShowPricing: () => void }) {
  const [filterCat, setFilterCat] = useState('All');
  const [quoteVendor, setQuoteVendor] = useState<typeof MARKETPLACE_VENDORS[0] | null>(null);
  const [quoteName, setQuoteName] = useState('');
  const [quoteMsg, setQuoteMsg] = useState('');
  const [quoteSent, setQuoteSent] = useState(false);
  const filtered = filterCat === 'All' ? MARKETPLACE_VENDORS : MARKETPLACE_VENDORS.filter(v => v.category === filterCat);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-xl px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-[#8a6d3b] font-medium text-sm">Vendor Marketplace</div>
          <div className="text-[#6b5d4f] text-xs mt-0.5">Browse vetted vendors in your area</div>
        </div>
        <ShoppingBag size={20} className="text-[#8a6d3b]" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {MARKET_CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${filterCat === c ? 'bg-[#8a6d3b] text-white' : 'border border-stone-200 text-[#5d4e3e] hover:bg-stone-50'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(v => (
          <div key={v.id} className="bg-white border border-stone-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative">
            {v.featured && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#8a6d3b] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                <Award size={10} /> Featured
              </div>
            )}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#c9a96e]/10 flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={16} className="text-[#8a6d3b]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[#2a1f15] font-semibold text-sm leading-tight">{v.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-[#8a6d3b] bg-[#c9a96e]/10 px-2 py-0.5 rounded-full">{v.category}</span>
                </div>
              </div>
            </div>
            <p className="text-[#5d4e3e] text-xs mb-3 leading-relaxed">{v.blurb}</p>
            <div className="flex items-center gap-3 mb-4 text-xs text-[#6b5d4f]">
              <span className="flex items-center gap-1"><MapPin size={11} />{v.location}</span>
              <span className="text-[#8a6d3b] font-medium">{v.priceRange}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= v.rating ? 'text-[#8a6d3b] fill-[#c9a96e]' : 'text-stone-200'} />)}
              </div>
              <button
                onClick={() => {
                  if (!isPro) { onShowPricing(); return; }
                  setQuoteVendor(v);
                  setQuoteName('');
                  setQuoteMsg('');
                  setQuoteSent(false);
                }}
                className="flex items-center gap-1.5 bg-[#8a6d3b] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#7a6030] transition-colors font-medium"
              >
                {!isPro && <Lock size={11} />} Get a Quote
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#faf9f7] border border-stone-200 rounded-xl p-5 text-center">
        <div className="text-[#2a1f15] font-medium text-sm mb-1">Want to be listed here?</div>
        <div className="text-[#6b5d4f] text-xs mb-3">We're building our marketplace. Vendors can apply to be featured.</div>
        <button className="text-[#8a6d3b] text-xs border border-[#c9a96e]/40 px-4 py-1.5 rounded-lg hover:bg-[#c9a96e]/5 transition-colors">
          Apply to be listed
        </button>
      </div>

      {/* Quote modal */}
      {quoteVendor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setQuoteVendor(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#2a1f15] font-serif text-xl">Request a Quote</h3>
              <button onClick={() => setQuoteVendor(null)} className="text-[#6b5d4f] hover:text-[#2a1f15]"><X size={18} /></button>
            </div>
            {quoteSent ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={22} className="text-emerald-600" />
                </div>
                <p className="text-[#2a1f15] font-medium mb-1">Quote request sent!</p>
                <p className="text-[#6b5d4f] text-sm">We've forwarded your inquiry to <strong>{quoteVendor.name}</strong>. They'll be in touch soon.</p>
                <button onClick={() => setQuoteVendor(null)} className="mt-5 bg-[#8a6d3b] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors">Done</button>
              </div>
            ) : (
              <>
                <div className="bg-stone-50 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#c9a96e]/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={15} className="text-[#8a6d3b]" />
                  </div>
                  <div>
                    <div className="text-[#2a1f15] font-medium text-sm">{quoteVendor.name}</div>
                    <div className="text-[#6b5d4f] text-xs">{quoteVendor.category} · {quoteVendor.priceRange}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Your Name</label>
                    <input value={quoteName} onChange={e => setQuoteName(e.target.value)} placeholder="e.g. Sarah & James" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
                  </div>
                  <div>
                    <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Message</label>
                    <textarea value={quoteMsg} onChange={e => setQuoteMsg(e.target.value)} rows={3} placeholder="Tell them about your wedding date, guest count, and any special requests..." className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none" />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setQuoteVendor(null)} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors">Cancel</button>
                  <button
                    onClick={() => { if (quoteName.trim()) setQuoteSent(true); }}
                    disabled={!quoteName.trim()}
                    className="flex-1 bg-[#8a6d3b] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#7a6030] transition-colors disabled:opacity-50"
                  >
                    Send Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const FREE_VENDOR_LIMIT = 5;

interface Props {
  vendors: Vendor[];
  onUpdate: (vendors: Vendor[]) => void;
  profile: WeddingProfile | null;
  isPro: boolean;
  onShowPricing: () => void;
  triggerAddVendor?: number;
  budgetItems?: import('../types').BudgetItem[];
  onBudgetItemAdded?: (item: import('../types').BudgetItem) => void;
  onBudgetItemUpdated?: (item: import('../types').BudgetItem) => void;
}

const CATEGORIES = ['Venue', 'Catering', 'Photographer', 'Videographer', 'Florist', 'DJ/Band', 'Makeup Artist', 'Hair Stylist', 'Officiant', 'Planner/Coordinator', 'Transportation', 'Rentals', 'Bakery', 'Other'];
const STATUSES = ['researching', 'contacted', 'quoted', 'booked', 'paid', 'cancelled'];

const empty: Omit<Vendor, 'id' | 'wedding_id'> = {
  category: 'Venue', business_name: '', contact_name: '', email: '', phone: '',
  website: '', price: 0, deposit_paid: 0, balance_due: 0, contract_signed: false,
  payment_due_date: null, status: 'researching', rating: 0, notes: '',
  contract_file_path: null,
};

const statusColors: Record<string, string> = {
  researching: 'bg-stone-100 text-stone-600',
  contacted: 'bg-sky-100 text-sky-700',
  quoted: 'bg-amber-100 text-amber-700',
  booked: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

// Map vendor category to a budget-friendly category name
const vendorCategoryToBudget: Record<string, string> = {
  'Venue': 'Venue', 'Catering': 'Catering', 'Photographer': 'Photography',
  'Videographer': 'Videography', 'Florist': 'Florals', 'DJ/Band': 'Music/DJ',
  'Makeup Artist': 'Beauty', 'Hair Stylist': 'Beauty', 'Officiant': 'Officiant',
  'Planner/Coordinator': 'Planning', 'Transportation': 'Transportation',
  'Rentals': 'Rentals', 'Bakery': 'Cake/Bakery', 'Other': 'Miscellaneous',
};

const CREATE_NEW = '__create_new__';

export default function VendorManager({ vendors, onUpdate, profile, isPro, onShowPricing, triggerAddVendor, budgetItems = [], onBudgetItemAdded, onBudgetItemUpdated }: Props) {
  const weddingId = profile?.id || '';
  const [activeTab, setActiveTab] = useState<'my' | 'browse'>('my');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [linkedBudgetItemId, setLinkedBudgetItemId] = useState<string>('');
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const atLimit = !isPro && vendors.length >= FREE_VENDOR_LIMIT;

  useEffect(() => {
    if (triggerAddVendor && triggerAddVendor > 0) {
      if (atLimit) { onShowPricing(); return; }
      setForm({ ...empty }); setEditId(null); setLinkedBudgetItemId(''); setShowForm(true);
    }
  }, [triggerAddVendor]);

  const totalVendorCost = vendors.reduce((s, v) => s + n(v.price), 0);
  const booked = vendors.filter(v => v.status === 'booked' || v.status === 'paid').length;
  const contracted = vendors.filter(v => v.contract_signed).length;
  const withContractFile = vendors.filter(v => v.contract_file_path).length;

  const createBudgetItemForVendor = async (vendorName: string, category: string, price: number, depositPaid: number) => {
    if (!onBudgetItemAdded) return;
    const budgetCategory = vendorCategoryToBudget[category] ?? category;
    const { data } = await supabase.from('budget_items').insert({
      wedding_id: weddingId,
      category: budgetCategory,
      item_name: vendorName,
      estimated_cost: price,
      actual_cost: price,
      deposit_paid: depositPaid,
      balance_due: Math.max(0, price - depositPaid),
      paid: false,
      notes: `Linked from vendor: ${vendorName}`,
    }).select().single();
    if (data) {
      onBudgetItemAdded(data);
      showToast(`Budget item created for ${vendorName}`);
    }
  };

  const handleSave = async () => {
    const price = n(form.price);
    const depositPaid = n(form.deposit_paid);
    const payload = { wedding_id: weddingId, ...form, balance_due: Math.max(0, price - depositPaid) };

    if (editId) {
      const { data } = await supabase.from('vendors').update(payload).eq('id', editId).select().single();
      if (data) {
        onUpdate(vendors.map(v => v.id === editId ? data : v));
        // Handle budget link from edit modal
        if (linkedBudgetItemId === CREATE_NEW && price > 0) {
          await createBudgetItemForVendor(form.business_name, form.category, price, depositPaid);
        } else if (linkedBudgetItemId && linkedBudgetItemId !== CREATE_NEW && price > 0 && onBudgetItemUpdated) {
          const { data: budgetData } = await supabase
            .from('budget_items').update({ actual_cost: price, deposit_paid: depositPaid, balance_due: Math.max(0, price - depositPaid) }).eq('id', linkedBudgetItemId).select().single();
          if (budgetData) { onBudgetItemUpdated(budgetData); showToast('Budget item updated'); }
        } else {
          showToast('Vendor updated');
        }
      }
    } else {
      const { data } = await supabase.from('vendors').insert(payload).select().single();
      if (data) {
        onUpdate([...vendors, data]);
        const vendorName = data.business_name;
        const category = form.category;
        if (linkedBudgetItemId === CREATE_NEW && price > 0) {
          await createBudgetItemForVendor(vendorName, category, price, depositPaid);
        } else if (linkedBudgetItemId && linkedBudgetItemId !== CREATE_NEW && price > 0 && onBudgetItemUpdated) {
          const { data: budgetData } = await supabase
            .from('budget_items').update({ actual_cost: price, deposit_paid: depositPaid, balance_due: Math.max(0, price - depositPaid) }).eq('id', linkedBudgetItemId).select().single();
          if (budgetData) { onBudgetItemUpdated(budgetData); showToast('Budget item updated'); }
        } else if (price > 0 && onBudgetItemAdded) {
          showToast(
            `${vendorName} added. Add $${price.toLocaleString()} to your budget?`,
            'success',
            undefined,
            [{ label: 'Add to Budget', onClick: () => createBudgetItemForVendor(vendorName, category, price, depositPaid) }],
            8000
          );
        } else {
          showToast('Vendor added');
        }
      }
    }
    setLinkedBudgetItemId('');
    setForm({ ...empty }); setShowForm(false); setEditId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmDelete({ id, name });
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const deleted = vendors.find(v => v.id === confirmDelete.id);
    const afterDelete = vendors.filter(v => v.id !== confirmDelete.id);
    await supabase.from('vendors').delete().eq('id', confirmDelete.id);
    onUpdate(afterDelete);
    showToast(`${confirmDelete.name} deleted`, 'deleted', deleted ? async () => {
      const { data } = await supabase.from('vendors').upsert(deleted).select().single();
      if (data) onUpdate([...afterDelete, data]);
      else showToast('Could not restore vendor', 'error');
    } : undefined);
    setConfirmDelete(null);
  };

  const updateStatus = async (id: string, status: string) => {
    const { data } = await supabase.from('vendors').update({ status }).eq('id', id).select().single();
    if (data) onUpdate(vendors.map(v => v.id === id ? data : v));
  };

  const openAdd = () => {
    if (atLimit) { onShowPricing(); return; }
    setForm({ ...empty }); setEditId(null); setLinkedBudgetItemId(''); setShowForm(true);
  };

  const cats = ['all', ...Array.from(new Set(vendors.map(v => v.category))).sort()];
  const filtered = vendors
    .filter(v => filterCat === 'all' || v.category === filterCat)
    .filter(v => !search.trim() || v.business_name.toLowerCase().includes(search.toLowerCase()) || (v.contact_name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Vendors</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">
            {isPro
              ? 'Track all your wedding vendors in one place'
              : <span>{vendors.length} / {FREE_VENDOR_LIMIT} vendors <span className="text-[#8a6d3b]">(free limit)</span></span>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'my' && (
            atLimit ? (
              <button onClick={onShowPricing} className="flex items-center gap-2 bg-gradient-to-r from-[#c9a96e] to-[#b8955a] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity">
                <Lock size={14} /> Upgrade
              </button>
            ) : (
              <button onClick={openAdd} className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030]">
                <Plus size={15} /> Add Vendor
              </button>
            )
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('my')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'my' ? 'bg-white text-[#2a1f15] shadow-sm' : 'text-[#5d4e3e] hover:text-[#2a1f15]'}`}>
          My Vendors
        </button>
        <button onClick={() => setActiveTab('browse')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'browse' ? 'bg-white text-[#2a1f15] shadow-sm' : 'text-[#5d4e3e] hover:text-[#2a1f15]'}`}>
          <ShoppingBag size={14} /> Find Vendors
        </button>
      </div>

      {activeTab === 'browse' && <VendorMarketplace isPro={isPro} onShowPricing={onShowPricing} />}

      {activeTab === 'my' && <>

      {/* Free limit banner */}
      {atLimit && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#1a1510] to-[#2e2218] border border-[#c9a96e]/30 rounded-xl px-5 py-4">
          <Lock size={18} className="text-[#8a6d3b] flex-shrink-0" />
          <div className="flex-1">
            <div className="text-white text-sm font-medium">You've reached the 5 vendor limit on the free plan</div>
            <div className="text-[#a08050] text-xs mt-0.5">Upgrade to Pro for unlimited vendors</div>
          </div>
          <button onClick={onShowPricing} className="flex items-center gap-1.5 bg-[#8a6d3b] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#7a6030] transition-colors font-medium whitespace-nowrap">
            <Zap size={12} /> Upgrade to Pro
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <div className="text-xs text-[#5d4e3e] uppercase tracking-wider mb-1">Total Vendors</div>
          <div className="font-serif text-2xl font-bold text-[#2a1f15]">{vendors.length}{!isPro && <span className="text-[#6b5d4f] text-sm font-normal"> / {FREE_VENDOR_LIMIT}</span>}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-xs text-emerald-700 uppercase tracking-wider mb-1">Booked</div>
          <div className="font-serif text-2xl font-bold text-emerald-800">{booked}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-xs text-amber-700 uppercase tracking-wider mb-1">Total Cost</div>
          <div className="font-serif text-2xl font-bold text-amber-800">${totalVendorCost.toLocaleString()}</div>
        </div>
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
          <div className="text-xs text-sky-700 uppercase tracking-wider mb-1">Contracts Signed</div>
          <div className="font-serif text-2xl font-bold text-sky-800">{contracted} of {vendors.length} signed<span className="text-[#6b5d4f] text-sm font-normal"> · {withContractFile} attached</span></div>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f]" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vendors by name…"
            className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] hover:text-[#2a1f15]">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${filterCat === c ? 'bg-[#8a6d3b] text-white' : 'border border-stone-200 text-[#5d4e3e] hover:bg-stone-50'}`}>
              {c === 'all' ? 'All Vendors' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(v => (
          <div key={v.id} className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="bg-stone-100 text-[#5d4e3e] text-xs px-2 py-0.5 rounded">{v.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[v.status]}`}>{v.status}</span>
                </div>
                <h3 className="text-[#2a1f15] font-medium text-lg">{v.business_name}</h3>
                {v.contact_name && <p className="text-[#6b5d4f] text-xs">{v.contact_name}</p>}
              </div>
              <div className="flex gap-1 items-center">
                {v.contract_file_path && <span title={v.contract_signed ? 'Contract signed' : 'Contract attached (not signed)'}><FileText size={14} className={v.contract_signed ? 'text-emerald-500' : 'text-amber-500'} /></span>}
                {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= v.rating ? 'text-[#8a6d3b] fill-[#c9a96e]' : 'text-stone-200'} />)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              {v.phone && <a href={`tel:${v.phone}`} className="flex items-center gap-1 text-[#5d4e3e] hover:text-[#8a6d3b]"><Phone size={12} />{v.phone}</a>}
              {v.email && <a href={`mailto:${v.email}`} className="flex items-center gap-1 text-[#5d4e3e] hover:text-[#8a6d3b]"><Mail size={12} />{v.email}</a>}
              {v.website && <span className="flex items-center gap-1 text-[#5d4e3e]"><Globe size={12} />{v.website}</span>}
            </div>
            <div className="bg-stone-50 rounded-lg p-3 mb-3 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-[#6b5d4f] text-xs">Price</div><div className="text-[#2a1f15] font-medium text-sm">${n(v.price).toLocaleString()}</div></div>
              <div><div className="text-[#6b5d4f] text-xs">Deposit</div><div className="text-emerald-700 font-medium text-sm">${n(v.deposit_paid).toLocaleString()}</div></div>
              <div><div className="text-[#6b5d4f] text-xs">Balance</div><div className="text-[#8a6d3b] font-medium text-sm">${n(v.balance_due).toLocaleString()}</div></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-[#5d4e3e] cursor-pointer">
                  <input type="checkbox" checked={v.contract_signed} onChange={async e => {
                    const { data } = await supabase.from('vendors').update({ contract_signed: e.target.checked }).eq('id', v.id).select().single();
                    if (data) onUpdate(vendors.map(x => x.id === v.id ? data : x));
                  }} className="accent-[#c9a96e]" />
                  <CheckCircle size={12} /> Contract
                </label>
                <select value={v.status} onChange={e => updateStatus(v.id, e.target.value)} className="text-xs border border-stone-200 rounded px-2 py-1 focus:outline-none">
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setExpandedVendor(expandedVendor === v.id ? null : v.id)} className="text-[#5d4e3e] text-xs hover:text-[#2a1f15] flex items-center gap-0.5">
                  {expandedVendor === v.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Contract
                </button>
                <button onClick={() => { setForm({...v}); setEditId(v.id); setLinkedBudgetItemId(''); setShowForm(true); }} className="text-[#8a6d3b] text-xs hover:underline">Edit</button>
                <button onClick={() => handleDelete(v.id, v.business_name)}><Trash2 size={13} className="text-rose-400 hover:text-rose-600" /></button>
              </div>
            </div>
            {v.notes && <p className="mt-2 text-[#6b5d4f] text-xs border-t border-stone-100 pt-2">{v.notes}</p>}
            {expandedVendor === v.id && (
              <div className="mt-3 border-t border-stone-100 pt-3">
                <div className="text-xs text-[#5d4e3e] uppercase tracking-wider mb-2 font-medium">Contract</div>
                <ContractUpload vendor={v} weddingId={weddingId} onVendorUpdated={(updated) => onUpdate(vendors.map(x => x.id === v.id ? updated : x))} />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-[#6b5d4f]">
            <p>No vendors added yet. Click "Add Vendor" to start building your vendor list.</p>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Vendor"
          message={`Are you sure you want to delete "${confirmDelete.name}"? This cannot be undone.`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#2a1f15] font-serif text-xl">{editId ? 'Edit Vendor' : 'Add Vendor'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#6b5d4f]" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              {[['Business Name','business_name'],['Contact Name','contact_name'],['Email','email'],['Phone','phone'],['Website','website']].map(([label, key]) => (
                <div key={key}>
                  <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">{label}</label>
                  <input value={(form as unknown as Record<string, string>)[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
                </div>
              ))}
              {[['Price','price'],['Deposit Paid','deposit_paid']].map(([label, key]) => (
                <div key={key}>
                  <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">{label}</label>
                  <input type="number" value={(form as unknown as Record<string, number>)[key] || 0} onChange={e => setForm(f => ({...f, [key]: parseFloat(e.target.value) || 0}))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
                </div>
              ))}
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Payment Due Date</label>
                <input type="date" value={form.payment_due_date || ''} onChange={e => setForm(f => ({...f, payment_due_date: e.target.value || null}))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
              </div>
              <div>
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Rating (1–5)</label>
                <div className="flex gap-2 py-2">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({...f, rating: s}))}>
                      <Star size={20} className={s <= form.rating ? 'text-[#8a6d3b] fill-[#c9a96e]' : 'text-stone-300'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="contract" checked={form.contract_signed} onChange={e => setForm(f => ({...f, contract_signed: e.target.checked}))} className="accent-[#c9a96e]" />
                <label htmlFor="contract" className="text-[#5d4e3e] text-sm">Contract Signed</label>
              </div>
            </div>
            {editId && (
              <div className="mt-2 border-t border-stone-100 pt-4">
                <div className="text-xs text-[#5d4e3e] uppercase tracking-wider mb-2 font-medium">Contract File</div>
                <ContractUpload
                  vendor={vendors.find(x => x.id === editId)!}
                  weddingId={weddingId}
                  onVendorUpdated={(updated) => { onUpdate(vendors.map(x => x.id === updated.id ? updated : x)); setForm(f => ({...f, contract_signed: updated.contract_signed, contract_file_path: updated.contract_file_path })); }}
                />
              </div>
            )}
            {n(form.price) > 0 && (
              <div className="mt-4">
                <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Link to Budget Category (optional)</label>
                <select
                  value={linkedBudgetItemId}
                  onChange={e => setLinkedBudgetItemId(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                >
                  <option value="">— Don't sync to budget —</option>
                  <option value={CREATE_NEW}>＋ Create new budget item for this vendor</option>
                  {budgetItems.map(b => (
                    <option key={b.id} value={b.id}>{b.category} — {b.item_name} (est. ${n(b.estimated_cost).toLocaleString()})</option>
                  ))}
                </select>
                {linkedBudgetItemId === CREATE_NEW && (
                  <p className="text-xs text-[#8a6d3b] mt-1">A new budget item will be created with this vendor's price as the estimated & actual cost.</p>
                )}
                {linkedBudgetItemId && linkedBudgetItemId !== CREATE_NEW && (
                  <p className="text-xs text-[#8a6d3b] mt-1">The selected budget item's Actual Cost will be updated to ${n(form.price).toLocaleString()}.</p>
                )}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-[#8a6d3b] text-white py-2 rounded-lg text-sm hover:bg-[#7a6030]">Save Vendor</button>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
