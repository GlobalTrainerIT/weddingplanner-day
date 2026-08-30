import { useState, useEffect, useRef } from 'react';
import { BookOpen, Heart, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PROMPTS = [
  'What does your perfect wedding day look like from morning to night?',
  'What are three things you are most excited about?',
  'What traditions are most important to include?',
  'What words do you hope describe your wedding day?',
  'Write a love letter to your partner to read on the wedding morning.',
  'What are you most grateful for in this season of life?',
  'What advice would you give other engaged couples?',
  'What memories do you hope your guests take home?',
];

const KIT_ITEMS = [
  'Safety pins', 'Stain remover pen', 'Pain relievers', 'Band-aids', 'Bobby pins', 'Hair spray',
  'Touch-up makeup', 'Blotting papers', 'Breath mints', 'Needle & thread', 'Double-sided tape',
  'Scissors', 'Phone charger', 'Snacks', 'Water bottle', 'Blister pads', 'Deodorant',
  'Dental floss', 'Tweezers', 'Antacids', 'Eye drops', 'Tide pen', 'Lip balm',
];

export default function Notes({ weddingId }: { weddingId: string }) {
  const [generalNotes, setGeneralNotes] = useState('');
  const [journalResponses, setJournalResponses] = useState<Record<number, string>>({});
  const [gratitude, setGratitude] = useState('');
  const [activePromptIdx, setActivePromptIdx] = useState(0);
  const [kitChecked, setKitChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('wedding_id', weddingId)
      .maybeSingle();
    if (data) {
      setGeneralNotes(data.general_notes || '');
      setGratitude(data.gratitude || '');
      try {
        const parsed = data.journal ? JSON.parse(data.journal) : {};
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          setJournalResponses(parsed);
        }
      } catch {
        // legacy: single string stored — put it in prompt 0
        if (data.journal) setJournalResponses({ 0: data.journal });
      }
    }
  };

  const scheduleAutoSave = (newGeneral: string, newResponses: Record<number, string>, newGratitude: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNotes(newGeneral, newResponses, newGratitude);
    }, 1500);
  };

  const saveNotes = async (g: string, responses: Record<number, string>, gr: string) => {
    setSaving(true);
    await supabase.from('notes').upsert({
      wedding_id: weddingId,
      general_notes: g,
      journal: JSON.stringify(responses),
      gratitude: gr,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'wedding_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGeneral = (v: string) => {
    setGeneralNotes(v);
    scheduleAutoSave(v, journalResponses, gratitude);
  };

  const handleJournal = (v: string) => {
    const updated = { ...journalResponses, [activePromptIdx]: v };
    setJournalResponses(updated);
    scheduleAutoSave(generalNotes, updated, gratitude);
  };

  const handleGratitude = (v: string) => {
    setGratitude(v);
    scheduleAutoSave(generalNotes, journalResponses, v);
  };

  const handleManualSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveNotes(generalNotes, journalResponses, gratitude);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#2a1f15] font-serif text-3xl">Notes & Journal</h1>
          <p className="text-[#6b5d4f] text-sm mt-1">Capture your thoughts, ideas, and memories</p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-[#6b5d4f] text-xs">Saving…</span>}
          {saved && !saving && <span className="text-emerald-600 text-xs">Saved</span>}
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#8a6d3b] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#7a6030] disabled:opacity-50 transition-colors"
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General notes */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="text-[#2a1f15] font-serif text-lg mb-3 flex items-center gap-2">
            <BookOpen size={18} className="text-[#8a6d3b]" /> General Notes
          </h3>
          <textarea
            value={generalNotes}
            onChange={e => handleGeneral(e.target.value)}
            placeholder="Ideas, reminders, questions to ask vendors…"
            rows={10}
            className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm text-[#2a1f15] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none leading-relaxed"
          />
          <div className="text-[#6b5d4f] text-xs mt-2 text-right">{generalNotes.length} characters</div>
        </div>

        {/* Journal prompts */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#1a1510] to-[#2e2218] rounded-xl p-6">
            <h3 className="text-[#8a6d3b] font-serif text-lg mb-3 flex items-center gap-2">
              <Heart size={18} className="fill-[#c9a96e]" /> Journal Prompt
            </h3>
            <p className="text-[#d4c4a4] text-sm leading-relaxed mb-4">"{PROMPTS[activePromptIdx]}"</p>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActivePromptIdx(i)}
                  className={`w-6 h-6 rounded-full text-xs transition-colors ${activePromptIdx === i ? 'bg-[#8a6d3b] text-white' : journalResponses[i] ? 'bg-[#4a3a2a] text-[#8a6d3b]' : 'bg-[#3a2e22] text-[#a08050] hover:bg-[#4a3a2a]'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={journalResponses[activePromptIdx] || ''}
            onChange={e => handleJournal(e.target.value)}
            placeholder="Write your response here…"
            rows={6}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-[#2a1f15] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40 resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Gratitude */}
      <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-6">
        <h3 className="text-[#2a1f15] font-serif text-lg mb-1 flex items-center gap-2">
          <Heart size={18} className="text-rose-400 fill-rose-200" /> Gratitude & Blessings
        </h3>
        <p className="text-[#6b5d4f] text-sm mb-4">What are you grateful for during this wedding planning journey?</p>
        <textarea
          value={gratitude}
          onChange={e => handleGratitude(e.target.value)}
          placeholder="I am grateful for…"
          rows={6}
          className="w-full bg-white border border-rose-100 rounded-lg px-4 py-3 text-sm text-[#2a1f15] focus:outline-none focus:ring-2 focus:ring-rose-200/60 resize-none leading-relaxed"
        />
      </div>

      {/* Emergency kit */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h3 className="text-[#2a1f15] font-serif text-lg mb-4">Wedding Day Emergency Kit</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {KIT_ITEMS.map(item => (
            <label key={item} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!kitChecked[item]}
                onChange={e => setKitChecked(p => ({ ...p, [item]: e.target.checked }))}
                className="accent-[#c9a96e]"
              />
              <span className={`text-sm ${kitChecked[item] ? 'line-through text-[#6b5d4f]' : 'text-[#2a1f15]'}`}>{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
