import { useState } from 'react';
import {
  Heart, ArrowRight, ChevronRight, Download, Copy, Check, Printer,
  Plus, Trash2, Users, Calendar, Clock, MapPin, Hash, DollarSign,
  Store, FileText, Sparkles, X, Share2, Camera, Music2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';
import { track } from '../lib/analytics';

// ─── Shared layout ──────────────────────────────────────────

interface ToolLayoutProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onGetStarted: () => void;
  supportingContent: React.ReactNode;
  breadcrumb: string;
}

function ToolLayout({ icon, title, subtitle, children, onGetStarted, supportingContent, breadcrumb }: ToolLayoutProps) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <Heart size={18} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <span className="font-serif text-2xl text-[#2a1f15]">Vow</span>
          </a>
          <div className="hidden md:flex items-center gap-6 text-sm text-[#5d4e3e]">
            <a href="/#features" className="hover:text-[#8a6d3b] transition-colors">Features</a>
            <a href="/blog" className="hover:text-[#8a6d3b] transition-colors">Blog</a>
            <a href="/tools/wedding-budget-calculator" className="hover:text-[#8a6d3b] transition-colors">Tools</a>
          </div>
          <button onClick={onGetStarted} className="flex items-center gap-2 bg-[#8a6d3b] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#7a6030] transition-colors">
            Start planning free <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-[#6b5d4f]">
        <a href="/" className="hover:text-[#8a6d3b] transition-colors">Home</a> <span className="mx-1">/</span> <a href="/tools/wedding-budget-calculator" className="hover:text-[#8a6d3b] transition-colors">Tools</a> <span className="mx-1">/</span> <span className="text-[#8a6d3b]">{breadcrumb}</span>
      </div>

      <section className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] py-16 px-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-2xl mb-5">
          <span className="text-[#c9a96e]">{icon}</span>
        </div>
        <h1 className="text-white font-serif text-3xl md:text-4xl mb-3">{title}</h1>
        <p className="text-[#a08050] text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-12">
        {children}

        <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-2xl p-6 text-center mt-12">
          <Heart size={20} className="text-[#8a6d3b] fill-[#c9a96e] mx-auto mb-3" />
          <h3 className="text-white font-serif text-xl mb-2">Save your progress — start free</h3>
          <p className="text-[#a08050] text-sm mb-4">Create a free Vow account to sync this across devices and unlock the full budget tracker, guest list, seating chart, and more.</p>
          <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors">
            Start planning free <ChevronRight size={14} />
          </button>
        </div>
      </section>

      <section className="bg-[#faf9f7] py-12 px-6">
        <div className="max-w-3xl mx-auto">
          {supportingContent}
        </div>
      </section>

      <footer className="bg-[#1a1510] text-white py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Heart size={18} className="text-[#8a6d3b] fill-[#c9a96e]" />
          <span className="font-serif text-2xl">Vow</span>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-[#c0a880]">
          <a href="/" className="hover:text-[#8a6d3b] transition-colors">Home</a>
          <a href="/features/budget-tracker" className="hover:text-[#8a6d3b] transition-colors">Budget Tracker</a>
          <a href="/features/guest-list" className="hover:text-[#8a6d3b] transition-colors">Guest List</a>
          <a href="/blog" className="hover:text-[#8a6d3b] transition-colors">Blog</a>
        </div>
        <div className="mt-4 text-[#a08868] text-xs">&copy; {new Date().getFullYear()} Vow Wedding Planner</div>
      </footer>
    </div>
  );
}

// ─── Email capture ──────────────────────────────────────────

