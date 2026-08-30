import { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, Download, Trash2, Bell, BellRing, Globe, DollarSign, Clock, AlertTriangle, X, BellOff, Send, Loader2, BellRing as BellRingIcon, Calendar, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';
import type { WeddingProfile, Section } from '../types';
import { useDarkMode } from '../lib/useDarkMode';
import { usePushPermission, subscribeToPush, unsubscribeFromPush } from '../lib/pwa';

interface Props {
  profile: WeddingProfile | null;
  onUpdateProfile: (p: WeddingProfile) => void;
  onNavigate: (s: Section) => void;
  isPro: boolean;
  onShowPricing: () => void;
}

const BROWSER_TZ = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
const TIMEZONES = Array.from(new Set([BROWSER_TZ, 'UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney']));
const DATE_FORMATS = ['MMM d, yyyy', 'd MMM yyyy', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd'];
const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)' },
];

const NOTIF_TYPES: { key: string; label: string; description: string }[] = [
  { key: 'task_due', label: 'Task due tomorrow', description: 'Push when a checklist task is due the next day' },
  { key: 'payment_due_7day', label: 'Payment due in 7 days', description: 'Reminder 7 days before a payment is due' },
  { key: 'payment_due_today', label: 'Payment due today', description: 'Alert on the day a payment is due' },
  { key: 'rsvp_deadline', label: 'RSVP deadline in 3 days', description: 'Reminder 3 days before your RSVP deadline' },
  { key: 'new_rsvp', label: 'New RSVP received', description: 'Immediate alert when a guest responds' },
  { key: 'partner_task', label: 'Partner completed a task', description: 'Notify your partner when you complete a task' },
  { key: 'mention', label: '@mentions', description: 'When you are mentioned in a comment or note' },
];

interface NotifTypePref { push: boolean; email: boolean; }
type NotifPrefs = Record<string, NotifTypePref>;

interface NotifSettings {
  notif_types: NotifPrefs;
  quiet_hours_start: string;
  quiet_hours_end: string;
  pause_all_until: string | null;
}

