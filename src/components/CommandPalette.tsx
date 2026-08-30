import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import type { Section, Guest, Vendor, ChecklistItem } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (s: Section) => void;
  guests: Guest[];
  vendors: Vendor[];
  checklist: ChecklistItem[];
}

interface CmdItem {
  id: string;
  label: string;
  sub: string;
  section: Section;
  icon: React.ReactNode;
}

export default function CommandPalette({ open, onClose, onNavigate, guests, vendors, checklist }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const buildItems = useCallback((): CmdItem[] => {
    const pages: CmdItem[] = [
      { id: 'page-dashboard', label: 'Dashboard', sub: 'Page', section: 'dashboard', icon: <ArrowRight size={14} className="text-[#8a6d3b]" /> },
      { id: 'page-overview', label: 'Wedding Overview', sub: 'Page', section: 'overview', icon: <ArrowRight size={14} className="text-[#8a6d3b]" /> },
      { id: 'page-checklist', label: 'Master Checklist', sub: 'Page', section: 'checklist', icon: <ArrowRight size={14} className="text-[#8a6d3b]" /> },
      { id: 'page-budget', label: 'Budget Tracker', sub: 'Page', section: 'budget', icon: <ArrowRight size={14} className="text-[#8a6d3b]" /> },
      { id: 'page-guests', label: 'Guest List', sub: 'Page', section: 'guests', icon: <ArrowRight size={14} className="text-[#8a6d3b]" /> },
      { id: 'page-vendors', label: 'Vendors', sub: 'Page', section: 'vendors', icon: <ArrowRight size={14} className="text-[#8a6d3b]" /> },
      { id: 'page-seating', label: 'Seating Chart', sub: 'Page', section: 'seating', icon: <ArrowRight size={14} className="text-[#8a6d3b]" /> },
      { id: 'page-timeline', label: 'Day Timeline', sub: 'Page', section: 'timeline', icon: <ArrowRight size={14} className="text-[#8a6d3b]" /> },
      { id: 'page-notes', label: 'Notes & Journal', sub: 'Page', section: 'notes', icon: <ArrowRight size={14} className="text-[#8a6d3b]" /> },
      { id: 'page-settings', label: 'Settings', sub: 'Page', section: 'settings' as Section, icon: <ArrowRight size={14} className="text-[#8a6d3b]" /> },
    ];

    const guestItems: CmdItem[] = guests.slice(0, 50).map(g => ({
      id: `guest-${g.id}`, label: `${g.first_name} ${g.last_name}`.trim(),
      sub: `Guest · ${g.rsvp_status}`, section: 'guests',
      icon: <Search size={14} className="text-[#6b5d4f]" />,
    }));

    const vendorItems: CmdItem[] = vendors.map(v => ({
      id: `vendor-${v.id}`, label: v.business_name,
      sub: `Vendor · ${v.category}`, section: 'vendors',
      icon: <Search size={14} className="text-[#6b5d4f]" />,
    }));

    const taskItems: CmdItem[] = checklist.filter(c => !c.completed).slice(0, 30).map(c => ({
      id: `task-${c.id}`, label: c.task,
      sub: `Task · ${c.timeframe}`, section: 'checklist',
      icon: <Search size={14} className="text-[#6b5d4f]" />,
    }));

    return [...pages, ...guestItems, ...vendorItems, ...taskItems];
  }, [guests, vendors, checklist]);

  const allItems = buildItems();
  const filtered = query
    ? allItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()) || i.sub.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[selectedIndex]) { onNavigate(filtered[selectedIndex].section); onClose(); } }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
            <Search size={18} className="text-[#6b5d4f]" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, guests, vendors, tasks…"
              className="flex-1 text-sm focus:outline-none text-[#2a1f15] placeholder:text-[#6b5d4f]"
            />
            <kbd className="text-xs text-[#6b5d4f] bg-stone-100 px-1.5 py-0.5 rounded">ESC</kbd>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-[#6b5d4f] text-sm">No results found</div>
            )}
            {filtered.slice(0, 20).map((item, i) => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.section); onClose(); }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selectedIndex ? 'bg-[#c9a96e]/10' : 'hover:bg-stone-50'}`}
              >
                {item.icon}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#2a1f15] truncate">{item.label}</div>
                </div>
                <span className="text-xs text-[#6b5d4f]">{item.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