function EmailCapture({ source }: { source: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    track('email_captured', { source });
    try {
      await supabase.from('leads').insert({ email: email.trim(), source });
    } catch { /* ignore — email capture is best-effort */ }
    setSent(true);
    setLoading(false);
  }

  if (sent) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
      <Check size={20} className="text-emerald-600 mx-auto mb-2" />
      <p className="text-emerald-800 text-sm font-medium">You're all set!</p>
      <p className="text-emerald-700 text-xs mt-1">We saved your progress in this browser. Create a free account to sync across devices.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="bg-stone-50 border border-stone-200 rounded-xl p-4">
      <p className="text-[#5d4e3e] text-sm mb-3">Enter your email to save your progress:</p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
        />
        <button type="submit" disabled={loading || !email.trim()} className="bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#7a6030] disabled:opacity-50 transition-colors">
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

// ─── Related links ──────────────────────────────────────────

function RelatedLinks({ links }: { links: { label: string; href: string; cat: string }[] }) {
  return (
    <div className="mt-8">
      <h3 className="text-[#2a1f15] font-serif text-lg mb-3">Related reading</h3>
      <div className="grid md:grid-cols-2 gap-3">
        {links.map(l => (
          <a key={l.href} href={l.href} className="block p-4 border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
            <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">{l.cat}</span>
            <p className="text-[#2a1f15] text-sm font-medium mt-2">{l.label}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Share button ────────────────────────────────────────────

function ShareButton({ getText, imageName }: { getText: () => string; imageName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    track('tool_shared', { tool: imageName });
    const text = getText();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Vow wedding planning result', text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text}\n\n${window.location.href}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast('Copied to clipboard');
      }
    } catch { /* user cancelled */ }
  }

  return (
    <button onClick={share} className="inline-flex items-center gap-2 border-2 border-[#c9a96e] text-[#8a6d3b] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#c9a96e]/5 transition-colors">
      {copied ? <Check size={14} /> : <Share2 size={14} />}
      {copied ? 'Copied!' : 'Share result'}
    </button>
  );
}

function PrintButton() {
  return (
    <button onClick={() => { track('tool_printed', {}); window.print(); }} className="inline-flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-4 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors">
      <Printer size={14} /> Print
    </button>
  );
}

// ─── CSV download helper ────────────────────────────────────

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) { showToast('No data to export', 'error'); return; }
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV downloaded');
}

// ─── 1. Seating Chart Maker ─────────────────────────────────

export function SeatingChartMakerTool({ onGetStarted }: { onGetStarted: () => void }) {
  const [tables, setTables] = useState<{ id: string; name: string; capacity: number; guests: string[] }[]>([
    { id: '1', name: 'Table 1', capacity: 8, guests: [] },
  ]);
  const [guestInput, setGuestInput] = useState('');
  const [activeTable, setActiveTable] = useState<string | null>('1');

  function addTable() {
    const id = String(Date.now());
    setTables(prev => [...prev, { id, name: `Table ${prev.length + 1}`, capacity: 8, guests: [] }]);
    setActiveTable(id);
  }

  function removeTable(id: string) {
    setTables(prev => prev.filter(t => t.id !== id));
  }

  function addGuest(tableId: string) {
    if (!guestInput.trim()) return;
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      if (t.guests.length >= t.capacity) return t;
      return { ...t, guests: [...t.guests, guestInput.trim()] };
    }));
    setGuestInput('');
  }

  function removeGuest(tableId: string, idx: number) {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, guests: t.guests.filter((_, i) => i !== idx) } : t));
  }

  function updateCapacity(tableId: string, cap: number) {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, capacity: Math.max(1, cap) } : t));
  }

  const totalGuests = tables.reduce((s, t) => s + t.guests.length, 0);

  function exportCSV() {
    const rows = tables.flatMap(t => t.guests.map(g => ({ Table: t.name, Guest: g })));
    downloadCSV('wedding-seating-chart.csv', rows);
  }

  return (
    <ToolLayout
      icon={<Users size={28} />}
      title="Wedding Seating Chart Maker"
      subtitle="Add tables, assign guests, and print a clean chart for your venue. No account needed."
      breadcrumb="Seating Chart Maker"
      onGetStarted={onGetStarted}
      supportingContent={<>
        <h2 className="text-[#2a1f15] font-serif text-2xl mb-4">How to plan your wedding seating chart</h2>
        <div className="space-y-4 text-[#5d4e3e] text-sm leading-relaxed">
          <p>Your seating chart is one of the last things you'll finalize before the wedding — usually 1-2 weeks after your RSVP deadline closes. Here's how to approach it:</p>
          <p><strong className="text-[#2a1f15]">Start with your confirmed guest list.</strong> Only seat guests who have RSVP'd "yes." Seating declined guests wastes time and creates confusion for your venue.</p>
          <p><strong className="text-[#2a1f15]">Know your table shapes and sizes.</strong> Round tables typically seat 8-10 guests; rectangular tables seat 6-8. Check with your venue on exact capacity and layout before you start assigning.</p>
          <p><strong className="text-[#2a1f15]">Seat family first.</strong> Parents, grandparents, and siblings go closest to the head table. Honor tables and family tables should be near the action but not crammed together — older relatives appreciate being away from speakers.</p>
          <p><strong className="text-[#2a1f15]">Group by relationship, not alphabetically.</strong> Seat college friends together, work friends together, and extended family by branch. Mix plus-ones into the table naturally rather than isolating them.</p>
          <p><strong className="text-[#2a1f15]">Avoid "singles" tables.</strong> Don't put all the single guests at one table unless they already know each other. Mix them into tables with friendly couples or groups.</p>
          <p><strong className="text-[#2a1f15]">Print multiple copies.</strong> Give one to your venue coordinator, one to your day-of coordinator, and post one at the entrance to the reception. A printed chart eliminates confusion at the door.</p>
        </div>
        <RelatedLinks links={[
          { label: 'Wedding Guest List Etiquette: Who to Invite', href: '/blog/guest-list-etiquette', cat: 'Guests' },
          { label: 'Building the Perfect Wedding Day Timeline', href: '/blog/wedding-day-timeline', cat: 'Planning' },
        ]} />
      </>}
    >
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[#2a1f15] font-serif text-xl">Your seating chart</h2>
            <p className="text-[#6b5d4f] text-xs mt-1">{tables.length} tables · {totalGuests} guests seated</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="inline-flex items-center gap-1.5 border border-stone-200 text-[#5d4e3e] px-3 py-1.5 rounded-lg text-xs hover:bg-stone-50 transition-colors">
              <Download size={13} /> CSV
            </button>
            <PrintButton />
          </div>
        </div>

        <div className="space-y-4">
          {tables.map(table => (
            <div key={table.id} className={`border-2 rounded-xl p-4 transition-all ${activeTable === table.id ? 'border-[#c9a96e]' : 'border-stone-200'}`} onClick={() => setActiveTable(table.id)}>
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="text"
                  value={table.name}
                  onChange={e => setTables(prev => prev.map(t => t.id === table.id ? { ...t, name: e.target.value } : t))}
                  className="font-medium text-[#2a1f15] text-sm bg-transparent border-b border-transparent hover:border-stone-200 focus:border-[#c9a96e] focus:outline-none flex-1"
                />
                <div className="flex items-center gap-1">
                  <label className="text-xs text-[#6b5d4f]">Seats:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={table.capacity}
                    onChange={e => updateCapacity(table.id, parseInt(e.target.value) || 1)}
                    className="w-14 border border-stone-200 rounded px-2 py-1 text-xs text-center"
                  />
                </div>
                <span className="text-xs text-[#6b5d4f]">{table.guests.length}/{table.capacity}</span>
                <button onClick={(e) => { e.stopPropagation(); removeTable(table.id); }} className="text-[#6b5d4f] hover:text-rose-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {table.guests.map((g, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-[#c9a96e]/10 text-[#8a6d3b] px-2.5 py-1 rounded-lg text-xs">
                    {g}
                    <button onClick={(e) => { e.stopPropagation(); removeGuest(table.id, i); }} className="hover:text-rose-500"><X size={10} /></button>
                  </span>
                ))}
                {table.guests.length === 0 && <span className="text-xs text-[#8a7a6a] italic">No guests assigned yet</span>}
              </div>

              {table.guests.length < table.capacity && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={activeTable === table.id ? guestInput : ''}
                    onChange={e => setGuestInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest(table.id); } }}
                    placeholder="Add guest name…"
                    className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40"
                  />
                  <button onClick={(e) => { e.stopPropagation(); addGuest(table.id); }} className="bg-[#8a6d3b] text-white px-3 py-1.5 rounded-lg text-xs hover:bg-[#7a6030] transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={addTable} className="mt-4 w-full border-2 border-dashed border-stone-200 text-[#6b5d4f] py-3 rounded-xl text-sm hover:border-[#c9a96e]/40 hover:text-[#8a6d3b] transition-colors flex items-center justify-center gap-2">
          <Plus size={14} /> Add table
        </button>

        <div className="mt-6">
          <ShareButton getText={() => `My wedding seating chart: ${totalGuests} guests across ${tables.length} tables`} imageName="seating-chart" />
        </div>
        <div className="mt-4">
          <EmailCapture source="seating-chart-maker" />
        </div>
      </div>
    </ToolLayout>
  );
}