export default function SettingsPage({ profile, onUpdateProfile, isPro, onShowPricing }: Props) {
  const [darkMode, setDarkMode] = useDarkMode();
  const [, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [notifSettings, setNotifSettings] = useState<NotifSettings | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const { permission, showPrimer, canAskAgain, requestPermission, prime, dismissPrimer, daysUntilCanAsk } = usePushPermission();

  // Load notification preferences
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setNotifSettings({
          notif_types: data.notif_types as NotifPrefs,
          quiet_hours_start: data.quiet_hours_start || '22:00',
          quiet_hours_end: data.quiet_hours_end || '07:00',
          pause_all_until: data.pause_all_until,
        });
      } else {
        // Default preferences
        const defaults: NotifPrefs = {};
        NOTIF_TYPES.forEach(t => { defaults[t.key] = { push: true, email: true }; });
        setNotifSettings({
          notif_types: defaults,
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
          pause_all_until: null,
        });
      }

      // Check if already subscribed
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      }
    })();
  }, []);

  const saveNotifSettings = useCallback(async (settings: NotifSettings) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setNotifSaving(true);
    await supabase.from('notification_preferences').upsert({
      user_id: user.id,
      notif_types: settings.notif_types,
      quiet_hours_start: settings.quiet_hours_start,
      quiet_hours_end: settings.quiet_hours_end,
      pause_all_until: settings.pause_all_until,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setNotifSaving(false);
    showToast('Notification preferences saved');
  }, []);

  const toggleTypePref = (key: string, channel: 'push' | 'email') => {
    if (!notifSettings) return;
    const updated = {
      ...notifSettings,
      notif_types: {
        ...notifSettings.notif_types,
        [key]: { ...notifSettings.notif_types[key], [channel]: !notifSettings.notif_types[key]?.[channel] },
      },
    };
    setNotifSettings(updated);
    saveNotifSettings(updated);
  };

  const updateQuietHours = (field: 'quiet_hours_start' | 'quiet_hours_end', value: string) => {
    if (!notifSettings) return;
    const updated = { ...notifSettings, [field]: value };
    setNotifSettings(updated);
    saveNotifSettings(updated);
  };

  const updatePauseUntil = (value: string) => {
    if (!notifSettings) return;
    const updated = { ...notifSettings, pause_all_until: value ? new Date(value).toISOString() : null };
    setNotifSettings(updated);
    saveNotifSettings(updated);
  };

  const handleEnablePush = async () => {
    if (permission === 'default') {
      prime(); // show the primer, don't call permission API cold
      return;
    }
    if (permission === 'granted') {
      const sub = await subscribeToPush();
      if (sub) {
        setPushSubscribed(true);
        showToast('Push notifications enabled');
      } else {
        showToast('Failed to enable push', 'error');
      }
    }
  };

  const handlePrimerAccept = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      const sub = await subscribeToPush();
      if (sub) {
        setPushSubscribed(true);
        showToast('Push notifications enabled');
      }
    }
  };

  const handleDisablePush = async () => {
    await unsubscribeFromPush();
    setPushSubscribed(false);
    showToast('Push notifications disabled');
  };

  const sendTestNotification = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setTestSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          user_id: user.id,
          notif_type: 'task_due',
          title: 'Test notification from Vow',
          body: 'If you can see this, push notifications are working! Tap to open your checklist.',
          deep_link: '/app?section=checklist',
        },
      });
      if (error) throw error;
      showToast('Test notification sent');
    } catch {
      showToast('Failed to send test — make sure push is enabled', 'error');
    }
    setTestSending(false);
  };

  const handleSaveCurrency = async (code: string, symbol: string) => {
    if (!profile) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('wedding_profile')
      .update({ currency_code: code, currency_symbol: symbol, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select()
      .single();
    setSaving(false);
    if (data && !error) {
      onUpdateProfile(data);
      showToast('Currency updated');
    } else {
      showToast('Failed to update currency', 'error');
    }
  };

  const handleExportData = async () => {
    if (!profile) return;
    const tables = ['checklist_items', 'budget_items', 'guests', 'vendors', 'bridal_party', 'notes', 'budget_payments', 'households'];
    const exportData: Record<string, unknown> = { wedding_profile: profile };

    for (const table of tables) {
      const { data } = await supabase.from(table).select('*').eq('wedding_id', profile.id);
      if (data) exportData[table] = data;
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vow-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  };

  const toCSV = (rows: Record<string, unknown>[]): string => {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (val: unknown) => {
      const s = val === null || val === undefined ? '' : String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map(h => escape(row[h])).join(','));
    }
    return lines.join('\n');
  };

  const downloadCSV = (filename: string, rows: Record<string, unknown>[]) => {
    const csv = toCSV(rows);
    if (!csv) { showToast('No data to export', 'error'); return; }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    if (!profile) return;
    const dateStr = new Date().toISOString().slice(0, 10);

    const { data: guests } = await supabase.from('guests').select('*').eq('wedding_id', profile.id);
    if (guests) downloadCSV(`vow-guests-${dateStr}.csv`, guests as Record<string, unknown>[]);

    const { data: budgetItems } = await supabase.from('budget_items').select('*').eq('wedding_id', profile.id);
    if (budgetItems) downloadCSV(`vow-budget-items-${dateStr}.csv`, budgetItems as Record<string, unknown>[]);

    const { data: payments } = await supabase.from('budget_payments').select('*').eq('wedding_id', profile.id);
    if (payments) downloadCSV(`vow-payments-${dateStr}.csv`, payments as Record<string, unknown>[]);

    const { data: vendors } = await supabase.from('vendors').select('*').eq('wedding_id', profile.id);
    if (vendors) downloadCSV(`vow-vendors-${dateStr}.csv`, vendors as Record<string, unknown>[]);

    const { data: checklist } = await supabase.from('checklist_items').select('*').eq('wedding_id', profile.id);
    if (checklist) downloadCSV(`vow-checklist-${dateStr}.csv`, checklist as Record<string, unknown>[]);

    showToast('CSV files downloaded');
  };

  const handleDeleteAccount = async () => {
    if (!profile || deleteConfirmText !== 'DELETE') return;
    const { error } = await supabase.from('wedding_profile').delete().eq('id', profile.id);
    if (error) {
      showToast('Failed to delete account', 'error');
      return;
    }
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[#2a1f15] font-serif text-3xl">Settings</h1>
        <p className="text-[#6b5d4f] text-sm mt-1">Manage your account, preferences, and data</p>
      </div>

      {/* Plan status */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[#2a1f15] font-medium text-sm mb-1">Plan</h2>
            <p className="text-[#6b5d4f] text-sm">
              {isPro ? 'Vow Pro — full access to all features' : 'Free plan — upgrade for unlimited access'}
            </p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full ${isPro ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>
        {isPro && (
          <p className="text-xs text-[#6b5d4f] mt-3 pt-3 border-t border-stone-100">
            No billing information on file — Pro access is complimentary.
          </p>
        )}
      </div>

      {/* Currency */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={16} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-medium text-sm">Currency</h2>
        </div>
        <select
          value={profile?.currency_code || 'USD'}
          onChange={e => {
            const c = CURRENCIES.find(c => c.code === e.target.value);
            if (c) handleSaveCurrency(c.code, c.symbol);
          }}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
        >
          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </div>

      {/* Branding toggle (Pro only) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-medium text-sm">Public page branding</h2>
          {!isPro && <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Pro</span>}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[#2a1f15]">Hide Vow branding on public pages</div>
            <div className="text-xs text-[#6b5d4f] mt-0.5">
              {isPro
                ? 'Removes the "Planned with Vow" credit from your RSVP page and wedding website.'
                : 'Upgrade to Pro to remove the Vow credit from your public pages.'}
            </div>
          </div>
          <button
            onClick={async () => {
              if (!isPro || !profile) { onShowPricing(); return; }
              const newVal = !profile.hide_branding;
              const { data, error } = await supabase
                .from('wedding_profile')
                .update({ hide_branding: newVal, updated_at: new Date().toISOString() })
                .eq('id', profile.id)
                .select()
                .single();
              if (data && !error) {
                onUpdateProfile(data);
                showToast(newVal ? 'Branding hidden' : 'Branding visible');
              }
            }}
            disabled={!isPro}
            className={`w-11 h-6 rounded-full transition-colors ${profile?.hide_branding && isPro ? 'bg-[#c9a96e]' : 'bg-stone-200'} disabled:opacity-40 disabled:cursor-not-allowed`}
            aria-label="Toggle branding visibility"
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${profile?.hide_branding && isPro ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {!isPro && (
          <button onClick={() => onShowPricing()} className="mt-3 text-xs text-[#8a6d3b] hover:underline">
            Upgrade to Pro to hide branding →
          </button>
        )}
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-medium text-sm">Preferences</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Timezone</label>
            <select defaultValue={BROWSER_TZ} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[#5d4e3e] text-xs uppercase tracking-wider mb-1 block">Date format</label>
            <select className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40">
              {DATE_FORMATS.map(df => <option key={df}>{df}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon size={16} className="text-[#8a6d3b]" /> : <Sun size={16} className="text-[#8a6d3b]" />}
              <span className="text-[#2a1f15] text-sm">Dark mode</span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-[#c9a96e]' : 'bg-stone-200'}`}
              aria-label="Toggle dark mode"
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={16} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-medium text-sm">Notifications</h2>
          {notifSaving && <Loader2 size={12} className="animate-spin text-[#6b5d4f]" />}
        </div>
        <p className="text-[#6b5d4f] text-xs mb-4">Choose which alerts you receive and how they're delivered.</p>

        {/* Push enable/disable */}
        <div className="bg-stone-50 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pushSubscribed ? <BellRing size={18} className="text-emerald-600" /> : <BellRingIcon size={18} className="text-[#6b5d4f]" />}
              <div>
                <div className="text-sm text-[#2a1f15] font-medium">
                  {pushSubscribed ? 'Push notifications enabled' : 'Push notifications not enabled'}
                </div>
                <div className="text-xs text-[#6b5d4f]">
                  {permission === 'denied' ? 'Blocked by browser — adjust site settings to allow' :
                   permission === 'granted' && !pushSubscribed ? 'Permission granted — enable to receive push' :
                   pushSubscribed ? 'You will receive push notifications on this device' :
                   canAskAgain ? 'Enable to get reminders on this device' : `Declined — we'll ask again in ${daysUntilCanAsk} days`}
                </div>
              </div>
            </div>
            {pushSubscribed ? (
              <button onClick={handleDisablePush} className="flex items-center gap-1.5 border border-stone-200 text-[#5d4e3e] px-3 py-1.5 rounded-lg text-xs hover:bg-white transition-colors">
                <BellOff size={13} /> Disable
              </button>
            ) : (
              <button
                onClick={handleEnablePush}
                disabled={permission === 'denied' || !canAskAgain}
                className="flex items-center gap-1.5 bg-[#8a6d3b] text-white px-3 py-1.5 rounded-lg text-xs hover:bg-[#7a6030] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BellRing size={13} /> Enable
              </button>
            )}
          </div>

          {/* Test notification button */}
          {pushSubscribed && (
            <div className="mt-3 pt-3 border-t border-stone-200">
              <button
                onClick={sendTestNotification}
                disabled={testSending}
                className="flex items-center gap-1.5 border border-[#c9a96e]/30 text-[#8a6d3b] px-3 py-1.5 rounded-lg text-xs hover:bg-[#c9a96e]/10 transition-colors disabled:opacity-50"
              >
                {testSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Send test notification
              </button>
            </div>
          )}
        </div>

        {/* Primer soft prompt */}
        {showPrimer && (
          <div className="bg-[#c9a96e]/5 border border-[#c9a96e]/30 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <BellRing size={20} className="text-[#8a6d3b] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-[#2a1f15] font-medium mb-1">Stay on top of your wedding planning</div>
                <p className="text-xs text-[#5d4e3e] mb-3">Get push reminders for tasks due, payments, RSVP deadlines, and partner activity. You can customize which notifications you receive below.</p>
                <div className="flex gap-2">
                  <button onClick={handlePrimerAccept} className="bg-[#8a6d3b] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#7a6030]">Allow notifications</button>
                  <button onClick={dismissPrimer} className="border border-stone-200 text-[#5d4e3e] text-xs px-3 py-1.5 rounded-lg hover:bg-stone-50">Not now</button>
                </div>
              </div>
              <button onClick={dismissPrimer} className="text-[#6b5d4f] hover:text-[#2a1f15]"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Per-type matrix */}
        {notifSettings && (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-2 pb-2 border-b border-stone-100">
              <span className="text-xs text-[#6b5d4f] uppercase tracking-wider">Notification type</span>
              <span className="text-xs text-[#6b5d4f] uppercase tracking-wider w-12 text-center">Push</span>
              <span className="text-xs text-[#6b5d4f] uppercase tracking-wider w-12 text-center">Email</span>
            </div>
            {NOTIF_TYPES.map(type => {
              const pref = notifSettings.notif_types[type.key] || { push: false, email: false };
              return (
                <div key={type.key} className="grid grid-cols-[1fr_auto_auto] gap-3 px-2 py-2.5 hover:bg-stone-50 rounded-lg transition-colors items-center">
                  <div>
                    <div className="text-sm text-[#2a1f15]">{type.label}</div>
                    <div className="text-xs text-[#6b5d4f]">{type.description}</div>
                  </div>
                  <button
                    onClick={() => toggleTypePref(type.key, 'push')}
                    className={`w-10 h-5.5 rounded-full transition-colors mx-auto flex items-center ${pref.push ? 'bg-[#c9a96e]' : 'bg-stone-200'}`}
                    style={{ height: '22px', width: '40px' }}
                    aria-label={`Toggle push for ${type.label}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${pref.push ? 'translate-x-5' : 'translate-x-0.5'}`} style={{ width: '16px', height: '16px' }} />
                  </button>
                  <button
                    onClick={() => toggleTypePref(type.key, 'email')}
                    className={`w-10 h-5.5 rounded-full transition-colors mx-auto flex items-center ${pref.email ? 'bg-[#c9a96e]' : 'bg-stone-200'}`}
                    style={{ height: '22px', width: '40px' }}
                    aria-label={`Toggle email for ${type.label}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${pref.email ? 'translate-x-5' : 'translate-x-0.5'}`} style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Quiet hours */}
        {notifSettings && (
          <div className="mt-5 pt-5 border-t border-stone-100">
            <div className="flex items-center gap-2 mb-3">
              <Moon size={14} className="text-[#8a6d3b]" />
              <h3 className="text-[#2a1f15] text-sm font-medium">Quiet hours</h3>
            </div>
            <p className="text-xs text-[#6b5d4f] mb-3">No push notifications will be sent during this time window.</p>
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs text-[#6b5d4f] block mb-1">From</label>
                <input
                  type="time"
                  value={notifSettings.quiet_hours_start}
                  onChange={e => updateQuietHours('quiet_hours_start', e.target.value)}
                  className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                />
              </div>
              <span className="text-[#6b5d4f] text-sm pt-5">to</span>
              <div>
                <label className="text-xs text-[#6b5d4f] block mb-1">Until</label>
                <input
                  type="time"
                  value={notifSettings.quiet_hours_end}
                  onChange={e => updateQuietHours('quiet_hours_end', e.target.value)}
                  className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
                />
              </div>
            </div>
          </div>
        )}

        {/* Pause all */}
        {notifSettings && (
          <div className="mt-5 pt-5 border-t border-stone-100">
            <div className="flex items-center gap-2 mb-3">
              <BellOff size={14} className="text-[#8a6d3b]" />
              <h3 className="text-[#2a1f15] text-sm font-medium">Pause all notifications</h3>
            </div>
            <p className="text-xs text-[#6b5d4f] mb-3">Suppress all notifications until a specific date. Clears automatically after that date passes.</p>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={notifSettings.pause_all_until ? notifSettings.pause_all_until.slice(0, 10) : ''}
                onChange={e => updatePauseUntil(e.target.value)}
                className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
              />
              {notifSettings.pause_all_until && (
                <button onClick={() => updatePauseUntil('')} className="text-xs text-[#5d4e3e] hover:text-[#2a1f15] flex items-center gap-1">
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            {notifSettings.pause_all_until && new Date(notifSettings.pause_all_until) > new Date() && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <Calendar size={12} /> Paused until {new Date(notifSettings.pause_all_until).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Planner Dashboard waitlist */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-medium text-sm">Planner Dashboard</h2>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Coming soon</span>
        </div>
        <p className="text-[#6b5d4f] text-sm mb-3">A dedicated dashboard for professional wedding planners to manage multiple client weddings.</p>
        <button
          onClick={() => showToast('Added to waitlist — we\'ll be in touch!')}
          className="bg-[#8a6d3b] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#7a6030] transition-colors"
        >
          Join the waitlist
        </button>
      </div>

      {/* Data export */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download size={16} className="text-[#8a6d3b]" />
          <h2 className="text-[#2a1f15] font-medium text-sm">Data export</h2>
        </div>
        <p className="text-[#6b5d4f] text-sm mb-3">Download all your wedding planning data. Export as CSV files (guests, budget items, payments, vendors, checklist) or as a complete JSON backup.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-4 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors"
          >
            <Download size={14} /> Export CSV files
          </button>
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 border border-stone-200 text-[#5d4e3e] px-4 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors"
          >
            <Download size={14} /> Export JSON backup
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-rose-600" />
          <h2 className="text-rose-700 font-medium text-sm">Delete account</h2>
        </div>
        <p className="text-[#6b5d4f] text-sm mb-3">Permanently delete your wedding profile and all associated data. This cannot be undone.</p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-rose-700 transition-colors"
        >
          <Trash2 size={14} /> Delete my account
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#2a1f15] font-serif text-lg">Delete account?</h3>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} aria-label="Close">
                <X size={18} className="text-[#6b5d4f] hover:text-[#2a1f15]" />
              </button>
            </div>
            <p className="text-[#5d4e3e] text-sm mb-4">This will permanently delete all your wedding data. Type <strong>DELETE</strong> to confirm.</p>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/40 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="flex-1 border border-stone-200 text-[#5d4e3e] py-2 rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 bg-rose-600 text-white py-2 rounded-lg text-sm hover:bg-rose-700 disabled:opacity-40"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}