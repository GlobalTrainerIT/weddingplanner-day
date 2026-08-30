import { Check, Circle, DollarSign, Users, MapPin, Clock, Heart, Plane, BookOpen, Briefcase } from 'lucide-react';

interface Props {
  type: string;
}

export default function ModuleThumbnail({ type }: Props) {
  return (
    <div className="w-full h-full bg-[#faf9f7] flex items-center justify-center p-4">
      {type === 'checklist' && <ChecklistThumb />}
      {type === 'budget' && <BudgetThumb />}
      {type === 'guests' && <GuestsThumb />}
      {type === 'seating' && <SeatingThumb />}
      {type === 'vendors' && <VendorsThumb />}
      {type === 'timeline' && <TimelineThumb />}
      {type === 'bridal' && <BridalThumb />}
      {type === 'honeymoon' && <HoneymoonThumb />}
      {type === 'notes' && <NotesThumb />}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-lg border border-stone-200 shadow-sm w-full max-w-xs p-3">{children}</div>;
}

function ChecklistThumb() {
  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-2">
        <Check size={12} className="text-[#8a6d3b]" />
        <span className="text-[10px] font-semibold text-[#2a1f15]">3 Months Out</span>
      </div>
      {[
        { label: 'Book photographer', done: true },
        { label: 'Order wedding cake', done: false },
        { label: 'Send invitations', done: false },
      ].map(t => (
        <div key={t.label} className="flex items-center gap-1.5 py-1">
          {t.done ? (
            <div className="w-3 h-3 rounded-full bg-emerald-100 flex items-center justify-center"><Check size={7} className="text-emerald-600" /></div>
          ) : (
            <Circle size={9} className="text-stone-300" />
          )}
          <span className={`text-[10px] ${t.done ? 'text-[#8a7a6a] line-through' : 'text-[#2a1f15]'}`}>{t.label}</span>
        </div>
      ))}
    </Card>
  );
}

