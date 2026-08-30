import { useState, useEffect } from 'react';
import { Clock, MapPin, Calendar, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { TimelineEvent, TimelineAssignment, Vendor } from '../types';

const categoryColors: Record<string, string> = {
  Prep: 'bg-rose-100 text-rose-700 border-rose-200',
  Photography: 'bg-amber-100 text-amber-700 border-amber-200',
  Ceremony: 'bg-sky-100 text-sky-700 border-sky-200',
  Reception: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Other: 'bg-stone-100 text-stone-700 border-stone-200',
};
const dotColors: Record<string, string> = {
  Prep: 'bg-rose-400', Photography: 'bg-amber-400', Ceremony: 'bg-sky-400', Reception: 'bg-emerald-400', Other: 'bg-stone-400',
};

function parseTime(t: string): number { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function formatTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
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

export default function TimelineSharePage({ slug }: { slug: string }) {
  const [wedding, setWedding] = useState<{ partner1_name: string; partner2_name: string; wedding_date: string | null; venue: string; timeline_share_enabled: boolean } | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [assignments, setAssignments] = useState<TimelineAssignment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: profRows } = await supabase.rpc('public_wedding_by_slug', {
        p_slug: slug,
        p_kind: 'timeline',
      });

      const row = Array.isArray(profRows) ? profRows[0] : null;
      if (!row || !row.out_timeline_share_enabled) { setError(true); setLoading(false); return; }
      const prof = {
        id: row.out_id as string,
        partner1_name: row.out_partner1_name as string,
        partner2_name: row.out_partner2_name as string,
        wedding_date: row.out_wedding_date as string | null,
        venue: row.out_venue as string,
        timeline_share_enabled: row.out_timeline_share_enabled as boolean,
      };
      setWedding(prof);

      const [evRes, asRes, venRes] = await Promise.all([
        supabase.from('timeline_events').select('*').eq('wedding_id', prof.id).order('start_time'),
        supabase.from('timeline_assignments').select('*').eq('wedding_id', prof.id),
        supabase.from('vendors').select('*').eq('wedding_id', prof.id),
      ]);
      setEvents((evRes.data || []) as TimelineEvent[]);
      setAssignments((asRes.data || []) as TimelineAssignment[]);
      setVendors((venRes.data || []) as Vendor[]);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9a96e]" /></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <Clock size={32} className="mx-auto text-stone-300 mb-3" />
        <h1 className="text-xl font-serif text-[#2a1f15] mb-2">Timeline not available</h1>
        <p className="text-[#6b5d4f] text-sm">This share link has been revoked or is no longer active.</p>
      </div>
    </div>
  );

  const dateStr = wedding?.wedding_date ? new Date(wedding.wedding_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : null;

  function getAssignmentsFor(eventId: string): { name: string; role: string }[] {
    return assignments.filter(a => a.timeline_event_id === eventId).map(a => {
      if (a.assignee_type === 'vendor' && a.vendor_id) {
        const v = vendors.find(v => v.id === a.vendor_id);
        return { name: v?.business_name || 'Unknown', role: v?.category || '' };
      }
      return { name: a.person_name, role: a.person_role };
    });
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] font-sans">
      <header className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] py-10 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Heart size={16} className="text-[#8a6d3b] fill-[#c9a96e]" />
          <span className="text-[#8a6d3b] text-xs tracking-widest uppercase">Day-of Run Sheet</span>
        </div>
        <h1 className="text-white font-serif text-3xl mb-2">{wedding?.partner1_name} & {wedding?.partner2_name}</h1>
        {dateStr && <p className="text-[#a08050] text-sm flex items-center justify-center gap-1.5"><Calendar size={12} /> {dateStr}</p>}
        {wedding?.venue && <p className="text-[#5d4e3e] text-xs mt-1 flex items-center justify-center gap-1.5"><MapPin size={10} /> {wedding.venue}</p>}
      </header>
      <main className="max-w-2xl mx-auto p-4 md:p-6 pt-8">
        {events.length === 0 ? (
          <div className="text-center py-16 text-[#6b5d4f]">
            <Clock size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No timeline events have been added yet.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[88px] top-0 bottom-0 w-px bg-stone-200" />
            <div className="space-y-3">
              {events.map((event) => {
                const endTime = addMinutes(event.start_time, event.duration_minutes);
                const assigns = getAssignmentsFor(event.id);
                return (
                  <div key={event.id} className="relative flex items-start gap-6">
                    <div className="w-20 flex-shrink-0 text-right pt-3">
                      <span className="text-[#5d4e3e] text-xs font-medium block">{formatTime(parseTime(event.start_time))}</span>
                      <span className="text-[#6b5d4f] text-[10px]">{event.duration_minutes}m</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-4 z-10 ring-2 ring-white ${dotColors[event.category] || 'bg-stone-400'}`} />
                    <div className="flex-1 bg-white rounded-xl border border-stone-200 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColors[event.category]}`}>{event.category}</span>
                        <span className="text-[#6b5d4f] text-xs">→ {formatTime(parseTime(endTime))}</span>
                      </div>
                      <h4 className="text-[#2a1f15] font-medium">{event.title}</h4>
                      {event.location && <p className="text-[#5d4e3e] text-xs mt-0.5 flex items-center gap-1"><MapPin size={10} /> {event.location}</p>}
                      {event.notes && <p className="text-[#5d4e3e] text-xs mt-1">{event.notes}</p>}
                      {assigns.length > 0 && (
                        <div className="text-xs text-[#6b5d4f] mt-2">{assigns.map(a => `${a.name}${a.role ? ` (${a.role})` : ''}`).join(' · ')}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <footer className="py-8 text-center border-t border-stone-100 mt-8">
          <p className="text-[#8a7a6a] text-xs">Read-only share — planned with <a href="/" className="text-[#8a6d3b] hover:underline">Vow</a></p>
        </footer>
      </main>
    </div>
  );
}
