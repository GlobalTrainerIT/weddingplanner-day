import { useState, useEffect, useRef } from 'react';
import { Heart, Check, X, ChevronDown, Loader2, Search, Users, Calendar, MapPin, Lock, ArrowLeft, CheckCircle, Shield, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CaptchaBadge from './CaptchaBadge';
import { track } from '../lib/analytics';

interface WeddingPublic {
  id: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  venue: string;
  rsvp_deadline: string | null;
}

interface GuestPublic {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  meal_choice: string;
  dietary_restrictions: string;
  has_plus_one: boolean;
  plus_one_name: string;
  plus_one_rsvp: string;
  plus_one_allowed: boolean;
  household_id: string | null;
}

interface HouseholdMatch {
  id: string;
  name: string;
  address: string;
  members: GuestPublic[];
}

type Step = 'loading' | 'lookup' | 'disambiguate' | 'form' | 'done' | 'not-found' | 'closed' | 'invalid-link';

const MEAL_OPTIONS = ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'];

export default function RsvpPage({ slug }: { slug: string }) {
  const [wedding, setWedding] = useState<WeddingPublic | null>(null);
  const [step, setStep] = useState<Step>('loading');

  const [searchName, setSearchName] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<HouseholdMatch[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdMatch | null>(null);

  // Per-member RSVP state keyed by guest id
  const [memberRsvps, setMemberRsvps] = useState<Record<string, { attending: boolean; meal: string; dietary: string; plusOneAttending: boolean; plusOneName: string }>>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaAttemptKey, setCaptchaAttemptKey] = useState('initial');
  const submitAttemptRef = useRef(0);

  useEffect(() => { loadWedding(); }, [slug]);

  async function loadWedding() {
    const { data, error } = await supabase.rpc('public_wedding_by_slug', {
      p_slug: slug,
      p_kind: 'rsvp',
    });

    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) { setStep('invalid-link'); return; }
    const w: WeddingPublic = {
      id: row.out_id,
      partner1_name: row.out_partner1_name,
      partner2_name: row.out_partner2_name,
      wedding_date: row.out_wedding_date,
      venue: row.out_venue,
      rsvp_deadline: row.out_rsvp_deadline,
    } as WeddingPublic;
    setWedding(w);

    // Check deadline
    if (w.rsvp_deadline) {
      const deadline = new Date(w.rsvp_deadline + 'T23:59:59');
      if (deadline < new Date()) { setStep('closed'); return; }
    }
    setStep('lookup');
    track('rsvp_page_viewed', { slug });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!wedding) { setStep('invalid-link'); return; }
    if (searchName.trim().length < 3) return;
    setSearching(true);
    const q = searchName.trim().toLowerCase();

    // The server matches and returns only the households that match this search
    // term for this slug — the full guest list is never sent to the browser.
    const { data: rows } = await supabase.rpc('rsvp_lookup', {
      p_slug: slug,
      p_query: q,
    });

    type LookupRow = {
      out_household_id: string | null;
      out_household_name: string | null;
      out_guest_id: string;
      out_first_name: string;
      out_last_name: string;
      out_rsvp_status: string;
      out_meal_choice: string | null;
      out_dietary_restrictions: string | null;
      out_has_plus_one: boolean;
      out_plus_one_name: string | null;
      out_plus_one_rsvp: string | null;
      out_plus_one_allowed: boolean;
      out_wedding_id: string;
    };

    const toGuest = (r: LookupRow): GuestPublic => ({
      id: r.out_guest_id,
      first_name: r.out_first_name,
      last_name: r.out_last_name,
      rsvp_status: r.out_rsvp_status,
      meal_choice: r.out_meal_choice || '',
      dietary_restrictions: r.out_dietary_restrictions || '',
      has_plus_one: r.out_has_plus_one,
      plus_one_name: r.out_plus_one_name || '',
      plus_one_rsvp: r.out_plus_one_rsvp || '',
      plus_one_allowed: r.out_plus_one_allowed,
      household_id: r.out_household_id,
    } as GuestPublic);

    const lookupRows = (rows || []) as LookupRow[];

    // Build household matches
    const householdMatches: HouseholdMatch[] = [];
    const byHousehold = new Map<string, { name: string; members: GuestPublic[] }>();

    lookupRows.forEach(r => {
      if (r.out_household_id) {
        const entry = byHousehold.get(r.out_household_id)
          || { name: r.out_household_name || '', members: [] };
        entry.members.push(toGuest(r));
        byHousehold.set(r.out_household_id, entry);
      } else {
        // Individual guests as single-member "households"
        const g = toGuest(r);
        householdMatches.push({
          id: `individual-${g.id}`,
          name: `${g.first_name} ${g.last_name}`,
          address: '',
          members: [g],
        });
      }
    });

    byHousehold.forEach((entry, hid) => {
      if (entry.members.length === 0) return;
      householdMatches.push({ id: hid, name: entry.name, address: '', members: entry.members });
    });

    setMatches(householdMatches);
    setSearching(false);

    if (householdMatches.length === 0) {
      setStep('not-found');
    } else if (householdMatches.length === 1) {
      selectHousehold(householdMatches[0]);
    } else {
      setStep('disambiguate');
    }
  }

  function selectHousehold(h: HouseholdMatch) {
    setSelectedHousehold(h);
    // Initialize per-member state from existing data
    const rsvps: Record<string, { attending: boolean; meal: string; dietary: string; plusOneAttending: boolean; plusOneName: string }> = {};
    h.members.forEach(g => {
      rsvps[g.id] = {
        attending: g.rsvp_status === 'confirmed',
        meal: g.meal_choice || '',
        dietary: g.dietary_restrictions || '',
        plusOneAttending: g.plus_one_rsvp === 'attending',
        plusOneName: g.plus_one_name || '',
      };
    });
    setMemberRsvps(rsvps);
    setStep('form');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wedding || !selectedHousehold) return;
    setSubmitting(true);
    setSubmitError('');
    submitAttemptRef.current += 1;

    // Guests who are not in a household submit on their own; the server then
    // requires the submission to be exactly that one unhoused guest.
    const householdId = selectedHousehold.id.startsWith('individual-')
      ? null
      : selectedHousehold.id;

    const members = selectedHousehold.members.map(g => {
      const r = memberRsvps[g.id];
      return {
        guest_id: g.id,
        attending: r?.attending ?? false,
        meal: r?.attending ? (r.meal || '') : '',
        dietary: r?.dietary || '',
        plus_one_attending: r?.plusOneAttending ?? false,
        plus_one_name: r?.plusOneName || '',
      };
    });

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('rsvp-submit', {
        body: {
          wedding_id: wedding.id,
          household_id: householdId,
          captcha_token: captchaToken || undefined,
          members,
          message: message.trim(),
        },
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      setSubmitting(false);
      setStep('done');
      track('rsvp_submitted', { slug });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong submitting your RSVP.';
      setSubmitError(msg);
      setSubmitting(false);
      // Reset captcha for next attempt
      submitAttemptRef.current += 1;
      setCaptchaAttemptKey(`attempt-${submitAttemptRef.current}`);
    }
  }

  const weddingDateStr = wedding?.wedding_date
    ? new Date(`${wedding.wedding_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const deadlineStr = wedding?.rsvp_deadline
    ? new Date(`${wedding.rsvp_deadline}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-[#faf9f7] font-sans flex flex-col">
      <header className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] py-10 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Heart size={16} className="text-[#8a6d3b] fill-[#c9a96e]" />
          <span className="text-[#8a6d3b] text-xs tracking-widest uppercase">RSVP</span>
        </div>
        {wedding ? (
          <>
            <h1 className="text-white font-serif text-3xl md:text-4xl mb-2">
              {wedding.partner1_name} &amp; {wedding.partner2_name}
            </h1>
            {weddingDateStr && <p className="text-[#a08050] text-sm flex items-center justify-center gap-1.5"><Calendar size={12} /> {weddingDateStr}</p>}
            {wedding.venue && <p className="text-[#5d4e3e] text-xs mt-1 flex items-center justify-center gap-1.5"><MapPin size={10} /> {wedding.venue}</p>}
          </>
        ) : step === 'loading' ? (
          <div className="w-48 h-8 bg-white/10 rounded animate-pulse mx-auto" />
        ) : null}
      </header>

      <main className="flex-1 flex items-start justify-center p-4 md:p-6 pt-8">
        <div className="w-full max-w-md">

          {step === 'loading' && (
            <div className="text-center py-16">
              <Loader2 size={32} className="animate-spin text-[#8a6d3b] mx-auto" />
            </div>
          )}

          {step === 'closed' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-stone-500" />
              </div>
              <h2 className="text-[#2a1f15] font-serif text-xl mb-2">Responses are closed</h2>
              <p className="text-[#6b5d4f] text-sm">
                The RSVP deadline{deadlineStr ? ` of ${deadlineStr}` : ''} has passed. Please contact {wedding?.partner1_name} or {wedding?.partner2_name} directly if you need to change your response.
              </p>
            </div>
          )}

          {step === 'invalid-link' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                <Heart size={24} className="text-rose-400" />
              </div>
              <h2 className="text-[#2a1f15] font-serif text-xl mb-2">This RSVP link isn't active</h2>
              <p className="text-[#6b5d4f] text-sm">Please check the link from your invitation, or reach out to the couple directly.</p>
            </div>
          )}

          {step === 'not-found' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                <X size={24} className="text-rose-400" />
              </div>
              <h2 className="text-[#2a1f15] font-serif text-xl mb-2">Name not found</h2>
              <p className="text-[#6b5d4f] text-sm mb-6">We couldn't find your name on the guest list. Please double-check the spelling{wedding?.partner1_name && wedding?.partner2_name ? ` or contact ${wedding.partner1_name} or ${wedding.partner2_name}` : ''}.</p>
              <button onClick={() => { setStep('lookup'); setSearchName(''); setMatches([]); }} className="text-[#8a6d3b] text-sm font-medium hover:underline">Try again</button>
            </div>
          )}

          {step === 'lookup' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-sm">
              <h2 className="text-[#2a1f15] font-serif text-2xl mb-1">Find your invitation</h2>
              <p className="text-[#6b5d4f] text-sm mb-6">Enter your name or your household name as it appears on your invitation.</p>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5d4f]" />
                  <input
                    type="text"
                    value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    placeholder="Your name or household name"
                    className="w-full border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-[#2a1f15] text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchName.trim().length < 3 || searching}
                  className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {searching ? <><Loader2 size={14} className="animate-spin" /> Searching…</> : 'Find my invitation'}
                </button>
              </form>
              {deadlineStr && (
                <p className="text-xs text-[#6b5d4f] mt-4 text-center">Please respond by {deadlineStr}</p>
              )}
            </div>
          )}

          {step === 'disambiguate' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-sm">
              <h2 className="text-[#2a1f15] font-serif text-2xl mb-1">Multiple matches found</h2>
              <p className="text-[#6b5d4f] text-sm mb-5">We found several households matching "{searchName}". Which one is yours?</p>
              <div className="space-y-2">
                {matches.map(m => (
                  <button
                    key={m.id}
                    onClick={() => selectHousehold(m)}
                    className="w-full flex items-center justify-between border border-stone-200 rounded-xl px-4 py-3 hover:bg-stone-50 transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#2a1f15]">{m.name}</div>
                      <div className="text-xs text-[#6b5d4f] mt-0.5">{m.members.length} {m.members.length !== 1 ? 'members' : 'member'}: {m.members.map(g => g.first_name).join(', ')}</div>
                    </div>
                    <Users size={16} className="text-[#8a6d3b] flex-shrink-0" />
                  </button>
                ))}
              </div>
              <button onClick={() => { setStep('lookup'); setSearchName(''); setMatches([]); }} className="text-[#8a6d3b] text-sm hover:underline mt-4 flex items-center gap-1">
                <ArrowLeft size={12} /> Search again
              </button>
            </div>
          )}

          {step === 'form' && selectedHousehold && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Home2 size={16} className="text-[#8a6d3b]" />
                  <h2 className="text-[#2a1f15] font-serif text-xl">{selectedHousehold.name}</h2>
                </div>
                <p className="text-[#6b5d4f] text-xs mb-4">RSVP for everyone in your household below.</p>

                <div className="space-y-5">
                  {selectedHousehold.members.map(g => {
                    const r = memberRsvps[g.id] || { attending: true, meal: '', dietary: '', plusOneAttending: false, plusOneName: '' };
                    return (
                      <div key={g.id} className="border-t border-stone-100 pt-4 first:border-0 first:pt-0">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-[#2a1f15]">{g.first_name} {g.last_name}</span>
                        </div>

                        {/* Attending toggle */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setMemberRsvps(prev => ({ ...prev, [g.id]: { ...prev[g.id], attending: true } }))}
                            className={`py-2 rounded-lg text-sm font-medium border-2 transition-all ${r.attending ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-[#6b5d4f]'}`}
                          >
                            <Check size={14} className="inline mr-1" /> Attending
                          </button>
                          <button
                            type="button"
                            onClick={() => setMemberRsvps(prev => ({ ...prev, [g.id]: { ...prev[g.id], attending: false } }))}
                            className={`py-2 rounded-lg text-sm font-medium border-2 transition-all ${!r.attending ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-stone-200 text-[#6b5d4f]'}`}
                          >
                            <X size={14} className="inline mr-1" /> Not attending
                          </button>
                        </div>

                        {r.attending && (
                          <div className="space-y-3 pl-2 border-l-2 border-stone-100 ml-1">
                            {/* Meal choice */}
                            <div>
                              <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Meal preference</label>
                              <div className="relative">
                                <select
                                  value={r.meal}
                                  onChange={e => setMemberRsvps(prev => ({ ...prev, [g.id]: { ...prev[g.id], meal: e.target.value } }))}
                                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-[#2a1f15] appearance-none focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 bg-white"
                                >
                                  <option value="">No preference</option>
                                  {MEAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5d4f] pointer-events-none" />
                              </div>
                            </div>

                            {/* Dietary restrictions */}
                            <div>
                              <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-1.5">Dietary restrictions &amp; allergies</label>
                              <input
                                type="text"
                                value={r.dietary}
                                onChange={e => setMemberRsvps(prev => ({ ...prev, [g.id]: { ...prev[g.id], dietary: e.target.value } }))}
                                placeholder="Allergies, gluten-free, etc."
                                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-[#2a1f15] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                              />
                            </div>

                            {/* Plus-one */}
                            {g.plus_one_allowed && (
                              <div className="bg-stone-50 rounded-lg p-3 space-y-2">
                                <button
                                  type="button"
                                  onClick={() => setMemberRsvps(prev => ({ ...prev, [g.id]: { ...prev[g.id], plusOneAttending: !prev[g.id].plusOneAttending } }))}
                                  className="flex items-center gap-2 text-sm text-[#2a1f15]"
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${r.plusOneAttending ? 'bg-[#c9a96e] border-[#c9a96e]' : 'border-stone-300'}`}>
                                    {r.plusOneAttending && <Check size={11} className="text-white" />}
                                  </div>
                                  Bring a plus-one
                                </button>
                                {r.plusOneAttending && (
                                  <input
                                    type="text"
                                    value={r.plusOneName}
                                    onChange={e => setMemberRsvps(prev => ({ ...prev, [g.id]: { ...prev[g.id], plusOneName: e.target.value } }))}
                                    placeholder="Plus-one's full name"
                                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-[#2a1f15] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 bg-white"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Message to the couple */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 md:p-6 shadow-sm">
                <label className="text-xs text-[#5d4e3e] uppercase tracking-wider block mb-2">Message for the couple <span className="text-[#8a7a6a] normal-case font-normal">(optional)</span></label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Share a note or well wishes…"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-[#2a1f15] resize-none focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                />
              </div>

              {submitError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                  <Shield size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <CaptchaBadge onToken={setCaptchaToken} action="rsvp" resetKey={captchaAttemptKey} />

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#8a6d3b] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#7a6030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : 'Submit RSVP'}
              </button>

              <button type="button" onClick={() => { setStep('lookup'); setSearchName(''); setMatches([]); setSelectedHousehold(null); }} className="w-full text-[#6b5d4f] text-xs hover:text-[#5d4e3e] transition-colors flex items-center justify-center gap-1">
                <ArrowLeft size={12} /> Back to search
              </button>
            </form>
          )}

          {step === 'done' && selectedHousehold && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-10 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={28} className="text-emerald-500" />
              </div>
              <h2 className="text-[#2a1f15] font-serif text-2xl mb-3">Thank you!</h2>
              <p className="text-[#6b5d4f] text-sm mb-5">Your RSVP for {selectedHousehold.name} has been recorded.</p>

              {/* Summary */}
              <div className="bg-stone-50 rounded-xl p-4 text-left space-y-2 mb-5">
                {selectedHousehold.members.map(g => {
                  const r = memberRsvps[g.id];
                  return (
                    <div key={g.id} className="flex items-center justify-between text-sm">
                      <span className="text-[#2a1f15]">{g.first_name} {g.last_name}</span>
                      <span className={r?.attending ? 'text-emerald-600 font-medium' : 'text-rose-500'}>
                        {r?.attending ? `Attending${r.meal ? ` · ${r.meal}` : ''}` : 'Not attending'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-[#6b5d4f]">
                You can return to this page to update your response{deadlineStr ? ` before ${deadlineStr}` : ''}.
              </p>

              {/* "Getting married too?" CTA */}
              <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-xl p-5 mt-6 text-center">
                <Heart size={16} className="text-[#8a6d3b] fill-[#c9a96e] mx-auto mb-2" />
                <p className="text-white text-sm font-medium mb-1">Getting married too?</p>
                <p className="text-[#a08050] text-xs mb-3">Plan your wedding free with Vow — checklist, budget tracker, guest list, and more.</p>
                <a
                  href="/signup?ref=rsvp&utm_source=rsvp&utm_medium=viral&utm_campaign=powered_by"
                  onClick={() => track('rsvp_thankyou_cta_clicked', { slug })}
                  className="inline-flex items-center gap-1.5 bg-[#8a6d3b] text-white px-5 py-2 rounded-lg text-xs font-medium hover:bg-[#7a6030] transition-colors"
                >
                  Start planning free <ArrowRight size={12} />
                </a>
              </div>

              <button onClick={() => { setStep('lookup'); setSearchName(''); setMatches([]); setSelectedHousehold(null); }} className="text-[#8a6d3b] text-sm hover:underline mt-4">
                Back to search
              </button>
            </div>
          )}

        </div>
      </main>

      <footer className="py-6 text-center border-t border-stone-100">
        <p className="text-[#8a7a6a] text-xs">
          Planned with{' '}
          <a
            href="/?ref=rsvp&utm_source=rsvp&utm_medium=viral&utm_campaign=powered_by"
            onClick={() => track('rsvp_footer_clicked', { slug })}
            className="text-[#8a6d3b] hover:underline font-medium"
          >Vow</a>
          {' '}— <a
            href="/?ref=rsvp&utm_source=rsvp&utm_medium=viral&utm_campaign=powered_by"
            onClick={() => track('rsvp_footer_clicked', { slug })}
            className="text-[#8a6d3b] hover:underline"
          >Plan your wedding free</a>
        </p>
      </footer>
    </div>
  );
}

// Minimal inline Home icon (lucide-react doesn't export Home2)
function Home2({ size = 16, className = '' }: { size?: number; className?: string }) {
  return <Users size={size} className={className} />;
}
