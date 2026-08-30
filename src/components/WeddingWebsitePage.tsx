import { useState, useEffect } from 'react';
import { Heart, Calendar, MapPin, Clock, Gift, HelpCircle, Loader2, ExternalLink, Plane, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { daysUntil } from '../lib/useCountdown';
import { track } from '../lib/analytics';
import type { WebsiteContent, WebsiteScheduleItem, WebsiteFaqItem, RegistryLink } from '../types';

interface WebsitePublic {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string;
  venue: string;
  theme: string;
  color_palette: string;
  website_content: WebsiteContent | null;
  rsvp_slug: string | null;
  rsvp_enabled: boolean;
}

const EMPTY_CONTENT: WebsiteContent = {
  story: '',
  schedule: [],
  travel_notes: '',
  faqs: [],
  registry_links: [],
};

export default function WeddingWebsitePage({ slug }: { slug: string }) {
  const [wedding, setWedding] = useState<WebsitePublic | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [days, setDays] = useState(0);

  useEffect(() => {
    supabase
      .rpc('public_wedding_by_slug', { p_slug: slug, p_kind: 'website' })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) { setNotFound(true); return; }
        const w: WebsitePublic = {
          partner1_name: row.out_partner1_name,
          partner2_name: row.out_partner2_name,
          wedding_date: row.out_wedding_date,
          venue: row.out_venue,
          theme: row.out_theme,
          color_palette: row.out_color_palette,
          website_content: row.out_website_content as WebsiteContent | null,
          rsvp_slug: row.out_rsvp_slug,
          rsvp_enabled: row.out_rsvp_enabled,
        };
        setWedding(w);
        setDays(daysUntil(w.wedding_date) ?? 0);
        track('rsvp_page_viewed', { slug, kind: 'website' });
      });
  }, [slug]);

  useEffect(() => {
    if (!wedding) return;
    const t = setInterval(() => setDays(daysUntil(wedding.wedding_date) ?? 0), 60_000);
    return () => clearInterval(t);
  }, [wedding]);

  useEffect(() => {
    if (wedding) {
      document.title = `${wedding.partner1_name} & ${wedding.partner2_name} — Our Wedding`;
      const meta = document.querySelector('meta[property="og:title"]');
      if (meta) meta.setAttribute('content', `${wedding.partner1_name} & ${wedding.partner2_name} are getting married!`);
      const descMeta = document.querySelector('meta[property="og:description"]');
      if (descMeta) {
        const dateStr = wedding.wedding_date
          ? new Date(`${wedding.wedding_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : '';
        descMeta.setAttribute('content', `Join us${dateStr ? ` on ${dateStr}` : ''}${wedding.venue ? ` at ${wedding.venue}` : ''}.`);
      }
    }
  }, [wedding]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-6">
        <div className="text-center">
          <Heart size={40} className="text-[#8a6d3b] mx-auto mb-4" />
          <h1 className="text-[#2a1f15] font-serif text-2xl mb-2">This wedding website isn't active</h1>
          <p className="text-[#6b5d4f] text-sm">Please check the link from your invitation, or reach out to the couple directly.</p>
          <a href="/" className="inline-block mt-6 text-[#8a6d3b] text-sm font-medium hover:underline">Plan your wedding free with Vow →</a>
        </div>
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#8a6d3b]" />
      </div>
    );
  }

  const content = wedding.website_content || EMPTY_CONTENT;
  // Registry URLs are stored as free-form text, so re-check the scheme here
  // before it ever reaches an href: only real web addresses may be linked.
  const safeRegistryLinks = (content.registry_links || []).filter((link: RegistryLink) => {
    if (!link || typeof link.url !== 'string') return false;
    try {
      const parsed = new URL(link.url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });
  const dateStr = wedding.wedding_date
    ? new Date(`${wedding.wedding_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const isPast = days === 0 && wedding.wedding_date && new Date(`${wedding.wedding_date}T00:00:00`) < new Date();

  return (
    <div className="min-h-screen bg-[#faf9f7] font-sans">
      {/* Hero */}
      <header className="relative bg-gradient-to-br from-[#1a1510] to-[#2e2218] py-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, #c9a96e, transparent 60%)' }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px w-12 bg-[#c9a96e]/30" />
            <Heart size={16} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <div className="h-px w-12 bg-[#c9a96e]/30" />
          </div>
          <p className="text-[#8a6d3b] text-xs tracking-[0.3em] uppercase mb-4">We're getting married</p>
          <h1 className="text-white font-serif text-4xl md:text-6xl italic mb-4">
            {wedding.partner1_name} &amp; {wedding.partner2_name}
          </h1>
          {dateStr && (
            <p className="text-[#a08050] text-sm md:text-base flex items-center justify-center gap-2">
              <Calendar size={14} /> {dateStr}
            </p>
          )}
          {wedding.venue && (
            <p className="text-[#5d4e3e] text-sm mt-1 flex items-center justify-center gap-2">
              <MapPin size={12} /> {wedding.venue}
            </p>
          )}

          {/* Countdown */}
          {!isPast && days > 0 && (
            <div className="mt-8 inline-block">
              <div className="bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-2xl px-8 py-5">
                <div className="text-[#a08050] text-[10px] tracking-widest uppercase mb-1">Days until we say I do</div>
                <div className="text-[#8a6d3b] font-serif text-5xl font-bold leading-none">{days}</div>
              </div>
            </div>
          )}
          {isPast && (
            <div className="mt-8 inline-block bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-2xl px-8 py-5">
              <div className="text-[#8a6d3b] font-serif text-2xl">We're married!</div>
              <div className="text-[#a08050] text-xs mt-1">Thank you for celebrating with us</div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-12">
        {/* Our Story */}
        {content.story && (
          <section>
            <SectionHeader icon={<BookOpen size={16} />} title="Our Story" />
            <p className="text-[#3a2e22] text-sm leading-relaxed whitespace-pre-wrap">{content.story}</p>
          </section>
        )}

        {/* Schedule */}
        {content.schedule.length > 0 && (
          <section>
            <SectionHeader icon={<Clock size={16} />} title="Schedule" />
            <div className="space-y-4">
              {content.schedule.map((item: WebsiteScheduleItem, i: number) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-20 text-right">
                    <div className="text-[#8a6d3b] text-sm font-medium">{item.time}</div>
                  </div>
                  <div className="flex-1 border-l-2 border-[#c9a96e]/30 pl-4">
                    <div className="text-[#2a1f15] text-sm font-medium">{item.title}</div>
                    {item.location && <div className="text-[#6b5d4f] text-xs mt-0.5 flex items-center gap-1"><MapPin size={10} /> {item.location}</div>}
                    {item.note && <div className="text-[#6b5d4f] text-xs mt-1">{item.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Travel */}
        {content.travel_notes && (
          <section>
            <SectionHeader icon={<Plane size={16} />} title="Travel &amp; Accommodation" />
            <p className="text-[#3a2e22] text-sm leading-relaxed whitespace-pre-wrap">{content.travel_notes}</p>
          </section>
        )}

        {/* Registry */}
        {safeRegistryLinks.length > 0 && (
          <section>
            <SectionHeader icon={<Gift size={16} />} title="Registry" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {safeRegistryLinks.map((link: RegistryLink, i: number) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white rounded-xl border border-stone-200 p-5 hover:border-[#c9a96e] hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[#2a1f15] text-sm font-medium">{link.label}</div>
                    <ExternalLink size={14} className="text-[#6b5d4f] group-hover:text-[#8a6d3b] transition-colors" />
                  </div>
                  {link.note && <div className="text-[#6b5d4f] text-xs mt-1">{link.note}</div>}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {content.faqs.length > 0 && (
          <section>
            <SectionHeader icon={<HelpCircle size={16} />} title="FAQ" />
            <div className="space-y-3">
              {content.faqs.map((faq: WebsiteFaqItem, i: number) => (
                <div key={i} className="bg-white rounded-xl border border-stone-200 p-4">
                  <div className="text-[#2a1f15] text-sm font-medium mb-1">{faq.question}</div>
                  <div className="text-[#6b5d4f] text-sm">{faq.answer}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RSVP CTA */}
        {wedding.rsvp_enabled && wedding.rsvp_slug && (
          <section className="text-center pt-4">
            <a
              href={`/rsvp/${wedding.rsvp_slug}`}
              className="inline-flex items-center gap-2 bg-[#8a6d3b] text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors"
            >
              <Heart size={14} /> RSVP Here
            </a>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center">
        <p className="text-[#6b5d4f] text-xs">
          Planned with <a
            href="/?ref=rsvp&utm_source=rsvp&utm_medium=viral&utm_campaign=powered_by"
            onClick={() => track('rsvp_footer_clicked', { slug, kind: 'website' })}
            className="text-[#8a6d3b] hover:underline font-medium"
          >Vow</a> — <a
            href="/?ref=rsvp&utm_source=rsvp&utm_medium=viral&utm_campaign=powered_by"
            onClick={() => track('rsvp_footer_clicked', { slug, kind: 'website' })}
            className="text-[#8a6d3b] hover:underline"
          >Plan your wedding free</a>
        </p>
      </footer>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[#8a6d3b]">{icon}</span>
      <h2 className="text-[#2a1f15] font-serif text-xl">{title}</h2>
      <div className="flex-1 h-px bg-stone-200 ml-2" />
    </div>
  );
}
