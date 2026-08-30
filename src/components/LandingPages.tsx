import { useState, useEffect } from 'react';
import { DollarSign, Users, CheckSquare, LayoutGrid as Layout, BookOpen, Heart, Briefcase, ArrowRight, ArrowLeft, Share2, Calendar, MapPin, Clock, Plane, ChevronDown, ChevronUp, Lock, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BRAND } from '../lib/brand';
import { ALL_BLOG_POSTS, BLOG_CONTENT, PUBLISHED_BLOG_POSTS } from './BlogPostPage';
import BlogEmailCapture from './BlogEmailCapture';
import DashboardPreview from './DashboardPreview';
import ModuleThumbnail from './ModuleThumbnail';

interface LandingProps {
  onGetStarted: () => void;
  onLogin?: () => void;
}

function applySEO({ title, description, canonical }: { title: string; description: string; canonical: string }) {
  document.title = title;
  const setMeta = (name: string, content: string, prop = false) => {
    const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let el = document.querySelector(sel) as HTMLMetaElement;
    if (!el) { el = document.createElement('meta'); prop ? el.setAttribute('property', name) : el.setAttribute('name', name); document.head.appendChild(el); }
    el.setAttribute('content', content);
  };
  setMeta('description', description);
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
  link.href = `${BRAND.siteUrl}${canonical}`;
}

function LandingNav({ onGetStarted, onLogin }: LandingProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <Heart size={18} className="text-[#8a6d3b] fill-[#c9a96e]" />
          <span className="font-serif text-2xl text-[#2a1f15]">Vow</span>
        </a>
        <div className="hidden md:flex items-center gap-6 text-sm text-[#5d4e3e]">
          <a href="/#features" className="hover:text-[#8a6d3b] transition-colors">Features</a>
          <a href="/#pricing" className="hover:text-[#8a6d3b] transition-colors">Pricing</a>
          <a href="/for-planners" className="hover:text-[#8a6d3b] transition-colors">For Planners</a>
          <a href="/#faq" className="hover:text-[#8a6d3b] transition-colors">FAQ</a>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {onLogin && (
            <button onClick={onLogin} className="text-sm text-[#5d4e3e] hover:text-[#2a1f15] transition-colors px-3 py-2">
              Log in
            </button>
          )}
          <button onClick={onGetStarted} className="flex items-center gap-2 bg-[#8a6d3b] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#7a6030] transition-colors">
            Start planning free <ArrowRight size={15} />
          </button>
        </div>
        <button className="md:hidden text-[#5d4e3e]" onClick={() => setMenuOpen(v => !v)}>
          <div className="space-y-1.5">
            <span className="block w-6 h-0.5 bg-current" />
            <span className="block w-6 h-0.5 bg-current" />
            <span className="block w-6 h-0.5 bg-current" />
          </div>
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-stone-100 px-6 py-4 flex flex-col gap-4 text-sm text-[#5d4e3e]">
          <a href="/#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="/#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="/for-planners" onClick={() => setMenuOpen(false)}>For Planners</a>
          <a href="/#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          {onLogin && <button onClick={onLogin} className="text-left">Log in</button>}
          <button onClick={onGetStarted} className="bg-[#8a6d3b] text-white px-4 py-2.5 rounded-lg font-medium w-full">Start planning free</button>
        </div>
      )}
    </nav>
  );
}