// ─── 2. Guest List Template ─────────────────────────────────

export function GuestListTemplateTool({ onGetStarted }: { onGetStarted: () => void }) {
  const [guests, setGuests] = useState<{ id: string; firstName: string; lastName: string; email: string; plusOne: string; rsvp: string; meal: string; dietary: string }[]>([
    { id: '1', firstName: '', lastName: '', email: '', plusOne: '', rsvp: 'pending', meal: '', dietary: '' },
  ]);

  function update(id: string, field: string, value: string) {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  }

  function addRow() {
    setGuests(prev => [...prev, { id: String(Date.now()), firstName: '', lastName: '', email: '', plusOne: '', rsvp: 'pending', meal: '', dietary: '' }]);
  }

  function removeRow(id: string) {
    setGuests(prev => prev.filter(g => g.id !== id));
  }

  function exportCSV() {
    const rows = guests.filter(g => g.firstName || g.lastName).map(g => ({
      'First Name': g.firstName,
      'Last Name': g.lastName,
      'Email': g.email,
      'Plus One': g.plusOne,
      'RSVP': g.rsvp,
      'Meal': g.meal,
      'Dietary': g.dietary,
    }));
    downloadCSV('wedding-guest-list.csv', rows);
  }

  const filledCount = guests.filter(g => g.firstName || g.lastName).length;

  return (
    <ToolLayout
      icon={<Users size={28} />}
      title="Wedding Guest List Template"
      subtitle="Build your guest list, track RSVPs and meal choices, and export to CSV for your caterer. No account needed."
      breadcrumb="Guest List Template"
      onGetStarted={onGetStarted}
      supportingContent={<>
        <h2 className="text-[#2a1f15] font-serif text-2xl mb-4">How to build your wedding guest list</h2>
        <div className="space-y-4 text-[#5d4e3e] text-sm leading-relaxed">
          <p>Your guest list is the backbone of your wedding — it determines your venue size, catering cost, and the entire feel of the day. Here's how to build it right:</p>
          <p><strong className="text-[#2a1f15]">Start with your budget.</strong> Before you name a single guest, know how many you can afford. Divide your catering and bar budget by your per-head cost to get your target guest count.</p>
          <p><strong className="text-[#2a1f15]">Create A and B lists.</strong> Your A-list is must-invites: immediate family, close friends, wedding party. Your B-list is people you'd love to invite if space allows. As A-list regrets come in, send B-list invitations.</p>
          <p><strong className="text-[#2a1f15]">Track households, not just individuals.</strong> Families with children should be tracked as a household so you can send one invitation. Note plus-one eligibility for each single guest.</p>
          <p><strong className="text-[#2a1f15]">Collect meal choices early.</strong> If your caterer offers menu options, collect meal choices with your RSVPs. This avoids a follow-up call and lets you give your caterer an accurate count.</p>
          <p><strong className="text-[#2a1f15]">Export for your caterer.</strong> A clean CSV with names, meal choices, and dietary restrictions is exactly what your caterer needs 1-2 weeks before the wedding. Don't hand them a messy spreadsheet.</p>
          <p><strong className="text-[#2a1f15]">Keep it in one place.</strong> The biggest mistake couples make is tracking RSVPs across email, text, and a paper list. Use one system from the start so nothing falls through the cracks.</p>
        </div>
        <RelatedLinks links={[
          { label: 'Guest List Etiquette: Who to Invite', href: '/blog/guest-list-etiquette', cat: 'Guests' },
          { label: 'The Complete Wedding Planning Timeline', href: '/blog/wedding-planning-timeline', cat: 'Planning' },
        ]} />
      </>}
    >
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[#2a1f15] font-serif text-xl">Your guest list</h2>
            <p className="text-[#6b5d4f] text-xs mt-1">{filledCount} guests</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="inline-flex items-center gap-1.5 border border-stone-200 text-[#5d4e3e] px-3 py-1.5 rounded-lg text-xs hover:bg-stone-50 transition-colors">
              <Download size={13} /> CSV
            </button>
            <PrintButton />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-[#6b5d4f] uppercase tracking-wider">
                <th className="text-left py-2 px-1 font-medium">First</th>
                <th className="text-left py-2 px-1 font-medium">Last</th>
                <th className="text-left py-2 px-1 font-medium hidden sm:table-cell">Email</th>
                <th className="text-left py-2 px-1 font-medium">RSVP</th>
                <th className="text-left py-2 px-1 font-medium hidden md:table-cell">Meal</th>
                <th className="text-left py-2 px-1 font-medium hidden md:table-cell">Dietary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {guests.map(g => (
                <tr key={g.id} className="border-b border-stone-50">
                  <td className="py-1.5 px-1"><input type="text" value={g.firstName} onChange={e => update(g.id, 'firstName', e.target.value)} placeholder="Emma" className="w-20 border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40" /></td>
                  <td className="py-1.5 px-1"><input type="text" value={g.lastName} onChange={e => update(g.id, 'lastName', e.target.value)} placeholder="Smith" className="w-20 border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40" /></td>
                  <td className="py-1.5 px-1 hidden sm:table-cell"><input type="email" value={g.email} onChange={e => update(g.id, 'email', e.target.value)} placeholder="emma@email.com" className="w-32 border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40" /></td>
                  <td className="py-1.5 px-1">
                    <select value={g.rsvp} onChange={e => update(g.id, 'rsvp', e.target.value)} className="border border-stone-200 rounded px-1.5 py-1 text-xs">
                      <option value="pending">Pending</option>
                      <option value="confirmed">Yes</option>
                      <option value="declined">No</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-1 hidden md:table-cell">
                    <select value={g.meal} onChange={e => update(g.id, 'meal', e.target.value)} className="border border-stone-200 rounded px-1.5 py-1 text-xs">
                      <option value="">—</option>
                      <option>Chicken</option><option>Beef</option><option>Fish</option><option>Vegetarian</option><option>Vegan</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-1 hidden md:table-cell"><input type="text" value={g.dietary} onChange={e => update(g.id, 'dietary', e.target.value)} placeholder="GF" className="w-16 border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/40" /></td>
                  <td className="py-1.5 px-1"><button onClick={() => removeRow(g.id)} className="text-[#6b5d4f] hover:text-rose-500"><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={addRow} className="mt-3 inline-flex items-center gap-1.5 text-[#8a6d3b] text-sm hover:underline">
          <Plus size={14} /> Add row
        </button>

        <div className="mt-6 flex gap-3">
          <ShareButton getText={() => `My wedding guest list: ${filledCount} guests`} imageName="guest-list" />
        </div>
        <div className="mt-4">
          <EmailCapture source="guest-list-template" />
        </div>
      </div>
    </ToolLayout>
  );
}

// ─── 3. Wedding Day Timeline Template ───────────────────────

export function DayTimelineTemplateTool({ onGetStarted }: { onGetStarted: () => void }) {
  const [ceremonyTime, setCeremonyTime] = useState('16:00');
  const [gettingReadyHours, setGettingReadyHours] = useState(3);
  const [cocktailDuration, setCocktailDuration] = useState(60);
  const [receptionEnd, setReceptionEnd] = useState('23:00');


  function timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  function minToTime(min: number): string {
    const total = ((min % 1440) + 1440) % 1440;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  const ceremonyMin = timeToMin(ceremonyTime);
  const gettingReadyStart = ceremonyMin - gettingReadyHours * 60;

  const timeline: { time: string; label: string; duration: string }[] = [
    { time: minToTime(gettingReadyStart), label: 'Getting ready begins', duration: `${gettingReadyHours}h` },
    { time: minToTime(ceremonyMin - 30), label: 'Photos with wedding party', duration: '30 min' },
    { time: ceremonyTime, label: 'Ceremony begins', duration: '45 min' },
    { time: minToTime(ceremonyMin + 45), label: 'Recessional & congratulations', duration: '15 min' },
    { time: minToTime(ceremonyMin + 60), label: 'Cocktail hour', duration: `${cocktailDuration} min` },
    { time: minToTime(ceremonyMin + 60 + cocktailDuration), label: 'Grand entrance', duration: '10 min' },
    { time: minToTime(ceremonyMin + 70 + cocktailDuration), label: 'First dance', duration: '5 min' },
    { time: minToTime(ceremonyMin + 75 + cocktailDuration), label: 'Welcome toast & dinner', duration: '60 min' },
    { time: minToTime(ceremonyMin + 135 + cocktailDuration), label: 'Toasts & speeches', duration: '20 min' },
    { time: minToTime(ceremonyMin + 155 + cocktailDuration), label: 'Open dancing', duration: '60 min' },
    { time: minToTime(ceremonyMin + 215 + cocktailDuration), label: 'Cake cutting', duration: '15 min' },
    { time: minToTime(ceremonyMin + 230 + cocktailDuration), label: 'Parent dances', duration: '10 min' },
    { time: minToTime(ceremonyMin + 240 + cocktailDuration), label: 'Open dancing', duration: '60 min' },
    { time: minToTime(ceremonyMin + 300 + cocktailDuration), label: 'Bouquet toss', duration: '10 min' },
    { time: minToTime(ceremonyMin + 310 + cocktailDuration), label: 'Last dance & send-off', duration: '20 min' },
  ];

  return (
    <ToolLayout
      icon={<Clock size={28} />}
      title="Wedding Day Timeline Template"
      subtitle="Enter your ceremony time and get a complete minute-by-minute wedding day timeline. Print or share it with your vendors."
      breadcrumb="Day Timeline Template"
      onGetStarted={onGetStarted}
      supportingContent={<>
        <h2 className="text-[#2a1f15] font-serif text-2xl mb-4">How to build your wedding day timeline</h2>
        <div className="space-y-4 text-[#5d4e3e] text-sm leading-relaxed">
          <p>Your wedding day timeline is the single most important document you'll share with your vendors. It keeps everyone on the same page and ensures your day flows smoothly. Here's how to build one that works:</p>
          <p><strong className="text-[#2a1f15]">Work backwards from the end.</strong> Your venue will tell you when music has to stop — typically 11 PM or midnight. Build your timeline backwards from there, allocating time for each major event.</p>
          <p><strong className="text-[#2a1f15]">Build in buffer time.</strong> Everything takes longer than you think. Add 15-30 minutes of buffer between major transitions. If things run on time, you'll have a moment to breathe — not a moment of panic.</p>
          <p><strong className="text-[#2a1f15]">Schedule getting ready with photos in mind.</strong> Hair and makeup should finish 90 minutes before you leave for the ceremony. Build in time for detail shots (dress, rings, invitations) before you're in the dress.</p>
          <p><strong className="text-[#2a1f15]">Use cocktail hour for photos.</strong> While guests enjoy drinks and appetizers, take your family and wedding party photos. Give your photographer a shot list in advance so nothing is missed.</p>
          <p><strong className="text-[#2a1f15]">Not every tradition has to happen.</strong> Pick the traditions that matter to you — first dance, parent dances, cake cutting, bouquet toss — and skip the rest. A shorter reception flow feels more natural and keeps energy high.</p>
          <p><strong className="text-[#2a1f15]">Share it with everyone.</strong> Your photographer, caterer, DJ, venue coordinator, and wedding party all need a copy. A shared timeline means the DJ knows when to announce the first dance, and the caterer knows when to plate dinner.</p>
        </div>
        <RelatedLinks links={[
          { label: 'Building the Perfect Wedding Day Timeline', href: '/blog/wedding-day-timeline', cat: 'Planning' },
          { label: 'The Complete Wedding Planning Timeline', href: '/blog/wedding-planning-timeline', cat: 'Planning' },
        ]} />
      </>}
    >
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Ceremony start</label>
            <input type="time" value={ceremonyTime} onChange={e => setCeremonyTime(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
          </div>
          <div>
            <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Reception ends</label>
            <input type="time" value={receptionEnd} onChange={e => setReceptionEnd(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
          </div>
          <div>
            <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Getting ready (hours)</label>
            <input type="number" min={1} max={6} value={gettingReadyHours} onChange={e => setGettingReadyHours(parseInt(e.target.value) || 3)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
          </div>
          <div>
            <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Cocktail hour (min)</label>
            <input type="number" min={30} max={120} step={15} value={cocktailDuration} onChange={e => setCocktailDuration(parseInt(e.target.value) || 60)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
          </div>
        </div>

        <div className="space-y-2">
          {timeline.map((item, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-stone-50 last:border-0">
              <div className="flex-shrink-0 w-24 text-right">
                <div className="text-[#8a6d3b] text-sm font-medium">{formatTime(item.time)}</div>
              </div>
              <div className="flex-1 border-l-2 border-[#c9a96e]/30 pl-4">
                <div className="text-[#2a1f15] text-sm font-medium">{item.label}</div>
                <div className="text-[#6b5d4f] text-xs">{item.duration}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <ShareButton getText={() => `My wedding day timeline: ceremony at ${formatTime(ceremonyTime)}, reception until ${formatTime(receptionEnd)}`} imageName="day-timeline" />
          <PrintButton />
        </div>
        <div className="mt-4">
          <EmailCapture source="day-timeline-template" />
        </div>
      </div>
    </ToolLayout>
  );
}

// ─── 4. Wedding Hashtag Generator ───────────────────────────

export function HashtagGeneratorTool({ onGetStarted }: { onGetStarted: () => void }) {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [lastName, setLastName] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  function generate() {
    if (!name1.trim() || !name2.trim()) return;
    const n1 = name1.trim();
    const n2 = name2.trim();
    const ln = lastName.trim() || n2;
    const ideas: string[] = [];

    // Classic combinations
    ideas.push(`#${n1}${n2}Wedding`, `#${n1}And${n2}`, `#${n1}Weds${n2}`);
    ideas.push(`#${n1}${n2}Forever`, `#${n1}${n2}2026`, `#${n1}${n2}TieTheKnot`);
    ideas.push(`#The${ln}sWedding`, `#${ln}EverAfter`, `#BetterTogether${ln}`);
    ideas.push(`#TwoLessFishInThaSea${ln}`, `#${ln}HappilyEverAfter`);

    // Rhyming / punny (simple)
    const lower1 = n1.toLowerCase();
    const lower2 = n2.toLowerCase();
    if (lower1.includes('ann')) ideas.push(`#FinallyAnn`);
    if (lower1.includes('mark')) ideas.push(`#MarkYourCalendars`);
    if (lower2.includes('rose')) ideas.push(`#ForeverRose`);
    if (lower1.includes('joy')) ideas.push(`#JoyfulUnion`);
    if (lower1.includes('hope')) ideas.push(`#HopelesslyDevoted`);

    // Initial-based
    const initials = (n1[0] || '') + (n2[0] || '');
    ideas.push(`#${initials}Forever`, `#${initials}Wedding`, `#MeetThe${ln}s`);

    // Wordplay with last name
    if (ln.length > 4) {
      ideas.push(`#Love${ln}`, `#${ln}InLove`);
    }

    // Dedupe and filter
    const unique = [...new Set(ideas)].filter(h => h.length > 5 && h.length < 35);
    setHashtags(unique);
    track('hashtag_generated', { name_count: 2 });
  }

  function copyTag(tag: string) {
    navigator.clipboard.writeText(tag);
    setCopied(tag);
    track('hashtag_copied', {});
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <ToolLayout
      icon={<Hash size={28} />}
      title="Wedding Hashtag Generator"
      subtitle="Generate dozens of creative wedding hashtag ideas from your names in seconds. Free, no account needed."
      breadcrumb="Hashtag Generator"
      onGetStarted={onGetStarted}
      supportingContent={<>
        <h2 className="text-[#2a1f15] font-serif text-2xl mb-4">How to choose the perfect wedding hashtag</h2>
        <div className="space-y-4 text-[#5d4e3e] text-sm leading-relaxed">
          <p>A great wedding hashtag collects all your photos in one place — from guests, your photographer, and your wedding party. Here's how to pick one that works:</p>
          <p><strong className="text-[#2a1f15]">Check if it's already in use.</strong> Search Instagram and Twitter for your chosen hashtag before printing it on anything. If there are hundreds of posts, pick a different one so your photos don't get mixed in.</p>
          <p><strong className="text-[#2a1f15]">Keep it short and spellable.</strong> If guests can't spell it from the sign at your venue, they won't use it. Avoid hyphens, underscores, and unusual capitalization. #EmmaAndJames beats #EmmaAndJamesGetHitched2026.</p>
          <p><strong className="text-[#2a1f15]">Include your names or last name.</strong> The best hashtags combine both first names or play on your shared last name. Initials work too — #EJWedding is clean and memorable.</p>
          <p><strong className="text-[#2a1f15]">Add the year if needed.</strong> If your ideal hashtag is already taken, append your wedding year: #EmmaAndJames2026. This also helps for future anniversaries.</p>
          <p><strong className="text-[#2a1f15]">Put it everywhere.</strong> Print it on your welcome sign, cocktail napkins, programs, and a sign near the photo booth. Mention it in your welcome speech. The more visible it is, the more guests will use it.</p>
          <p><strong className="text-[#2a1f15]">Have a backup.</strong> Pick two hashtags — a primary and a backup. If guests misspell the first one, the second one catches the stragglers.</p>
        </div>
        <RelatedLinks links={[
          { label: 'Save the Date Wording Templates', href: '/tools/save-the-date-wording', cat: 'Tools' },
          { label: 'The Complete Wedding Planning Timeline', href: '/blog/wedding-planning-timeline', cat: 'Planning' },
        ]} />
      </>}
    >
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Your first name</label>
              <input type="text" value={name1} onChange={e => setName1(e.target.value)} placeholder="Emma" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
            </div>
            <div>
              <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Partner's first name</label>
              <input type="text" value={name2} onChange={e => setName2(e.target.value)} placeholder="James" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Shared last name <span className="normal-case font-normal text-[#8a7a6a]">(optional)</span></label>
            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
          </div>
          <button onClick={generate} disabled={!name1.trim() || !name2.trim()} className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            <Sparkles size={16} /> Generate hashtags
          </button>
        </div>

        {hashtags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[#2a1f15] font-medium text-sm mb-3">Your hashtag ideas ({hashtags.length})</h3>
            {hashtags.map(tag => (
              <div key={tag} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5">
                <span className="text-[#2a1f15] text-sm font-medium">{tag}</span>
                <button onClick={() => copyTag(tag)} className="text-[#8a6d3b] hover:text-[#b8955a] transition-colors">
                  {copied === tag ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <ShareButton getText={() => hashtags.length > 0 ? `My wedding hashtags: ${hashtags.slice(0, 5).join(', ')}` : 'Check out the wedding hashtag generator'} imageName="hashtag-generator" />
        </div>
        <div className="mt-4">
          <EmailCapture source="hashtag-generator" />
        </div>
      </div>
    </ToolLayout>
  );
}

// ─── 5. Honeymoon Budget Calculator ─────────────────────────

export function HoneymoonBudgetTool({ onGetStarted }: { onGetStarted: () => void }) {
  const [total, setTotal] = useState('5000');
  const [duration, setDuration] = useState('7');

  const allocations: { category: string; pct: number; icon: React.ReactNode }[] = [
    { category: 'Flights', pct: 30, icon: <MapPin size={14} /> },
    { category: 'Accommodation', pct: 35, icon: <Calendar size={14} /> },
    { category: 'Food & Drink', pct: 15, icon: <DollarSign size={14} /> },
    { category: 'Activities & Tours', pct: 12, icon: <Sparkles size={14} /> },
    { category: 'Transportation', pct: 4, icon: <MapPin size={14} /> },
    { category: 'Souvenirs & Misc', pct: 4, icon: <DollarSign size={14} /> },
  ];

  const totalNum = parseInt(total.replace(/,/g, '')) || 0;
  const durNum = parseInt(duration) || 1;
  const perDay = Math.round(totalNum / durNum);

  return (
    <ToolLayout
      icon={<MapPin size={28} />}
      title="Honeymoon Budget Calculator"
      subtitle="Enter your total honeymoon budget and trip length to get an instant breakdown by category. Free, no account needed."
      breadcrumb="Honeymoon Budget Calculator"
      onGetStarted={onGetStarted}
      supportingContent={<>
        <h2 className="text-[#2a1f15] font-serif text-2xl mb-4">How to budget your honeymoon</h2>
        <div className="space-y-4 text-[#5d4e3e] text-sm leading-relaxed">
          <p>Your honeymoon is the trip of a lifetime — but it shouldn't start your marriage in debt. Here's how to budget for it realistically:</p>
          <p><strong className="text-[#2a1f15]">Set your total first.</strong> Decide what you can afford after wedding expenses. A typical honeymoon costs $3,000-$8,000 depending on destination and duration. Be honest about what fits your finances.</p>
          <p><strong className="text-[#2a1f15]">Flights are your biggest fixed cost.</strong> International flights can eat 30% of your budget. Book 2-6 months in advance for the best prices, and consider flying mid-week for lower fares.</p>
          <p><strong className="text-[#2a1f15]">Accommodation varies wildly by destination.</strong> A 5-star resort in Bali costs less than a 3-star hotel in Paris. Research per-night costs before choosing your destination — it may change where you go.</p>
          <p><strong className="text-[#2a1f15]">Budget for food realistically.</strong> All-inclusive resorts simplify budgeting, but independent travel means estimating $40-$80 per person per day for food, depending on the country.</p>
          <p><strong className="text-[#2a1f15]">Don't skip activities.</strong> The whole point of a honeymoon is experiencing something special together. Budget 10-15% for tours, excursions, and memorable experiences — not just lying on a beach.</p>
          <p><strong className="text-[#2a1f15]">Keep a 10% buffer.</strong> Unexpected costs always come up — a taxi that costs more than expected, a nice dinner you didn't plan for, or a spontaneous excursion. Build in a buffer so you're not stressing about every dollar.</p>
        </div>
        <RelatedLinks links={[
          { label: 'Honeymoon Planning 101', href: '/blog/honeymoon-planning', cat: 'Honeymoon' },
          { label: '10 Ways to Stretch Your Wedding Budget', href: '/blog/wedding-budget-tips', cat: 'Budget' },
        ]} />
      </>}
    >
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Total budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] text-sm">$</span>
              <input type="text" inputMode="numeric" value={total ? Number(total.replace(/,/g, '')).toLocaleString('en-US') : ''} onChange={e => { const raw = e.target.value.replace(/,/g, ''); if (raw === '' || /^\d+$/.test(raw)) setTotal(raw); }} className="w-full pl-7 pr-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Days</label>
            <input type="number" min={1} max={30} value={duration} onChange={e => setDuration(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
          </div>
        </div>

        <div className="bg-stone-50 rounded-xl p-4 mb-6 text-center">
          <div className="text-[#6b5d4f] text-xs uppercase tracking-wider">Per day</div>
          <div className="text-[#2a1f15] font-serif text-3xl font-bold">${perDay.toLocaleString()}</div>
        </div>

        <div className="space-y-3">
          {allocations.map(a => {
            const amount = Math.round((totalNum * a.pct) / 100);
            return (
              <div key={a.category} className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[#8a6d3b]">{a.icon}</span>
                  <span className="text-[#2a1f15] text-sm">{a.category}</span>
                </div>
                <div className="w-32 bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#c9a96e] h-full rounded-full" style={{ width: `${a.pct * 2}%` }} />
                </div>
                <div className="text-right w-24">
                  <div className="text-[#2a1f15] text-sm font-medium">${amount.toLocaleString()}</div>
                  <div className="text-[#6b5d4f] text-xs">{a.pct}%</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <ShareButton getText={() => `My honeymoon budget: $${totalNum.toLocaleString()} for ${durNum} days ($${perDay}/day)`} imageName="honeymoon-budget" />
          <PrintButton />
        </div>
        <div className="mt-4">
          <EmailCapture source="honeymoon-budget-calculator" />
        </div>
      </div>
    </ToolLayout>
  );
}

// ─── 6. Vendor Questions Checklist ──────────────────────────

export function VendorQuestionsTool({ onGetStarted }: { onGetStarted: () => void }) {
  const vendors: { type: string; icon: React.ReactNode; questions: string[] }[] = [
    { type: 'Photographer', icon: <Camera />, questions: [
      'How many weddings have you shot?',
      'Can I see a full gallery from a recent wedding?',
      "What's your backup plan if you're sick on our wedding day?",
      'Do you bring a second shooter?',
      "What's the turnaround time for the final photos?",
      'Do we get the copyright and printing rights?',
      'How do you handle difficult lighting situations?',
      'What packages do you offer and what is included?',
    ]},
    { type: 'Caterer', icon: <DollarSign />, questions: [
      'Are you licensed and insured?',
      'Can you accommodate dietary restrictions and allergies?',
      "What's included in the per-head price (staff, rentals, linens)?",
      'Do you offer tastings before we book?',
      "What's your overtime policy?",
      'How many events do you handle on the same day?',
      'What is your payment and cancellation schedule?',
      'Do you provide a bartender and bar supplies?',
    ]},
    { type: 'Florist', icon: <Sparkles />, questions: [
      'What flowers will be in season for my wedding date?',
      'Can you work within my budget?',
      'Do you handle delivery, setup, and breakdown?',
      'Can I see photos of your work from similar weddings?',
      'What happens to the ceremony arrangements — can they be moved to the reception?',
      'Do you rent vases and containers, or do we provide them?',
      'How far in advance do you need the final flower count?',
    ]},
    { type: 'DJ / Band', icon: <Music2 />, questions: [
      'Have you worked at my venue before?',
      'Can I see a sample setlist?',
      'Do you take requests from guests?',
      "What's your backup plan if you can't make it?",
      'Do you provide MC services and make announcements?',
      "What's your policy on do-not-play songs?",
      'Do you bring your own sound equipment and lighting?',
      'How do you handle transitions between ceremony, cocktail hour, and reception?',
    ]},
    { type: 'Venue', icon: <MapPin />, questions: [
      'What is included in the rental fee (tables, chairs, linens)?',
      'Is there a required vendor list or can I bring my own?',
      'What time can we access the space for setup?',
      'When must the event end and when is teardown?',
      'Is there a noise ordinance or sound limit?',
      'Are there restrictions on decorations, candles, or confetti?',
      'How many guests can the space accommodate?',
      'Is there parking for guests and is it complimentary?',
    ]},
  ];

  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(q: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q); else next.add(q);
      return next;
    });
  }

  return (
    <ToolLayout
      icon={<Store size={28} />}
      title="Wedding Vendor Questions Checklist"
      subtitle="The essential questions to ask every wedding vendor before signing a contract. Check them off as you go."
      breadcrumb="Vendor Questions"
      onGetStarted={onGetStarted}
      supportingContent={<>
        <h2 className="text-[#2a1f15] font-serif text-2xl mb-4">How to interview wedding vendors</h2>
        <div className="space-y-4 text-[#5d4e3e] text-sm leading-relaxed">
          <p>Booking vendors is one of the most expensive and consequential parts of wedding planning. The right questions can save you thousands and prevent day-of disasters. Here's how to approach vendor interviews:</p>
          <p><strong className="text-[#2a1f15]">Start with referrals.</strong> Ask recently married friends, your venue coordinator, and local wedding groups for recommendations. Cross-reference with online reviews — look for consistency over time, not just a few glowing reviews.</p>
          <p><strong className="text-[#2a1f15]">Always ask for a full gallery.</strong> A photographer's highlight reel shows their best work, but a full gallery shows what you'll actually get. Ask to see an entire wedding from start to finish.</p>
          <p><strong className="text-[#2a1f15]">Ask about backup plans.</strong> What happens if your photographer is sick? If your caterer has a kitchen emergency? Every professional vendor has a backup plan — if they can't answer this question, walk away.</p>
          <p><strong className="text-[#2a1f15]">Get everything in writing.</strong> A verbal agreement is not a booking. Every vendor should provide a signed contract with the service date, exact deliverables, payment schedule, and cancellation policy. If they won't, they're not a professional.</p>
          <p><strong className="text-[#2a1f15]">Ask about hidden costs.</strong> Does the caterer's per-head price include gratuity, service charge, and rentals? Does the photographer charge for travel? Does the DJ charge for overtime? Ask for the total out-the-door price.</p>
          <p><strong className="text-[#2a1f15]">Track everything in one place.</strong> Keep vendor contacts, quotes, deposits, and contract status in a single vendor manager. Vow's vendor manager links directly to your budget items so costs stay in sync automatically.</p>
        </div>
        <RelatedLinks links={[
          { label: 'How to Interview and Book Wedding Vendors', href: '/blog/vendor-tips', cat: 'Vendors' },
          { label: '10 Ways to Stretch Your Wedding Budget', href: '/blog/wedding-budget-tips', cat: 'Budget' },
        ]} />
      </>}
    >
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="mb-4 text-sm text-[#6b5d4f]">{checked.size} of {vendors.reduce((s, v) => s + v.questions.length, 0)} questions checked</div>

        {vendors.map(vendor => (
          <div key={vendor.type} className="mb-6 last:mb-0">
            <h3 className="text-[#2a1f15] font-serif text-lg mb-3 flex items-center gap-2">
              <span className="text-[#8a6d3b]">{vendor.icon}</span>
              {vendor.type}
            </h3>
            <div className="space-y-2">
              {vendor.questions.map((q, i) => {
                const id = `${vendor.type}-${i}`;
                return (
                  <label key={id} className="flex items-start gap-3 cursor-pointer group">
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${checked.has(id) ? 'bg-[#c9a96e] border-[#c9a96e]' : 'border-stone-300 group-hover:border-[#c9a96e]'}`}
                    >
                      {checked.has(id) && <Check size={11} className="text-white" />}
                    </button>
                    <span className={`text-sm ${checked.has(id) ? 'text-[#8a7a6a] line-through' : 'text-[#2a1f15]'}`}>{q}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-6 flex gap-3">
          <ShareButton getText={() => `My vendor questions checklist: ${checked.size} questions asked`} imageName="vendor-questions" />
          <PrintButton />
        </div>
        <div className="mt-4">
          <EmailCapture source="vendor-questions" />
        </div>
      </div>
    </ToolLayout>
  );
}

// ─── 7. Save the Date Wording ───────────────────────────────

export function SaveTheDateTool({ onGetStarted }: { onGetStarted: () => void }) {
  const [formality, setFormality] = useState<'formal' | 'casual' | 'destination' | 'lgbtq'>('formal');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [copied, setCopied] = useState<number | null>(null);

  const dateStr = date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '[Date]';

  const templates: Record<string, string[]> = {
    formal: [
      `${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\nrequest the honor of your presence\nas they exchange their wedding vows\n${dateStr}\n${location || '[Location]'}`,
      `Together with their families\n${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\ninvite you to celebrate their marriage\n${dateStr}\n${location || '[Location]'}`,
      `${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\nare getting married!\n${dateStr}\n${location || '[Location]'}\nFormal invitation to follow`,
    ],
    casual: [
      `We're getting married!\n${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\n${dateStr}\n${location || '[Location]'}\nSave the date!`,
      `Save the date!\n${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\nare tying the knot\n${dateStr}\n${location || '[Location]'}`,
      `He asked, she said yes!\n${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\n${dateStr}\n${location || '[Location]'}\nParty to follow`,
    ],
    destination: [
      `We're saying "I do" away from home!\n${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\n${dateStr}\n${location || '[Location]'}\nStart planning your trip — invitation to follow`,
      `Pack your bags!\n${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\nare getting married in\n${location || '[Location]'}\n${dateStr}\nMore details to come`,
      `Save the date & book your flight!\n${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\n${dateStr}\n${location || '[Location]'}`,
    ],
    lgbtq: [
      `We're getting married!\n${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\n${dateStr}\n${location || '[Location]'}\nCelebration to follow`,
      `Save the date!\n${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\ninvite you to celebrate their love\n${dateStr}\n${location || '[Location]'}`,
      `Two hearts, one love\n${p1 || '[Name 1]'} & ${p2 || '[Name 2]'}\n${dateStr}\n${location || '[Location]'}\nInvitation to follow`,
    ],
  };

  const options = templates[formality];

  function copyText(idx: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    track('std_copied', { formality });
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <ToolLayout
      icon={<FileText size={28} />}
      title="Save the Date Wording Templates"
      subtitle="Copy-paste save the date wording for every style — formal, casual, destination, and more. Free, no account needed."
      breadcrumb="Save the Date Wording"
      onGetStarted={onGetStarted}
      supportingContent={<>
        <h2 className="text-[#2a1f15] font-serif text-2xl mb-4">How to write your save the dates</h2>
        <div className="space-y-4 text-[#5d4e3e] text-sm leading-relaxed">
          <p>Save the dates are the first impression your guests get of your wedding. They set the tone and give people time to plan. Here's how to get them right:</p>
          <p><strong className="text-[#2a1f15]">Send them 6-8 months in advance.</strong> For destination weddings or holiday weekends, send 8-12 months ahead. Any earlier and guests forget; any later and they may have conflicts.</p>
          <p><strong className="text-[#2a1f15]">Include the essentials only.</strong> Names, date, location (city is enough), and "invitation to follow." Don't include the venue address, dress code, or registry — that's what the invitation is for.</p>
          <p><strong className="text-[#2a1f15]">Match your wedding's tone.</strong> A black-tie evening wedding calls for formal wording. A backyard celebration calls for casual, playful language. Your save the date sets expectations for the whole event.</p>
          <p><strong className="text-[#2a1f15]">For destination weddings, give travel hints.</strong> Mention the city and country, and add "book your flight" or "start planning your trip" so guests know it's a destination and can begin making arrangements.</p>
          <p><strong className="text-[#2a1f15]">Consider digital save the dates.</strong> They're cheaper, faster, and eco-friendly. Paperless Post and Greenvelope offer beautiful designs. For older family members, send a physical version.</p>
          <p><strong className="text-[#2a1f15]">Proofread, then proofread again.</strong> Check the date twice — a wrong date on a save the date is a disaster. Have your partner and a friend review before sending.</p>
        </div>
        <RelatedLinks links={[
          { label: 'The Complete Wedding Planning Timeline', href: '/blog/wedding-planning-timeline', cat: 'Planning' },
          { label: 'Wedding Hashtag Generator', href: '/tools/wedding-hashtag-generator', cat: 'Tools' },
        ]} />
      </>}
    >
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Partner 1 name</label>
              <input type="text" value={p1} onChange={e => setP1(e.target.value)} placeholder="Emma" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
            </div>
            <div>
              <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Partner 2 name</label>
              <input type="text" value={p2} onChange={e => setP2(e.target.value)} placeholder="James" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Wedding date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
            </div>
            <div>
              <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="New York, NY" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Style</label>
            <div className="flex flex-wrap gap-2">
              {(['formal', 'casual', 'destination', 'lgbtq'] as const).map(f => (
                <button key={f} onClick={() => setFormality(f)} className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${formality === f ? 'bg-[#8a6d3b] text-white' : 'border border-stone-200 text-[#5d4e3e] hover:bg-stone-50'}`}>
                  {f === 'lgbtq' ? 'LGBTQ+' : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {options.map((text, i) => (
            <div key={i} className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <pre className="text-[#2a1f15] text-sm whitespace-pre-wrap font-sans leading-relaxed mb-3">{text}</pre>
              <button onClick={() => copyText(i, text)} className="inline-flex items-center gap-1.5 text-[#8a6d3b] text-xs hover:underline">
                {copied === i ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy text</>}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <ShareButton getText={() => `My save the date: ${p1} & ${p2}, ${dateStr}`} imageName="save-the-date" />
        </div>
        <div className="mt-4">
          <EmailCapture source="save-the-date-wording" />
        </div>
      </div>
    </ToolLayout>
  );
}
