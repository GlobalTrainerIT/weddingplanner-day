import { useState } from 'react';
import { Download, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  sourcePost: string;
  placement: 'mid' | 'end';
}

export default function BlogEmailCapture({ sourcePost, placement }: Props) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await supabase.from('leads').insert({
        email,
        source: 'blog_checklist_download',
        metadata: { post: sourcePost, placement },
      });
    } catch {
      // still show success to avoid leaking errors
    }
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div className={`bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-2xl p-8 ${placement === 'mid' ? 'my-12' : 'mt-12'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#c9a96e]/20 flex items-center justify-center flex-shrink-0">
          <Download size={18} className="text-[#c9a96e]" />
        </div>
        <div>
          <h3 className="font-serif text-xl text-white">Get the free 48-task wedding checklist</h3>
          <p className="text-[#a08050] text-sm">Download a printable PDF — just enter your email.</p>
        </div>
      </div>
      {submitted ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Download size={14} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Your checklist is on its way!</p>
            <p className="text-[#a08050] text-xs">Check your inbox for the download link.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a7a6a]" />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-[#8a7a6a] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#8a6d3b] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#7a6030] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : 'Get the checklist'}
          </button>
        </form>
      )}
    </div>
  );
}