function BudgetThumb() {
  const segs = [{ c: '#8a6d3b', p: 35 }, { c: '#c9a96e', p: 25 }, { c: '#d4b87a', p: 20 }, { c: '#e0cba0', p: 20 }];
  let off = 0; const r = 28; const circ = 2 * Math.PI * r;
  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-2">
        <DollarSign size={12} className="text-[#8a6d3b]" />
        <span className="text-[10px] font-semibold text-[#2a1f15]">Budget</span>
      </div>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 70 70" className="w-14 h-14">
          <circle cx="35" cy="35" r={r} fill="none" stroke="#f5f0e8" strokeWidth="8" />
          {segs.map((s, i) => {
            const len = (s.p / 100) * circ;
            const el = <circle key={i} cx="35" cy="35" r={r} fill="none" stroke={s.c} strokeWidth="8" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-off} transform="rotate(-90 35 35)" />;
            off += len; return el;
          })}
          <text x="35" y="38" textAnchor="middle" fill="#2a1f15" fontSize="10" fontWeight="600">$18k</text>
        </svg>
        <div className="flex-1 space-y-1">
          {[['Venue', '$8.2k', '#8a6d3b'], ['Catering', '$4.6k', '#c9a96e'], ['Photo', '$2.4k', '#d4b87a']].map(([l, a, c]) => (
            <div key={l} className="flex justify-between text-[9px]">
              <span className="flex items-center gap-1 text-[#5d4e3e]"><span className="w-1.5 h-1.5 rounded-full" style={{ background: c as string }} />{l}</span>
              <span className="text-[#2a1f15] font-medium">{a}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function GuestsThumb() {
  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-2">
        <Users size={12} className="text-[#8a6d3b]" />
        <span className="text-[10px] font-semibold text-[#2a1f15]">Guest List</span>
      </div>
      <div className="space-y-1">
        {[['Sarah M.', 'Confirmed', 'bg-emerald-100 text-emerald-700'], ['James K.', 'Pending', 'bg-amber-100 text-amber-700'], ['Priya R.', 'Confirmed', 'bg-emerald-100 text-emerald-700']].map(([n, s, c]) => (
          <div key={n} className="flex items-center justify-between text-[10px]">
            <span className="text-[#2a1f15]">{n}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${c}`}>{s}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeatingThumb() {
  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-2">
        <MapPin size={12} className="text-[#8a6d3b]" />
        <span className="text-[10px] font-semibold text-[#2a1f15]">Tables</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { name: 'Table 1', count: '7/8' },
          { name: 'Table 2', count: '6/8' },
          { name: 'Table 3', count: '8/8' },
          { name: 'Table 4', count: '4/8' },
        ].map(t => (
          <div key={t.name} className="rounded-lg border border-stone-200 p-1.5 text-center">
            <div className="w-7 h-7 rounded-full bg-[#c9a96e]/15 mx-auto mb-1 flex items-center justify-center">
              <Users size={10} className="text-[#8a6d3b]" />
            </div>
            <div className="text-[8px] text-[#2a1f15] font-medium">{t.name}</div>
            <div className="text-[7px] text-[#8a7a6a]">{t.count}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function VendorsThumb() {
  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-2">
        <Briefcase size={12} className="text-[#8a6d3b]" />
        <span className="text-[10px] font-semibold text-[#2a1f15]">Vendors</span>
      </div>
      <div className="space-y-1">
        {[
          { name: 'Lens & Light Photo', status: 'Booked', color: 'text-emerald-600' },
          { name: 'Bloom Florist', status: 'Deposit', color: 'text-amber-600' },
          { name: 'DJ Williams', status: 'Quote', color: 'text-stone-500' },
        ].map(v => (
          <div key={v.name} className="flex items-center justify-between text-[10px]">
            <span className="text-[#2a1f15]">{v.name}</span>
            <span className={`text-[8px] font-medium ${v.color}`}>{v.status}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TimelineThumb() {
  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-2">
        <Clock size={12} className="text-[#8a6d3b]" />
        <span className="text-[10px] font-semibold text-[#2a1f15]">Day Timeline</span>
      </div>
      <div className="space-y-1.5">
        {[
          { time: '2:00 PM', label: 'Getting ready', color: 'bg-[#8a6d3b]' },
          { time: '4:00 PM', label: 'Ceremony', color: 'bg-[#c9a96e]' },
          { time: '5:00 PM', label: 'Cocktail hour', color: 'bg-[#d4b87a]' },
          { time: '6:00 PM', label: 'Reception', color: 'bg-[#e0cba0]' },
        ].map(t => (
          <div key={t.label} className="flex items-center gap-2 text-[10px]">
            <span className="text-[#8a7a6a] w-12 text-[9px]">{t.time}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${t.color}`} />
            <span className="text-[#2a1f15]">{t.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BridalThumb() {
  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-2">
        <Heart size={12} className="text-[#8a6d3b] fill-[#c9a96e]" />
        <span className="text-[10px] font-semibold text-[#2a1f15]">Bridal Party</span>
      </div>
      <div className="space-y-1">
        {[
          { name: 'Emma (MOH)', detail: 'Dress ordered', done: true },
          { name: 'Jake (BM)', detail: 'Suit fitted', done: true },
          { name: 'Lisa (BM)', detail: 'Pending', done: false },
        ].map(b => (
          <div key={b.name} className="flex items-center justify-between text-[10px]">
            <span className="text-[#2a1f15]">{b.name}</span>
            <span className={`text-[8px] ${b.done ? 'text-emerald-600' : 'text-stone-400'}`}>{b.detail}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HoneymoonThumb() {
  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-2">
        <Plane size={12} className="text-[#8a6d3b]" />
        <span className="text-[10px] font-semibold text-[#2a1f15]">Honeymoon</span>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-[#c9a96e]/20 to-[#8a6d3b]/10 p-2 mb-1.5">
        <div className="text-[10px] font-medium text-[#2a1f15]">Santorini, Greece</div>
        <div className="text-[8px] text-[#8a7a6a]">Oct 14 – Oct 21</div>
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-[9px]"><Check size={8} className="text-emerald-500" /> <span className="text-[#5d4e3e]">Flights booked</span></div>
        <div className="flex items-center gap-1.5 text-[9px]"><Circle size={8} className="text-stone-300" /> <span className="text-[#5d4e3e]">Packing list</span></div>
      </div>
    </Card>
  );
}

function NotesThumb() {
  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen size={12} className="text-[#8a6d3b]" />
        <span className="text-[10px] font-semibold text-[#2a1f15]">Journal</span>
      </div>
      <div className="space-y-1.5">
        <div className="bg-[#faf9f7] rounded-md p-1.5">
          <div className="text-[8px] text-[#8a7a6a] mb-0.5">Aug 12</div>
          <div className="text-[9px] text-[#2a1f15] leading-tight">Found the perfect venue today — the garden with the string lights...</div>
        </div>
        <div className="bg-[#faf9f7] rounded-md p-1.5">
          <div className="text-[8px] text-[#8a7a6a] mb-0.5">Aug 8</div>
          <div className="text-[9px] text-[#2a1f15] leading-tight">Cake tasting tomorrow — so excited!</div>
        </div>
      </div>
    </Card>
  );
}