function LandingFooter({ onGetStarted }: LandingProps) {
  return (
    <footer className="bg-[#1a1510] text-white">
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Heart size={18} className="text-[#8a6d3b] fill-[#c9a96e]" />
          <span className="font-serif text-2xl">Vow</span>
        </div>
        <h2 className="font-serif text-3xl mb-4">Ready to plan your perfect wedding?</h2>
        <p className="text-[#c0a880] mb-8 max-w-md mx-auto">Everything you need to organize your wedding, free to start.</p>
        <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-8 py-3.5 rounded-xl text-base font-medium hover:bg-[#7a6030] transition-colors">
          Get Started Free <ArrowRight size={16} />
        </button>
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap justify-center gap-6 text-sm text-[#c0a880]">
          <a href="/" className="hover:text-[#8a6d3b] transition-colors">Home</a>
          <a href="/features/budget-tracker" className="hover:text-[#8a6d3b] transition-colors">Budget Tracker</a>
          <a href="/features/guest-list" className="hover:text-[#8a6d3b] transition-colors">Guest List</a>
          <a href="/blog" className="hover:text-[#8a6d3b] transition-colors">Blog</a>
          <a href="/for-planners" className="hover:text-[#8a6d3b] transition-colors">For Planners</a>
          <span className="text-[#8a7a6a]">·</span>
          <a href="/privacy" className="hover:text-[#8a6d3b] transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-[#8a6d3b] transition-colors">Terms of Service</a>
          <a href={`mailto:${BRAND.contactEmail}`} className="hover:text-[#8a6d3b] transition-colors">Contact</a>
        </div>
        <div className="mt-6 text-[#a08868] text-xs">
          &copy; {new Date().getFullYear()} Vow Wedding Planner. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

const STATS = [
  { value: '9', label: 'Planning modules in one place' },
  { value: '$0', label: 'Free to start, no credit card' },
  { value: '2', label: 'Planners at once — you and your partner' },
];

function StatsBand() {
  return (
    <section className="bg-[#faf9f7] py-20">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STATS.map(s => (
            <div key={s.value}>
              <div className="font-serif text-4xl text-[#8a6d3b] mb-2">{s.value}</div>
              <p className="text-[#5d4e3e] text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const MODULES = [
  {
    icon: <CheckSquare size={22} className="text-[#8a6d3b]" />,
    title: 'Master Checklist',
    desc: 'A 48-task timeline covering every decision from 18 months out to your wedding day — organized by timeframe so you always know what to do next. Check tasks off freely; add your own custom ones with Pro.',
    img: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Wedding checklist showing tasks organized by timeframe',
    thumb: 'checklist',
  },
  {
    icon: <DollarSign size={22} className="text-[#8a6d3b]" />,
    title: 'Budget Tracker',
    desc: 'Track every expense by category, log deposits, and see balance due at a glance. A donut chart shows your spending breakdown instantly. No surprises on the big day.',
    img: 'https://images.pexels.com/photos/53621/calculator-calculation-insurance-finance-53621.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Wedding budget tracker with category breakdown chart',
    thumb: 'budget',
  },
  {
    icon: <Users size={22} className="text-[#8a6d3b]" />,
    title: 'Guest List & RSVPs',
    desc: 'Manage up to 25 guests free. Track RSVP status, meal choices, dietary restrictions, plus-ones, invite sent, and thank-you notes — all in one table. Import from CSV or add one by one.',
    img: 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Wedding guest list with RSVP tracking',
    thumb: 'guests',
  },
  {
    icon: <MapPin size={22} className="text-[#8a6d3b]" />,
    title: 'Seating Chart',
    desc: 'Create named tables with capacity limits. Assign confirmed guests with a click, and see exactly which seats are filled or empty — so you can send the final chart to your venue.',
    img: 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop',
    alt: 'Elegantly arranged wedding reception seating with round tables, floral centrepieces, and candlelight',
    thumb: 'seating',
  },
  {
    icon: <Briefcase size={22} className="text-[#8a6d3b]" />,
    title: 'Vendor Manager',
    desc: 'Track every vendor — photographer, caterer, florist, DJ, and more. Log quotes, deposits, contract status, and link vendors directly to budget items so costs stay in sync.',
    img: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Florist arranging flowers for a wedding — vendor coordination',
    thumb: 'vendors',
  },
  {
    icon: <Clock size={22} className="text-[#8a6d3b]" />,
    title: 'Day-of Timeline',
    desc: 'Build a minute-by-minute schedule for your wedding day. Add getting-ready, ceremony, portraits, reception — and share it with your vendors so everyone is on the same page.',
    img: 'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Wedding ceremony aisle with guests seated and couple at the altar',
    thumb: 'timeline',
  },
  {
    icon: <Heart size={22} className="text-[#8a6d3b] fill-[#c9a96e]" />,
    title: 'Bridal Party',
    desc: 'Track your bridesmaids and groomsmen — outfit details, gift ideas, responsibilities. Mark outfit ordered and gift given so nothing gets forgotten in the final stretch.',
    img: 'https://images.pexels.com/photos/1127119/pexels-photo-1127119.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Bridal party group photo — bridesmaids and groomsmen at a wedding',
    thumb: 'bridal',
  },
  {
    icon: <Plane size={22} className="text-[#8a6d3b]" />,
    title: 'Honeymoon Planner',
    desc: 'Plan your post-wedding escape alongside the wedding itself. Capture destinations, travel dates, packing lists, and personal notes so you can start the honeymoon chapter with everything ready.',
    img: 'https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Honeymoon planning section',
    thumb: 'honeymoon',
  },
  {
    icon: <BookOpen size={22} className="text-[#8a6d3b]" />,
    title: 'Notes & Journal',
    desc: 'A private space for inspiration, vendor research, and wedding-day reflections. Journal prompts help you capture your feelings at every stage of planning — memories you\'ll treasure forever.',
    img: 'https://images.pexels.com/photos/733856/pexels-photo-733856.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Wedding planning notes and journal',
    thumb: 'notes',
  },
];

const FAQ_ITEMS = [
  {
    q: 'What is Vow?',
    a: 'Vow is an all-in-one wedding planning app. It brings your checklist, budget tracker, guest list, seating chart, vendor manager, day-of timeline, bridal party, and honeymoon planner together in one beautiful place — so nothing slips through the cracks.',
  },
  {
    q: 'Is Vow free?',
    a: 'Yes. Vow is free to start with no credit card required. The free plan includes the full master checklist, budget tracker with categories and deposits, up to 25 guests, up to 5 vendors, notes & journal, and your wedding overview. Pro ($15/month or $99/year) unlocks unlimited guests & vendors, seating chart, bridal party, day timeline, honeymoon planner, PDF exports, and partner collaboration.',
  },
  {
    q: 'Can my partner and I plan together?',
    a: 'Yes — with Vow Pro. You can invite your partner to co-plan in real time. Both of you can add guests, check off tasks, and update the budget from your own devices. Changes appear instantly for both planners.',
  },
  {
    q: 'Can wedding planners use Vow with clients?',
    a: 'A dedicated Planner Dashboard for professional planners is coming soon. It will let you manage multiple client weddings from one account, switch between couples, and collaborate with each couple. Join the waitlist on our For Planners page to be notified when it launches.',
  },
  {
    q: 'Is my data private?',
    a: 'Absolutely. Your wedding data is protected by row-level security — you can only ever see your own wedding. We do not sell your data or use it for advertising. See our Privacy Policy for full details.',
  },
  {
    q: 'Does Vow work on my phone?',
    a: 'Yes. Vow is fully responsive and works well on any modern smartphone browser — no app download required. Access it from Chrome, Safari, or any mobile browser.',
  },
  {
    q: 'Can guests RSVP online?',
    a: 'Online guest RSVP is coming soon. Currently you collect RSVPs manually in the Guest List and update statuses yourself. The RSVP link feature — where guests open a link, find their name, and RSVP directly — is on the roadmap.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <h3 className="text-[#2a1f15] font-medium text-sm md:text-base">{q}</h3>
        {open ? <ChevronUp size={16} className="text-[#8a6d3b] flex-shrink-0 ml-4" /> : <ChevronDown size={16} className="text-[#6b5d4f] flex-shrink-0 ml-4" />}
      </button>
      {open && (
        <div className="px-6 pb-5 text-[#5d4e3e] text-sm leading-relaxed border-t border-stone-100">
          <p className="pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

export function HomePage({ onGetStarted, onLogin }: LandingProps) {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = hash.slice(1);
    const attempt = (tries: number) => {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (tries > 0) setTimeout(() => attempt(tries - 1), 100);
    };
    attempt(10);
  }, []);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Vow Wedding Planner',
    applicationCategory: 'LifestyleApplication',
    description: 'All-in-one wedding planning app with checklist, budget tracker, guest list, seating chart, and vendor manager.',
    operatingSystem: 'Web',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free plan' },
      { '@type': 'Offer', price: '15', priceCurrency: 'USD', name: 'Pro plan monthly', billingIncrement: 'P1M' },
      { '@type': 'Offer', price: '99', priceCurrency: 'USD', name: 'Pro plan annual', billingIncrement: 'P1Y' },
    ],
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <LandingNav onGetStarted={onGetStarted} onLogin={onLogin} />

      {/* ── 1. HERO ── */}
      <section className="bg-gradient-to-br from-[#1a1510] via-[#251a10] to-[#1a1510] text-white pt-24 pb-0 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-[#c9a96e]/15 text-[#d4b87a] px-4 py-1.5 rounded-full text-xs tracking-widest uppercase mb-6 border border-[#c9a96e]/20">
              <Heart size={12} className="fill-[#c9a96e]" /> Free to start · 9 planning modules · Private &amp; secure
            </div>
            <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-6">
              Plan your entire wedding<br className="hidden md:block" /> in one beautiful place.
            </h1>
            <p className="text-[#c9b070] text-lg md:text-xl mb-10 leading-relaxed max-w-2xl mx-auto">
              Vow brings your guest list, budget, seating chart, vendors, and wedding-day timeline together — so nothing slips through the cracks.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="flex items-center gap-2 bg-[#8a6d3b] text-white px-8 py-4 rounded-xl text-base font-medium hover:bg-[#7a6030] transition-colors w-full sm:w-auto justify-center"
              >
                Start planning free <ArrowRight size={16} />
              </button>
              <button
                onClick={onLogin}
                className="text-[#c9b070] hover:text-white transition-colors text-sm"
              >
                Already have an account? Log in
              </button>
            </div>
          </div>

          {/* Dashboard product preview */}
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── 2. PROBLEM ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-[#2a1f15] text-center mb-6">
            Wedding planning is chaos.<br className="hidden md:block" /> Vow is calm.
          </h2>
          <p className="text-[#5d4e3e] text-center text-lg mb-16 max-w-2xl mx-auto leading-relaxed">
            Spreadsheets that don't talk to each other. Group texts with no decisions. Sticky notes with vendor deposit amounts. A budget that's split across three tabs. Sound familiar?
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { before: 'Five separate spreadsheets for budget, guests, vendors, timeline, and seating', after: 'One app. Everything connected.' },
              { before: 'Missed deposit due dates because your notes are in different places', after: 'Budget tracker shows every balance due, clearly.' },
              { before: 'Partner doesn\'t know what\'s been decided or what\'s left to do', after: 'Shared checklist — you\'re always in sync.' },
              { before: 'Seating chart on paper that has to be redrawn every time someone declines', after: 'Assign seats in seconds, update instantly.' },
            ].map(row => (
              <div key={row.before} className="bg-[#faf9f7] rounded-2xl p-6 border border-stone-100">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-rose-400 text-lg font-bold flex-shrink-0">✕</span>
                  <p className="text-[#6b5d4f] text-sm italic">{row.before}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-500 text-lg font-bold flex-shrink-0">✓</span>
                  <p className="text-[#2a1f15] text-sm font-medium">{row.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-[#faf9f7]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl text-[#2a1f15] mb-4">Everything you need to plan your wedding</h2>
            <p className="text-[#5d4e3e] text-lg max-w-2xl mx-auto">9 planning modules, designed to work together.</p>
          </div>
          <div className="space-y-24">
            {MODULES.map((mod, i) => (
              <div key={mod.title} className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12`}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#c9a96e]/10 flex items-center justify-center">
                      {mod.icon}
                    </div>
                    <h3 className="font-serif text-2xl text-[#2a1f15]">{mod.title}</h3>
                  </div>
                  <p className="text-[#5d4e3e] text-base leading-relaxed">{mod.desc}</p>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex gap-3 w-full">
                    <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-lg flex-1">
                      <img
                        src={mod.img}
                        alt={mod.alt}
                        className="w-full object-cover"
                        style={{ maxHeight: '340px' }}
                      />
                    </div>
                    <div className="w-32 md:w-40 flex-shrink-0 hidden sm:block">
                      <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-md h-full" style={{ maxHeight: '340px' }}>
                        <ModuleThumbnail type={mod.thumb} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. WHO IT'S FOR ── */}
      <section id="for-planners" className="py-24 px-6 bg-gradient-to-br from-[#1a1510] to-[#2e2218]">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-white text-center mb-16">Who uses Vow?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="w-12 h-12 rounded-2xl bg-[#c9a96e]/20 flex items-center justify-center mb-5">
                <Heart size={22} className="text-[#8a6d3b] fill-[#c9a96e]" />
              </div>
              <h3 className="font-serif text-2xl text-white mb-3">Engaged couples</h3>
              <p className="text-[#a08050] text-sm leading-relaxed mb-4">
                Planning your own wedding? Vow is designed for couples who want to stay organized without hiring a full-time planner. Your partner can co-plan with you in real time, and the master checklist keeps you on track from 18 months out all the way to the big day.
              </p>
              <ul className="space-y-2">
                {['Free to start, no credit card', 'Works on any device', 'Built for two planners at once'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-[#8a6d3b] text-sm">
                    <Check size={14} /> <span className="text-[#a08050]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="w-12 h-12 rounded-2xl bg-[#c9a96e]/20 flex items-center justify-center mb-5">
                <Briefcase size={22} className="text-[#8a6d3b]" />
              </div>
              <h3 className="font-serif text-2xl text-white mb-3">Professional wedding planners</h3>
              <p className="text-[#a08050] text-sm leading-relaxed mb-4">
                A dedicated Planner Dashboard is coming soon — manage multiple client weddings from one login, switch between couples, and give each client their own private view while you retain full oversight.
              </p>
              <a href="/for-planners" className="inline-flex items-center gap-2 text-[#8a6d3b] text-sm hover:underline">
                Join the planner waitlist <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. HOW IT WORKS ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-[#2a1f15] text-center mb-16">Up and running in three steps</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create your wedding profile', body: 'Sign up free and enter your partner names, wedding date, venue, and budget. Your personalized planning space is ready in under a minute.' },
              { step: '2', title: 'Set your date and budget', body: 'Your checklist auto-populates with 48 tasks timed to your date. Your budget tracker seeds with category targets based on your total budget.' },
              { step: '3', title: 'Work the checklist together', body: 'Invite your partner. Check tasks off as you go. Add vendors, track RSVPs, and build your seating chart — everything stays in sync.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#8a6d3b] text-white font-serif text-2xl flex items-center justify-center mx-auto mb-5">
                  {s.step}
                </div>
                <h3 className="font-serif text-xl text-[#2a1f15] mb-3">{s.title}</h3>
                <p className="text-[#5d4e3e] text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-8 py-4 rounded-xl text-base font-medium hover:bg-[#7a6030] transition-colors">
              Start planning free <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. PRICING ── */}
      <section id="pricing" className="py-24 px-6 bg-[#faf9f7]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl text-[#2a1f15] mb-4">Simple, honest pricing</h2>
            <p className="text-[#5d4e3e]">Start free. Upgrade only when you need more.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Free */}
            <div className="bg-white rounded-3xl border border-stone-200 p-8">
              <div className="text-[#2a1f15] font-serif text-xl mb-1">Free</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-[#2a1f15]">$0</span>
                <span className="text-[#6b5d4f] text-sm">forever</span>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'Up to 25 guests',
                  'Up to 5 vendors',
                  'Dashboard overview',
                  'Wedding overview & details',
                  'Full master checklist (check tasks freely)',
                  'Budget tracker with categories, deposits & balance',
                  'Notes & journal',
                ].map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm text-[#5d4e3e]">
                    <Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <div className="border-t border-stone-200 pt-4 mb-8">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Not included — upgrade to Pro</p>
                <ul className="space-y-2.5">
                  {[
                    'Seating chart builder',
                    'Bridal party manager',
                    'Day timeline builder',
                    'Partner collaboration',
                    'PDF export',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-stone-400">
                      <Lock size={13} className="text-stone-300 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
              <button onClick={onGetStarted} className="w-full border-2 border-[#c9a96e] text-[#8a6d3b] py-3 rounded-xl font-medium hover:bg-[#c9a96e]/5 transition-colors">
                Start for free
              </button>
            </div>
            {/* Pro */}
            <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-3xl border border-[#c9a96e]/20 p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-[#8a6d3b] text-white text-xs px-3 py-1 rounded-full font-medium">Most popular</div>
              <div className="text-white font-serif text-xl mb-1">Pro</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-white">$15</span>
                <span className="text-[#a08050] text-sm">/month</span>
              </div>
              <p className="text-[#a08050] text-xs mb-6">or $99/year — save 45%</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited guests & vendors',
                  'Full dashboard — all stats unlocked',
                  'Unlimited budget items',
                  'PDF export of all sections',
                  'Seating chart builder',
                  'Bridal party manager',
                  'Day timeline builder',
                  'Honeymoon planner',
                  'Full notes & journal with all prompts',
                  'Partner collaboration (real-time)',
                  'Activity feed',
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-[#8a6d3b]">
                    <Check size={14} className="flex-shrink-0" />
                    <span className="text-[#d4b87a]">{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl font-medium hover:bg-[#7a6030] transition-colors">
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ── */}
      <section id="faq" className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-[#2a1f15] text-center mb-16">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
          <p className="text-center text-[#6b5d4f] text-sm mt-10">
            Have another question? <a href={`mailto:${BRAND.contactEmail}`} className="text-[#8a6d3b] hover:underline">{BRAND.contactEmail}</a>
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}

// ─── Feature sub-pages ────────────────────────────────────────────────────────

export function BudgetTrackerPage({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav onGetStarted={onGetStarted} />
      <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-[#6b5d4f]">
        <a href="/" className="hover:text-[#8a6d3b] transition-colors">Home</a> <span className="mx-1">/</span> <span className="text-[#8a6d3b]">Budget Tracker</span>
      </div>
      <section className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] text-white py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#c9a96e]/20 text-[#8a6d3b] px-4 py-1.5 rounded-full text-sm mb-6">
            <DollarSign size={14} /> Budget Tracker
          </div>
          <h1 className="font-serif text-5xl mb-6">Never go over budget on your wedding</h1>
          <p className="text-[#6b5d4f] text-xl mb-8 max-w-2xl mx-auto">Track every expense, manage deposits, and see exactly where your money is going — all in one beautiful dashboard.</p>
          <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-8 py-3.5 rounded-xl text-base font-medium hover:bg-[#7a6030] transition-colors">
            Start Tracking Free <ArrowRight size={16} />
          </button>
        </div>
      </section>
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { title: 'Category Breakdown', desc: 'Organize expenses by venue, catering, photography, and 15+ more categories.' },
            { title: 'Deposit Tracking', desc: 'Log deposits paid and see your remaining balance due for each vendor.' },
            { title: 'Budget vs. Actual', desc: 'Compare estimated vs. actual costs in real time so you always know your position.' },
            { title: 'PDF Export', desc: 'Generate a beautiful PDF report to share with family or your wedding planner.' },
            { title: 'Payment Status', desc: 'Mark items as paid and track what still needs payment before the big day.' },
            { title: 'Unlimited Items', desc: 'Add as many budget items as you need — no artificial caps on Pro.' },
          ].map(f => (
            <div key={f.title} className="p-6 border border-stone-200 rounded-2xl hover:border-[#c9a96e]/40 hover:shadow-md transition-all">
              <h3 className="text-[#2a1f15] font-semibold mb-2">{f.title}</h3>
              <p className="text-[#5d4e3e] text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="py-12 px-6 bg-[#faf9f7]">
        <div className="max-w-4xl mx-auto">
          <h3 className="font-serif text-2xl text-[#2a1f15] mb-4">Related reading</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a href="/blog/wedding-budget-tips" className="block p-4 bg-white border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
              <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Budget</span>
              <p className="text-[#2a1f15] text-sm font-medium mt-2">10 Ways to Stretch Your Wedding Budget</p>
            </a>
            <a href="/blog/vendor-tips" className="block p-4 bg-white border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
              <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Vendors</span>
              <p className="text-[#2a1f15] text-sm font-medium mt-2">How to Interview and Book Wedding Vendors</p>
            </a>
          </div>
          <p className="mt-4 text-sm text-[#6b5d4f]"><a href="/tools/wedding-budget-calculator" className="text-[#8a6d3b] hover:underline">Try our free budget calculator →</a></p>
        </div>
      </section>
      <StatsBand />
      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}

export function GuestListPage({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav onGetStarted={onGetStarted} />
      <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-[#6b5d4f]">
        <a href="/" className="hover:text-[#8a6d3b] transition-colors">Home</a> <span className="mx-1">/</span> <span className="text-[#8a6d3b]">Guest List</span>
      </div>
      <section className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] text-white py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#c9a96e]/20 text-[#8a6d3b] px-4 py-1.5 rounded-full text-sm mb-6">
            <Users size={14} /> Guest List
          </div>
          <h1 className="font-serif text-5xl mb-6">Manage your guest list with ease</h1>
          <p className="text-[#6b5d4f] text-xl mb-8 max-w-2xl mx-auto">Track RSVPs, meal choices, plus-ones, and seating — all in one organized place.</p>
          <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-8 py-3.5 rounded-xl text-base font-medium hover:bg-[#7a6030] transition-colors">
            Start Free <ArrowRight size={16} />
          </button>
        </div>
      </section>
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { title: 'RSVP Tracking', desc: 'Track confirmed, declined, and pending responses at a glance.' },
            { title: 'Meal Preferences', desc: 'Collect and manage dietary restrictions and meal choices for each guest.' },
            { title: 'Plus-One Management', desc: 'Track plus-ones with separate RSVP status for accurate headcounts.' },
            { title: 'Group Organization', desc: 'Sort guests by family groups, bride side, groom side, or custom groups.' },
            { title: 'Invite Tracking', desc: 'Mark when invitations are sent and thank-you notes are mailed.' },
            { title: 'PDF Export', desc: 'Export a full guest list PDF to share with your venue or caterer.' },
          ].map(f => (
            <div key={f.title} className="p-6 border border-stone-200 rounded-2xl hover:border-[#c9a96e]/40 hover:shadow-md transition-all">
              <h3 className="text-[#2a1f15] font-semibold mb-2">{f.title}</h3>
              <p className="text-[#5d4e3e] text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="py-12 px-6 bg-[#faf9f7]">
        <div className="max-w-4xl mx-auto">
          <h3 className="font-serif text-2xl text-[#2a1f15] mb-4">Related reading</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a href="/blog/guest-list-etiquette" className="block p-4 bg-white border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
              <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Guests</span>
              <p className="text-[#2a1f15] text-sm font-medium mt-2">Guest List Etiquette: Who to Invite</p>
            </a>
            <a href="/blog/wedding-planning-timeline" className="block p-4 bg-white border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
              <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Planning</span>
              <p className="text-[#2a1f15] text-sm font-medium mt-2">The Complete Wedding Planning Timeline</p>
            </a>
          </div>
        </div>
      </section>
      <StatsBand />
      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}

export function ChecklistPage({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav onGetStarted={onGetStarted} />
      <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-[#6b5d4f]">
        <a href="/" className="hover:text-[#8a6d3b] transition-colors">Home</a> <span className="mx-1">/</span> <span className="text-[#8a6d3b]">Checklist</span>
      </div>
      <section className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] text-white py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#c9a96e]/20 text-[#8a6d3b] px-4 py-1.5 rounded-full text-sm mb-6">
            <CheckSquare size={14} /> Master Checklist
          </div>
          <h1 className="font-serif text-5xl mb-6">Never miss a single detail</h1>
          <p className="text-[#6b5d4f] text-xl mb-8 max-w-2xl mx-auto">48 pre-loaded tasks organized across 10 timeframes from 18 months out to your wedding day.</p>
          <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-8 py-3.5 rounded-xl text-base font-medium hover:bg-[#7a6030] transition-colors">
            Start Free <ArrowRight size={16} />
          </button>
        </div>
      </section>
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { title: '48 Pre-loaded Tasks', desc: 'Start with a comprehensive list covering every aspect of wedding planning.' },
            { title: 'Timeframe Organized', desc: 'Tasks grouped from 18+ months out down to your wedding day.' },
            { title: 'Custom Tasks', desc: 'Add your own custom tasks alongside the pre-built ones (Pro).' },
            { title: 'Progress Tracking', desc: 'Visual progress bar shows your overall planning completion percentage.' },
            { title: 'Category Labels', desc: 'Tasks tagged by category: Vendors, Attire, Ceremony, and more.' },
            { title: 'PDF Export', desc: 'Print or export your checklist with a beautiful branded PDF (Pro).' },
          ].map(f => (
            <div key={f.title} className="p-6 border border-stone-200 rounded-2xl hover:border-[#c9a96e]/40 hover:shadow-md transition-all">
              <h3 className="text-[#2a1f15] font-semibold mb-2">{f.title}</h3>
              <p className="text-[#5d4e3e] text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="py-12 px-6 bg-[#faf9f7]">
        <div className="max-w-4xl mx-auto">
          <h3 className="font-serif text-2xl text-[#2a1f15] mb-4">Related reading</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a href="/blog/wedding-planning-timeline" className="block p-4 bg-white border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
              <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Planning</span>
              <p className="text-[#2a1f15] text-sm font-medium mt-2">The Complete Wedding Planning Timeline</p>
            </a>
            <a href="/blog/wedding-day-timeline" className="block p-4 bg-white border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
              <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Planning</span>
              <p className="text-[#2a1f15] text-sm font-medium mt-2">Building the Perfect Wedding Day Timeline</p>
            </a>
          </div>
          <p className="mt-4 text-sm text-[#6b5d4f]"><a href="/tools/wedding-checklist" className="text-[#8a6d3b] hover:underline">Try our free printable checklist →</a></p>
        </div>
      </section>
      <StatsBand />
      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}

export function SeatingChartPage({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav onGetStarted={onGetStarted} />
      <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-[#6b5d4f]">
        <a href="/" className="hover:text-[#8a6d3b] transition-colors">Home</a> <span className="mx-1">/</span> <span className="text-[#8a6d3b]">Seating Chart</span>
      </div>
      <section className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] text-white py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#c9a96e]/20 text-[#8a6d3b] px-4 py-1.5 rounded-full text-sm mb-6">
            <Layout size={14} /> Seating Chart
          </div>
          <h1 className="font-serif text-5xl mb-6">Seat your guests perfectly</h1>
          <p className="text-[#6b5d4f] text-xl mb-8 max-w-2xl mx-auto">Create named tables with capacity limits. Assign confirmed guests with one click.</p>
          <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-8 py-3.5 rounded-xl text-base font-medium hover:bg-[#7a6030] transition-colors">
            Start Free <ArrowRight size={16} />
          </button>
        </div>
      </section>
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { title: 'Named Tables', desc: 'Create tables with custom names (Head Table, Family, etc.) and set capacity limits.' },
            { title: 'Guest Sync', desc: 'Pulls directly from your guest list — confirmed guests only appear for assignment.' },
            { title: 'Easy Assignment', desc: 'Assign guests to tables with a single click from the unassigned panel.' },
            { title: 'Capacity Tracking', desc: 'See filled vs. available seats per table, highlighted when at capacity.' },
            { title: 'Unassigned View', desc: 'See at a glance which confirmed guests still need a seat.' },
            { title: 'Table Map', desc: 'Visual map shows every table — even empty ones — so you can plan ahead.' },
          ].map(f => (
            <div key={f.title} className="p-6 border border-stone-200 rounded-2xl hover:border-[#c9a96e]/40 hover:shadow-md transition-all">
              <h3 className="text-[#2a1f15] font-semibold mb-2">{f.title}</h3>
              <p className="text-[#5d4e3e] text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="py-12 px-6 bg-[#faf9f7]">
        <div className="max-w-4xl mx-auto">
          <h3 className="font-serif text-2xl text-[#2a1f15] mb-4">Related reading</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a href="/blog/guest-list-etiquette" className="block p-4 bg-white border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
              <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Guests</span>
              <p className="text-[#2a1f15] text-sm font-medium mt-2">Guest List Etiquette: Who to Invite</p>
            </a>
            <a href="/blog/wedding-day-timeline" className="block p-4 bg-white border border-stone-200 rounded-xl hover:border-[#c9a96e]/40 transition-colors">
              <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Planning</span>
              <p className="text-[#2a1f15] text-sm font-medium mt-2">Building the Perfect Wedding Day Timeline</p>
            </a>
          </div>
        </div>
      </section>
      <StatsBand />
      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}

const BLOG_POSTS = [
  {
    slug: 'wedding-planning-timeline',
    title: 'The Complete Wedding Planning Timeline',
    date: 'Jan 15, 2026',
    cat: 'Planning',
    excerpt: 'Everything you need to do from 18 months out to your wedding day, organized by timeframe.',
    image: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
    readTime: '8 min read',
  },
  {
    slug: 'wedding-budget-tips',
    title: '10 Ways to Stretch Your Wedding Budget',
    date: 'Jan 22, 2026',
    cat: 'Budget',
    excerpt: 'Smart strategies to save money without sacrificing the wedding of your dreams.',
    image: 'https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg?auto=compress&cs=tinysrgb&w=800',
    readTime: '6 min read',
  },
  {
    slug: 'guest-list-etiquette',
    title: 'Guest List Etiquette: Who to Invite and How to Handle the Hard Cases',
    date: 'Feb 3, 2026',
    cat: 'Guests',
    excerpt: 'Navigating the tricky politics of plus-ones, distant relatives, and coworkers.',
    image: 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=800',
    readTime: '5 min read',
  },
  {
    slug: 'vendor-tips',
    title: 'How to Interview and Book Wedding Vendors',
    date: 'Feb 18, 2026',
    cat: 'Vendors',
    excerpt: 'The questions you must ask before signing any vendor contract.',
    image: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=800',
    readTime: '7 min read',
  },
  {
    slug: 'wedding-day-timeline',
    title: 'Building the Perfect Wedding Day Timeline',
    date: 'Mar 5, 2026',
    cat: 'Planning',
    excerpt: 'How to structure your day to minimize stress and maximize enjoyment.',
    image: 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800',
    readTime: '6 min read',
  },
  {
    slug: 'honeymoon-planning',
    title: 'Honeymoon Planning 101',
    date: 'Mar 20, 2026',
    cat: 'Honeymoon',
    excerpt: 'From destination selection to packing lists — plan your perfect post-wedding escape.',
    image: 'https://images.pexels.com/photos/237272/pexels-photo-237272.jpeg?auto=compress&cs=tinysrgb&w=800',
    readTime: '5 min read',
  },
];

export function BlogIndexPage({ onGetStarted }: LandingProps) {
  const [activeCat, setActiveCat] = useState<string>('All');
  const categories = ['All', ...Array.from(new Set(PUBLISHED_BLOG_POSTS.map(p => p.cat)))];
  const filtered = activeCat === 'All' ? PUBLISHED_BLOG_POSTS : PUBLISHED_BLOG_POSTS.filter(p => p.cat === activeCat);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav onGetStarted={onGetStarted} />
      <section className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] text-white py-20 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-[#c9a96e]/20 text-[#8a6d3b] px-4 py-1.5 rounded-full text-sm mb-6">
          <BookOpen size={14} /> Vow Blog
        </div>
        <h1 className="font-serif text-5xl mb-4">Wedding Planning Advice</h1>
        <p className="text-[#6b5d4f] text-xl max-w-2xl mx-auto">Expert tips, timelines, and inspiration to help you plan the wedding of your dreams.</p>
      </section>
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  activeCat === cat
                    ? 'bg-[#8a6d3b] text-white'
                    : 'bg-[#c9a96e]/10 text-[#8a6d3b] hover:bg-[#c9a96e]/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(p => (
              <a key={p.slug} href={`/blog/${p.slug}`} className="group block border border-stone-200 rounded-2xl overflow-hidden hover:border-[#c9a96e]/40 hover:shadow-md transition-all">
                <div className="h-44 overflow-hidden">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">{p.cat}</span>
                    <span className="text-xs text-[#6b5d4f]">{p.date}</span>
                    <span className="text-xs text-[#8a7a6a]">{p.readTime}</span>
                  </div>
                  <h2 className="text-[#2a1f15] font-semibold mb-2 group-hover:text-[#8a6d3b] transition-colors">{p.title}</h2>
                  <p className="text-[#5d4e3e] text-sm">{BLOG_CONTENT[p.slug]?.excerpt ?? ''}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}

export function WeddingTimelineBlogPost({ onGetStarted }: LandingProps) {
  const sections = [
    { time: '18+ Months Out', tasks: ['Set your overall budget', 'Discuss vision and priorities', 'Research venues and book your date', 'Create a preliminary guest list', 'Hire a wedding planner (optional)'] },
    { time: '12 Months Out', tasks: ['Book photographer and videographer', 'Book caterer', 'Book DJ or band', 'Choose and ask bridal party', 'Start wedding dress shopping'] },
    { time: '9 Months Out', tasks: ['Order wedding dress', 'Book florist, officiant, hair & makeup', 'Plan and book honeymoon', 'Create wedding website', 'Register for gifts'] },
    { time: '6 Months Out', tasks: ['Send save-the-dates', 'Choose bridesmaids dresses', 'Plan ceremony details', 'Finalize guest list', 'Research and book rehearsal dinner venue'] },
    { time: '3 Months Out', tasks: ['Send wedding invitations', 'Order wedding cake', 'Schedule dress fittings', 'Book transportation', 'Confirm all vendors'] },
    { time: '1 Month Out', tasks: ['Finalize seating chart', 'Final dress fitting', 'Create wedding day timeline', 'Prepare vendor payments', 'Confirm honeymoon reservations'] },
    { time: 'Wedding Week', tasks: ['Send final guest count to caterer', 'Confirm all vendor arrival times', 'Rehearsal dinner', 'Pack wedding day bag', "Get a good night's sleep!"] },
  ];
  const relatedPosts = PUBLISHED_BLOG_POSTS.filter(p => p.slug !== 'wedding-planning-timeline').slice(0, 3);
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav onGetStarted={onGetStarted} />
      <div className="w-full h-72 md:h-96 overflow-hidden">
        <img src="https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Wedding planning timeline" className="w-full h-full object-cover" />
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <nav className="flex items-center gap-2 text-sm text-[#6b5d4f] mb-6">
          <a href="/" className="hover:text-[#8a6d3b] transition-colors">Home</a>
          <span>/</span>
          <a href="/blog" className="hover:text-[#8a6d3b] transition-colors">Blog</a>
          <span>/</span>
          <span className="text-[#8a6d3b]">Planning Timeline</span>
        </nav>
        <a href="/blog" className="inline-flex items-center gap-1.5 text-[#8a6d3b] text-sm hover:text-[#b8955a] transition-colors mb-6">
          <ArrowLeft size={14} /> Back to Blog
        </a>
        <div className="mb-8">
          <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">Planning</span>
          <h1 className="font-serif text-4xl text-[#2a1f15] mt-4 mb-3">The Complete Wedding Planning Timeline</h1>
          <div className="flex items-center gap-4 py-4 border-y border-stone-100">
            <div className="w-9 h-9 rounded-full bg-[#c9a96e]/10 border border-[#c9a96e]/20 flex items-center justify-center flex-shrink-0">
              <Heart size={14} className="text-[#8a6d3b] fill-[#c9a96e]" />
            </div>
            <div>
              <div className="text-[#2a1f15] text-sm font-medium">Vow Editorial Team</div>
              <div className="text-[#6b5d4f] text-xs flex items-center gap-2"><Calendar size={11} /> January 15, 2026 · 8 min read</div>
            </div>
            <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="ml-auto flex items-center gap-1.5 text-[#6b5d4f] hover:text-[#8a6d3b] transition-colors text-xs border border-stone-200 px-3 py-1.5 rounded-lg">
              <Share2 size={13} /> Share
            </button>
          </div>
        </div>
        <p className="text-[#5d4e3e] text-lg mb-10 leading-relaxed">Planning a wedding can feel overwhelming, but breaking it down into a clear timeline makes everything manageable. Here's your complete month-by-month guide from engagement to "I do."</p>
        {sections.map(s => (
          <div key={s.time} className="mb-10">
            <h2 className="font-serif text-2xl text-[#2a1f15] mb-4 pb-2 border-b border-stone-200">{s.time}</h2>
            <ul className="space-y-2.5">
              {s.tasks.map(t => (
                <li key={t} className="flex items-start gap-3 text-[#5d4e3e]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c9a96e] flex-shrink-0 mt-2" />{t}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="bg-[#faf9f7] border border-stone-200 rounded-2xl p-6 mt-12 text-center">
          <h3 className="font-serif text-xl text-[#2a1f15] mb-2">Ready to track all of this?</h3>
          <p className="text-[#5d4e3e] text-sm mb-4">Vow comes pre-loaded with 48 tasks organized by timeframe — so you can check them off as you go.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onGetStarted} className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#7a6030] transition-colors">
              Start Free <ArrowRight size={14} />
            </button>
            <a href="/features/checklist" className="inline-flex items-center gap-2 border-2 border-[#c9a96e] text-[#8a6d3b] px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#c9a96e]/5 transition-colors">
              Explore the Checklist
            </a>
            <a href="/tools/wedding-checklist" className="inline-flex items-center gap-2 border-2 border-[#c9a96e] text-[#8a6d3b] px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#c9a96e]/5 transition-colors">
              Free Checklist Tool
            </a>
          </div>
        </div>
        <BlogEmailCapture sourcePost="wedding-planning-timeline" placement="end" />
        <div className="mt-16">
          <div className="grid md:grid-cols-3 gap-5">
            {relatedPosts.map(p => (
              <a key={p.slug} href={`/blog/${p.slug}`} className="group block border border-stone-200 rounded-xl overflow-hidden hover:border-[#c9a96e]/40 hover:shadow-sm transition-all">
                <div className="h-28 overflow-hidden">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">{p.cat}</span>
                  <p className="text-[#2a1f15] text-sm font-medium mt-2 group-hover:text-[#8a6d3b] transition-colors leading-tight">{p.title}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}

export function ForPlannersPage({ onGetStarted }: LandingProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    applySEO({ title: 'For Wedding Planners — Vow', description: 'Professional planner tools are coming to Vow. Join the waitlist for early access.', canonical: '/for-planners' });
  }, []);

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    await supabase.from('leads').insert({ email, source: 'planner_waitlist' });
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav onGetStarted={onGetStarted} />
      <section className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] text-white py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#c9a96e]/20 text-[#8a6d3b] px-4 py-1.5 rounded-full text-sm mb-6">
            <Briefcase size={14} /> For Wedding Planners
          </div>
          <h1 className="font-serif text-5xl mb-6">Manage all your clients in one place</h1>
          <p className="text-[#6b5d4f] text-xl mb-4 max-w-2xl mx-auto">Professional planner tools are coming to Vow — join the waitlist to get early access and help shape what we build.</p>
        </div>
      </section>
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 bg-[#c9a96e]/10 text-[#8a6d3b] px-3 py-1 rounded-full text-xs font-medium tracking-wide uppercase">Upcoming features</span>
          </div>
          <h2 className="font-serif text-3xl text-[#2a1f15] text-center mb-12">Everything a professional needs</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Multi-Wedding Dashboard', desc: 'See all your active clients and upcoming dates at a glance.' },
              { title: 'Client Collaboration', desc: 'Invite couples to their own view — they see their wedding, you see everything.' },
              { title: 'Branded PDF Exports', desc: 'Export professional documents with your branding to share with clients.' },
              { title: 'Budget Templates', desc: 'Create reusable budget templates for different wedding sizes and styles.' },
              { title: 'Vendor Network', desc: 'Save your preferred vendors and recommend them across clients.' },
              { title: 'Priority Support', desc: 'Dedicated support channel with fast response on business days.' },
            ].map(f => (
              <div key={f.title} className="p-6 border border-stone-200 rounded-2xl hover:border-[#c9a96e]/40 hover:shadow-md transition-all">
                <h3 className="text-[#2a1f15] font-semibold mb-2">{f.title}</h3>
                <p className="text-[#5d4e3e] text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-[#faf9f7] py-20 px-6">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="font-serif text-3xl text-[#2a1f15] mb-3">Join the waitlist</h2>
          <p className="text-[#5d4e3e] text-sm mb-8">Be the first to know when planner tools launch. We'll reach out with early access before the public release.</p>
          {submitted ? (
            <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check size={20} className="text-emerald-600" />
              </div>
              <p className="text-[#2a1f15] font-semibold mb-1">You're on the list!</p>
              <p className="text-[#5d4e3e] text-sm">We'll email you when planner tools are ready for early access.</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-4 text-left">
              <div>
                <label className="block text-xs text-[#5d4e3e] font-medium mb-1.5">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-[#2a1f15] placeholder-[#b0a090] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/30"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5d4e3e] font-medium mb-1.5">Work email <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@yourplanning.co"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-[#2a1f15] placeholder-[#b0a090] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/30"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl font-medium hover:bg-[#7a6030] transition-colors disabled:opacity-60"
              >
                {submitting ? 'Joining…' : 'Join the waitlist'}
              </button>
            </form>
          )}
        </div>
      </section>
      <StatsBand />
      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}

export function TermsPage({ onGetStarted }: LandingProps) {
  useEffect(() => {
    applySEO({ title: 'Terms of Service — Vow Wedding Planner', description: 'Terms of Service for Vow Wedding Planner.', canonical: '/terms' });
  }, []);
  const sections = [
    { title: '1. Acceptance of Terms', body: 'By accessing or using Vow Wedding Planner ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.' },
    { title: '2. Description of Service', body: 'Vow Wedding Planner is an online wedding planning application that helps couples organize their wedding details including guest lists, budgets, vendor management, checklists, and more. The Service is available on a free tier and via paid subscription plans.' },
    { title: '3. User Accounts', body: 'You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.' },
    { title: '4. Subscriptions and Payments', body: 'Paid subscription plans are billed in advance on a monthly or annual basis. You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.' },
    { title: '5. Your Data', body: 'You retain ownership of all data you input into the Service. We will not sell your personal data to third parties. See our Privacy Policy for full details.' },
    { title: '6. Acceptable Use', body: 'You agree not to use the Service for any unlawful purpose, to attempt to gain unauthorized access to our systems, or to interfere with the proper functioning of the Service.' },
    { title: '7. Limitation of Liability', body: 'The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Vow Wedding Planner shall not be liable for any indirect, incidental, or consequential damages.' },
    { title: '8. Changes to Terms', body: 'We may update these Terms from time to time. We will notify you of significant changes via email or within the Service. Continued use constitutes acceptance of the new terms.' },
  ];
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav onGetStarted={onGetStarted} />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl text-[#2a1f15] mb-2">Terms of Service</h1>
        <p className="text-[#6b5d4f] text-sm mb-10">Last updated: May 19, 2026</p>
        <div className="space-y-8 text-[#4a3a2a] text-sm leading-relaxed">
          {sections.map(s => (
            <section key={s.title}>
              <h2 className="font-serif text-xl text-[#2a1f15] mb-3">{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}
          <section>
            <h2 className="font-serif text-xl text-[#2a1f15] mb-3">9. Contact</h2>
            <p>Questions? Email us at <a href={`mailto:${BRAND.contactEmail}`} className="text-[#8a6d3b] hover:underline">{BRAND.contactEmail}</a>.</p>
          </section>
        </div>
      </div>
      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}

export function PrivacyPage({ onGetStarted }: LandingProps) {
  useEffect(() => {
    applySEO({ title: 'Privacy Policy — Vow Wedding Planner', description: 'Privacy Policy for Vow Wedding Planner. Learn how we collect, use, and protect your personal information.', canonical: '/privacy' });
  }, []);
  const sections = [
    { title: '1. Information We Collect', body: 'We collect information you provide when creating an account (email, password) and when using the Service (wedding details, guest lists, budget information, vendor contacts). We also collect usage data to improve the Service.' },
    { title: '2. How We Use Your Information', body: 'We use your information to provide and improve the Service, send account-related emails, respond to support requests, and analyze usage patterns. We do not use your wedding data for advertising.' },
    { title: '3. Data Sharing', body: 'We do not sell your personal data. We share it only with service providers necessary to operate the Service (database hosting, payment processing via Stripe), your invited partner via the collaboration feature, and as required by law.' },
    { title: '4. Data Security', body: 'We implement industry-standard security measures including HTTPS, encrypted data storage, and row-level security policies so each user can only access their own data.' },
    { title: '5. Data Retention', body: 'We retain your data for as long as your account is active. You may request deletion of your account and all associated data at any time. We will process requests within 30 days.' },
    { title: '6. Cookies', body: 'We use essential cookies to maintain your logged-in session. We do not use advertising or third-party tracking cookies.' },
    { title: '7. Your Rights', body: 'You have the right to access, correct, or delete your personal data, and to request a portable copy. Contact us to exercise these rights.' },
    { title: "8. Children's Privacy", body: 'The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13.' },
  ];
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav onGetStarted={onGetStarted} />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl text-[#2a1f15] mb-2">Privacy Policy</h1>
        <p className="text-[#6b5d4f] text-sm mb-10">Last updated: May 19, 2026</p>
        <div className="space-y-8 text-[#4a3a2a] text-sm leading-relaxed">
          {sections.map(s => (
            <section key={s.title}>
              <h2 className="font-serif text-xl text-[#2a1f15] mb-3">{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}
          <section>
            <h2 className="font-serif text-xl text-[#2a1f15] mb-3">9. Contact</h2>
            <p>Questions? Email us at <a href={`mailto:${BRAND.contactEmail}`} className="text-[#8a6d3b] hover:underline">{BRAND.contactEmail}</a>.</p>
          </section>
        </div>
      </div>
      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}
