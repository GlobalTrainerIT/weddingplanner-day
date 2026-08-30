import { useState, useEffect, useCallback } from 'react';
import { Heart, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { daysUntil } from '../lib/useCountdown';

interface WeddingPublic {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string;
  venue: string;
}

export default function CountdownPage({ slug }: { slug: string }) {
  const [wedding, setWedding] = useState<WeddingPublic | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [days, setDays] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    supabase
      .rpc('public_wedding_by_slug', { p_slug: slug, p_kind: 'countdown' })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) { setNotFound(true); return; }
        const w: WeddingPublic = {
          partner1_name: row.out_partner1_name,
          partner2_name: row.out_partner2_name,
          wedding_date: row.out_wedding_date,
          venue: row.out_venue,
        };
        setWedding(w);
        setDays(daysUntil(w.wedding_date) ?? 0);
      });
  }, [slug]);

  useEffect(() => {
    if (!wedding) return;
    const t = setInterval(() => setDays(daysUntil(wedding.wedding_date) ?? 0), 60_000);
    return () => clearInterval(t);
  }, [wedding]);

  const handleDownload = useCallback(() => {
    if (!wedding) return;
    setDownloading(true);
    const canvas = document.createElement('canvas');
    const W = 1080, H = 1920;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1a1510');
    grad.addColorStop(1, '#2e2218');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle texture dots
    ctx.fillStyle = 'rgba(201,169,110,0.04)';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gold circle accent
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.38, 340, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201,169,110,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(W / 2, H * 0.38, 300, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201,169,110,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // "DAYS UNTIL WE SAY I DO"
    ctx.fillStyle = '#c9a96e';
    ctx.font = '600 38px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '8px';
    ctx.fillText('DAYS UNTIL WE SAY I DO', W / 2, H * 0.22);

    // Big number
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 320px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(days), W / 2, H * 0.46);

    // Heart
    ctx.fillStyle = '#c9a96e';
    ctx.font = '80px serif';
    ctx.fillText('♥', W / 2, H * 0.55);

    // Names
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic 72px Georgia, serif`;
    ctx.fillText(`${wedding.partner1_name} & ${wedding.partner2_name}`, W / 2, H * 0.64);

    // Date
    if (wedding.wedding_date) {
      const dateStr = new Date(`${wedding.wedding_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      ctx.fillStyle = '#a08050';
      ctx.font = '42px Georgia, serif';
      ctx.fillText(dateStr, W / 2, H * 0.70);
    }

    // Venue
    if (wedding.venue) {
      ctx.fillStyle = '#6a5a4a';
      ctx.font = '36px Georgia, serif';
      ctx.fillText(wedding.venue, W / 2, H * 0.75);
    }

    // Vow branding
    ctx.fillStyle = '#4a3a2a';
    ctx.font = '32px Georgia, serif';
    ctx.fillText('Planned with Vow — weddingplanner.day', W / 2, H * 0.92);

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${wedding.partner1_name}-${wedding.partner2_name}-countdown.png`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloading(false);
    }, 'image/png');
  }, [wedding, days]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-6">
        <div className="text-center">
          <Heart size={40} className="text-[#8a6d3b] mx-auto mb-4" />
          <h1 className="text-[#2a1f15] font-serif text-2xl mb-2">Countdown not found</h1>
          <p className="text-[#6b5d4f] text-sm mb-6">This countdown link may have been disabled.</p>
          <a href="/" className="text-[#8a6d3b] text-sm font-medium hover:underline">Plan your wedding free with Vow →</a>
        </div>
      </div>
    );
  }

  const weddingDateStr = wedding?.wedding_date
    ? new Date(`${wedding.wedding_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1510] to-[#2e2218] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full border border-[#c9a96e]/10" />
      </div>
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[800px] h-[800px] rounded-full border border-[#c9a96e]/05" />
      </div>

      {!wedding ? (
        <Loader2 size={36} className="animate-spin text-[#8a6d3b]" />
      ) : (
        <div className="relative z-10 text-center max-w-lg w-full">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-px w-12 bg-[#c9a96e]/30" />
            <Heart size={14} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <div className="h-px w-12 bg-[#c9a96e]/30" />
          </div>

          <p className="text-[#8a6d3b] text-xs tracking-[0.3em] uppercase mb-4">Days until we say I do</p>

          <div className="relative">
            <div className="text-white font-serif font-bold leading-none" style={{ fontSize: 'clamp(120px, 25vw, 200px)' }}>
              {days}
            </div>
          </div>

          <Heart size={24} className="text-[#8a6d3b] fill-[#c9a96e] mx-auto my-4" />

          <h1 className="text-white font-serif text-3xl md:text-4xl italic mb-3">
            {wedding.partner1_name} &amp; {wedding.partner2_name}
          </h1>

          {weddingDateStr && (
            <p className="text-[#a08050] text-sm mb-1">{weddingDateStr}</p>
          )}
          {wedding.venue && (
            <p className="text-[#5d4e3e] text-xs">{wedding.venue}</p>
          )}

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 bg-[#8a6d3b] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors disabled:opacity-60"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download for Instagram
            </button>
            <a
              href="/"
              className="text-[#5d4e3e] text-sm hover:text-[#8a6d3b] transition-colors"
            >
              Plan your wedding free with Vow →
            </a>
          </div>

          <p className="text-[#3a2e22] text-xs mt-8">
            Powered by <a href="/" className="text-[#4a3a2a] hover:text-[#8a6d3b] transition-colors">Vow</a>
          </p>
        </div>
      )}
    </div>
  );
}
