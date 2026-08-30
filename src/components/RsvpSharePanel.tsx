import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Copy, Check, Download, ExternalLink, Link2, AlertTriangle, Loader2, Calendar, Mail, Globe, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import type { WeddingProfile, Guest } from '../types';
import { generateShareSlug } from '../lib/shareSlug';

interface Props {
  open: boolean;
  onClose: () => void;
  profile: WeddingProfile;
  guests: Guest[];
  onProfileUpdated: (p: WeddingProfile) => void;
}

const generateSlug = generateShareSlug;

export default function RsvpSharePanel({ open, onClose, profile, guests, onProfileUpdated }: Props) {
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [qrError, setQrError] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rsvpUrl = profile.rsvp_slug && profile.rsvp_enabled ? `${window.location.origin}/rsvp/${profile.rsvp_slug}` : '';
  const enabled = profile.rsvp_enabled;

  const responded = guests.filter(g => g.rsvp_status === 'confirmed' || g.rsvp_status === 'declined').length;

  const generateQr = useCallback(async (url: string) => {
    if (!url) return;
    setQrLoading(true);
    setQrError(false);

    // Wait for the canvas to be mounted in the DOM. The panel returns null
    // when closed, so the canvas doesn't exist until React renders it after
    // `open` flips to true. requestAnimationFrame ensures we run after the
    // browser has laid out the canvas element.
    const waitForCanvas = (): Promise<HTMLCanvasElement> => {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          if (canvasRef.current) return resolve(canvasRef.current);
          if (attempts++ > 10) return reject(new Error('QR canvas failed to mount'));
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });
    };

    try {
      const canvas = await waitForCanvas();
      await QRCode.toCanvas(canvas, url, {
        width: 512,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: { dark: '#1a1510', light: '#ffffff' },
      });
      setQrDataUrl(canvas.toDataURL('image/png'));
      const svg = await QRCode.toString(url, {
        type: 'svg',
        margin: 4,
        errorCorrectionLevel: 'H',
        color: { dark: '#1a1510', light: '#ffffff' },
        width: 512,
      });
      setQrSvg(svg);
      setQrError(false);
    } catch (err) {
      setQrError(true);
      setQrDataUrl('');
      setQrSvg('');
    } finally {
      setQrLoading(false);
    }
  }, []);

  // Only generate QR when: dialog is open AND slug exists AND RSVP is enabled.
  // Never fire on dashboard load or when the panel is closed.
  useEffect(() => {
    if (!open || !rsvpUrl) return;
    setQrDataUrl('');
    setQrSvg('');
    setQrError(false);
    generateQr(rsvpUrl);
  }, [open, rsvpUrl, generateQr]);

  const copyLink = async () => {
    if (!rsvpUrl) return;
    try {
      await navigator.clipboard.writeText(rsvpUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = rsvpUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = (format: 'png' | 'svg') => {
    if (format === 'png' && qrDataUrl) {
      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = 'rsvp-qr-code.png';
      a.click();
    } else if (format === 'svg' && qrSvg) {
      const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rsvp-qr-code.svg';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const toggleRsvp = async (enable: boolean) => {
    setToggling(true);
    let slug = profile.rsvp_slug;
    if (enable && !slug) {
      slug = generateSlug(profile.partner1_name, profile.partner2_name);
    }
    const { data } = await supabase
      .from('wedding_profile')
      .update({ rsvp_enabled: enable, rsvp_slug: slug })
      .eq('id', profile.id)
      .select()
      .single();
    setToggling(false);
    if (data) {
      onProfileUpdated(data as WeddingProfile);
      showToast(enable ? 'RSVP page enabled' : 'RSVP page disabled');
    }
  };

  const handleToggle = () => {
    if (enabled) {
      setConfirmDisable(true);
    } else {
      toggleRsvp(true);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Link2 size={18} className="text-[#8a6d3b]" />
              <h3 className="text-[#2a1f15] font-serif text-lg">RSVP Page</h3>
            </div>
            <button onClick={onClose}><X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" /></button>
          </div>

          <div className="p-5 space-y-5">
            {/* Disabled state */}
            {!enabled ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Link2 size={20} className="text-[#6b5d4f]" />
                </div>
                <p className="text-sm text-[#5d4e3e] mb-4 max-w-sm mx-auto">
                  Your RSVP page is currently off. Enable it to give guests a simple link where they can find their name and respond online.
                </p>
                <button
                  onClick={() => toggleRsvp(true)}
                  disabled={toggling}
                  className="bg-[#8a6d3b] text-white text-sm px-5 py-2.5 rounded-lg hover:bg-[#7a6030] transition-colors font-medium disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {toggling ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  Enable RSVP Page
                </button>
              </div>
            ) : (
              <>
                {/* Live response count */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-emerald-800 text-sm font-medium">
                      {responded} of {guests.length} {guests.length === 1 ? 'guest has' : 'guests have'} responded
                    </div>
                    <div className="text-emerald-600 text-xs mt-0.5">
                      {guests.length > 0 ? Math.round((responded / guests.length) * 100) : 0}% response rate
                    </div>
                  </div>
                  <div className="text-emerald-700 font-serif text-2xl font-bold">{responded}<span className="text-emerald-400 text-sm font-normal">/{guests.length}</span></div>
                </div>

                {/* Public link with copy */}
                <div>
                  <label className="text-xs text-[#5d4e3e] uppercase tracking-wider mb-1.5 block font-medium">Public Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={rsvpUrl}
                      className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm text-[#5d4e3e] bg-stone-50/50 focus:outline-none truncate"
                    />
                    <button
                      onClick={copyLink}
                      className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                        copied ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#8a6d3b] text-white hover:bg-[#7a6030]'
                      }`}
                    >
                      {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                    </button>
                  </div>
                </div>

                {/* QR code */}
                <div>
                  <label className="text-xs text-[#5d4e3e] uppercase tracking-wider mb-1.5 block font-medium">QR Code</label>
                  <div className="flex items-start gap-4 bg-stone-50/50 border border-stone-200 rounded-xl p-4">
                    <canvas ref={canvasRef} className="hidden" />
                    {qrError ? (
                      <div className="w-28 h-28 rounded-lg bg-rose-50 border border-rose-200 flex flex-col items-center justify-center flex-shrink-0 gap-1">
                        <AlertCircle size={18} className="text-rose-400" />
                        <span className="text-[10px] text-rose-500 text-center px-1">QR failed</span>
                        <button
                          onClick={() => generateQr(rsvpUrl)}
                          className="text-[10px] text-rose-600 underline hover:text-rose-700"
                        >
                          Retry
                        </button>
                      </div>
                    ) : qrDataUrl ? (
                      <img src={qrDataUrl} alt="RSVP QR code" className="w-28 h-28 rounded-lg bg-white border border-stone-200 flex-shrink-0" />
                    ) : (
                      <div className="w-28 h-28 rounded-lg bg-white border border-stone-200 flex items-center justify-center flex-shrink-0">
                        <Loader2 size={20} className="text-[#6b5d4f] animate-spin" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-[#5d4e3e] mb-2">Print on save-the-dates, invitation inserts, or a wedding signage card. Guests scan to RSVP instantly.</p>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => downloadQr('png')}
                          disabled={qrError || qrLoading || !qrDataUrl}
                          className="flex items-center gap-1.5 text-xs bg-white border border-stone-200 text-[#5d4e3e] px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Download size={12} /> PNG
                        </button>
                        <button
                          onClick={() => downloadQr('svg')}
                          disabled={qrError || qrLoading || !qrSvg}
                          className="flex items-center gap-1.5 text-xs bg-white border border-stone-200 text-[#5d4e3e] px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Download size={12} /> SVG
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview as guest */}
                <button
                  onClick={() => rsvpUrl && window.open(rsvpUrl, '_blank')}
                  className="w-full flex items-center justify-center gap-2 border border-stone-200 text-[#5d4e3e] py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors font-medium"
                >
                  <ExternalLink size={14} /> Preview as a guest
                </button>

                {/* Toggle with warning */}
                <div className="border-t border-stone-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-[#2a1f15] font-medium">RSVP Page Status</div>
                      <div className="text-xs text-emerald-600 mt-0.5">Currently live — guests can respond</div>
                    </div>
                    <button
                      onClick={handleToggle}
                      disabled={toggling}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-[#c9a96e]' : 'bg-stone-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {enabled && (
                    <p className="text-xs text-amber-600 flex items-start gap-1.5 mt-1">
                      <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                      Turning off will immediately disable the page — existing links and QR codes will stop working.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Helper text */}
            <div className="bg-stone-50 rounded-xl p-4 space-y-2">
              <div className="text-xs text-[#5d4e3e] font-medium mb-1">Where to share your RSVP link</div>
              <div className="flex items-start gap-2 text-xs text-[#6b5d4f]">
                <Mail size={13} className="text-[#8a6d3b] mt-0.5 flex-shrink-0" />
                <span><strong className="text-[#5d4e3e]">Save-the-dates</strong> — include the link or QR code so guests can RSVP early.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#6b5d4f]">
                <Calendar size={13} className="text-[#8a6d3b] mt-0.5 flex-shrink-0" />
                <span><strong className="text-[#5d4e3e]">Invitation inserts</strong> — a small card with the QR code alongside your formal invitation.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#6b5d4f]">
                <Globe size={13} className="text-[#8a6d3b] mt-0.5 flex-shrink-0" />
                <span><strong className="text-[#5d4e3e]">Wedding website</strong> — add a "RSVP here" button linking to this page.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmDisable && (
        <ConfirmDialog
          title="Turn off RSVP page?"
          message="Existing links and printed QR codes will stop working immediately. Guests trying to RSVP will see a 'page not found' message. You can turn it back on anytime."
          onConfirm={() => { setConfirmDisable(false); toggleRsvp(false); }}
          onCancel={() => setConfirmDisable(false)}
        />
      )}
    </>
  );
}
