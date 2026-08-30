import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, Plus, CheckSquare, DollarSign, User, ShoppingBag, Heart, Calendar } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import type { Section, WeddingProfile, BudgetItem, BudgetPayment, Guest, Vendor, ChecklistItem, BridalPartyMember, Subscription, Household } from './types';
import AuthPage from './components/AuthPage';
import SignupPage from './components/SignupPage';
import Onboarding from './components/Onboarding';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WeddingOverview from './components/WeddingOverview';
import BudgetTracker from './components/BudgetTracker';
import GuestList from './components/GuestList';
import VendorManager from './components/VendorManager';
import Checklist from './components/Checklist';
import BridalParty from './components/BridalParty';
import SeatingChart from './components/SeatingChart';
import DayTimeline from './components/DayTimeline';
import Honeymoon from './components/Honeymoon';
import Notes from './components/Notes';
import AccountMenu from './components/AccountMenu';
import PricingPage from './components/PricingPage';
import { ToastContainer } from './components/Toast';
import PartnerCollaboration from './components/PartnerCollaboration';
import PlannerDashboard from './components/PlannerDashboard';
import SettingsPage from './components/SettingsPage';
import CommandPalette from './components/CommandPalette';
import RsvpPage from './components/RsvpPage';
import CountdownPage from './components/CountdownPage';
import TimelineSharePage from './components/TimelineSharePage';
import WeddingWebsitePage from './components/WeddingWebsitePage';
import WeddingWebsiteEditor from './components/WeddingWebsiteEditor';
import BudgetCalculatorPage from './components/BudgetCalculatorPage';
import WeddingChecklistPage from './components/WeddingChecklistPage';
import {
  BudgetTrackerPage, GuestListPage, ChecklistPage, SeatingChartPage,
  BlogIndexPage, WeddingTimelineBlogPost, ForPlannersPage,
  TermsPage, PrivacyPage, HomePage,
} from './components/LandingPages';
import Seo from './components/Seo';
import NotFound from './components/NotFound';
import { BlogPostPage } from './components/BlogPostPage';
import { SeatingChartMakerTool, GuestListTemplateTool, DayTimelineTemplateTool, HashtagGeneratorTool, HoneymoonBudgetTool, VendorQuestionsTool, SaveTheDateTool } from './components/FreeTools';
import { ReferralPanel } from './components/ReferralPanel';
import { PartnerInviteCard } from './components/PartnerInviteCard';
import { ensureGA4, injectGscToken, injectPinterestVerify } from './lib/analytics';
import { DEFAULT_CHECKLIST_TASKS } from './lib/checklistDefaults';
import { setCurrency } from './lib/utils';
import { backfillDueDates, computeDueDate, seedDueDates } from './lib/dueDates';
import { randomSuffix } from './lib/shareSlug';
import UpdatePasswordScreen from './components/UpdatePasswordScreen';
import ChangePasswordPanel from './components/ChangePasswordPanel';
import MfaEnrollPanel from './components/MfaEnrollPanel';
import { showToast } from './components/Toast';

type AppState = 'loading' | 'auth' | 'onboarding' | 'app' | 'verifying-upgrade' | 'weak-password';

type LandingRoute =
  | 'home'
  | 'login'
  | 'signup'
  | 'features/budget-tracker'
  | 'features/guest-list'
  | 'features/checklist'
  | 'features/seating-chart'
  | 'blog'
  | 'blog/wedding-planning-timeline'
  | 'blog/wedding-budget-tips'
  | 'blog/guest-list-etiquette'
  | 'blog/vendor-tips'
  | 'blog/wedding-day-timeline'
  | 'blog/honeymoon-planning'
  | 'blog/wedding-catering-service-charge-vs-gratuity'
  | 'blog/wedding-day-timeline-4pm-ceremony'
  | 'blog/what-time-to-start-wedding-ceremony'
  | 'blog/wedding-b-list-invitation-timing'
  | 'blog/do-you-have-to-feed-wedding-vendors'
  | 'blog/kids-table-wedding-reception'
  | 'blog/how-many-guests-per-table'
  | 'blog/how-to-seat-divorced-parents'
  | 'blog/hidden-wedding-costs-forgotten'
  | 'blog/25000-wedding-budget-100-guests'
  | 'blog/cost-per-wedding-guest'
  | 'blog/percentage-wedding-guests-decline'
  | 'blog/guests-didnt-rsvp-what-to-do'
  | 'blog/how-to-cut-wedding-guest-list'
  | 'blog/wedding-checklist-final-month'
  | 'blog/wedding-vendor-contract-red-flags'
  | 'blog/wedding-timeline-buffer-time'
  | 'blog/head-table-vs-sweetheart-table'
  | 'blog/wedding-vendor-payment-schedule'
  | 'blog/who-gets-a-plus-one-wedding'
  | 'blog/over-wedding-budget-what-to-cut'
  | 'blog/adults-only-wedding-how-to-tell-guests'
  | 'blog/what-to-book-first-after-engaged'
  | 'blog/wedding-shuttle-schedule-guests'
  | 'for-planners'
  | 'terms'
  | 'privacy'
  | 'tools/wedding-budget-calculator'
  | 'tools/wedding-checklist'
  | 'tools/wedding-seating-chart-maker'
  | 'tools/wedding-guest-list-template'
  | 'tools/wedding-day-timeline-template'
  | 'tools/wedding-hashtag-generator'
  | 'tools/honeymoon-budget-calculator'
  | 'tools/wedding-vendor-questions'
  | 'tools/save-the-date-wording'
  | { type: 'rsvp'; slug: string }
  | { type: 'countdown'; slug: string }
  | { type: 'timeline'; slug: string }
  | { type: 'website'; slug: string }
  | null;

function detectLandingRoute(): LandingRoute {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (path === '' || path === 'index.html') return 'home';
  if (path === 'login') return 'login';
  if (path === 'signup') return 'signup';

  const rsvpMatch = path.match(/^rsvp\/(.+)$/);
  if (rsvpMatch) return { type: 'rsvp', slug: rsvpMatch[1] };

  const countdownMatch = path.match(/^countdown\/(.+)$/);
  if (countdownMatch) return { type: 'countdown', slug: countdownMatch[1] };

  const timelineMatch = path.match(/^timeline\/(.+)$/);
  if (timelineMatch) return { type: 'timeline', slug: timelineMatch[1] };

  const websiteMatch = path.match(/^w\/(.+)$/);
  if (websiteMatch) return { type: 'website', slug: websiteMatch[1] };

  // Referral links: /r/:code — treat as home (referral code stored in sessionStorage)
  const referralMatch = path.match(/^r\/(.+)$/);
  if (referralMatch) {
    sessionStorage.setItem('vow_referral', referralMatch[1]);
    window.history.replaceState({}, '', '/');
    return 'home';
  }

  if (path === 'pricing') {
    window.history.replaceState({}, '', '/#pricing');
    return 'home';
  }
  const staticRoutes: LandingRoute[] = [
    'features/budget-tracker',
    'features/guest-list',
    'features/checklist',
    'features/seating-chart',
    'blog/wedding-planning-timeline',
    'blog/wedding-budget-tips',
    'blog/guest-list-etiquette',
    'blog/vendor-tips',
    'blog/wedding-day-timeline',
    'blog/honeymoon-planning',
    'blog/wedding-catering-service-charge-vs-gratuity',
    'blog/wedding-day-timeline-4pm-ceremony',
    'blog/what-time-to-start-wedding-ceremony',
    'blog/wedding-b-list-invitation-timing',
    'blog/do-you-have-to-feed-wedding-vendors',
    'blog/kids-table-wedding-reception',
    'blog/how-many-guests-per-table',
    'blog/how-to-seat-divorced-parents',
    'blog/hidden-wedding-costs-forgotten',
    'blog/25000-wedding-budget-100-guests',
    'blog/cost-per-wedding-guest',
    'blog/percentage-wedding-guests-decline',
    'blog/guests-didnt-rsvp-what-to-do',
    'blog/how-to-cut-wedding-guest-list',
    'blog/wedding-checklist-final-month',
    'blog/wedding-vendor-contract-red-flags',
    'blog/wedding-timeline-buffer-time',
    'blog/head-table-vs-sweetheart-table',
    'blog/wedding-vendor-payment-schedule',
    'blog/who-gets-a-plus-one-wedding',
    'blog/over-wedding-budget-what-to-cut',
    'blog/adults-only-wedding-how-to-tell-guests',
    'blog/what-to-book-first-after-engaged',
    'blog/wedding-shuttle-schedule-guests',
    'blog',
    'for-planners',
    'terms',
    'privacy',
    'tools/wedding-budget-calculator',
    'tools/wedding-checklist',
    'tools/wedding-seating-chart-maker',
    'tools/wedding-guest-list-template',
    'tools/wedding-day-timeline-template',
    'tools/wedding-hashtag-generator',
    'tools/honeymoon-budget-calculator',
    'tools/wedding-vendor-questions',
    'tools/save-the-date-wording',
  ];
  return staticRoutes.find(r => typeof r === 'string' && path === r) ?? null;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [landingRoute] = useState<LandingRoute>(detectLandingRoute);

  useEffect(() => {
    ensureGA4();
    injectGscToken();
    injectPinterestVerify();
  }, []);

  const [section, setSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  useEffect(() => {
    if (!showQuickAdd) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowQuickAdd(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showQuickAdd]);
  const [triggerAddVendor, setTriggerAddVendor] = useState(0);
  const isPro = subscription?.plan === 'pro';

  const [profile, setProfile] = useState<WeddingProfile | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [bridalParty, setBridalParty] = useState<BridalPartyMember[]>([]);
  const [budgetPayments, setBudgetPayments] = useState<BudgetPayment[]>([]);
  const [showShiftPrompt, setShowShiftPrompt] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [weakPasswordReasons, setWeakPasswordReasons] = useState<string[]>([]);
  const prevWeddingDate = useRef<string | null>(null);

  const checklistPct = checklist.length > 0
    ? Math.round((checklist.filter(c => c.completed).length / checklist.length) * 100)
    : 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isUpgradeRedirect = params.get('upgraded') === '1';
    const stripeSessionId = params.get('session_id') ?? '';
    if (isUpgradeRedirect) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        if (isUpgradeRedirect && stripeSessionId) {
          pollForUpgrade(session.user.id, stripeSessionId);
        } else {
          loadUserData(session.user.id);
        }
      } else {
        setAppState('auth');
      }
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        setAppState('auth');
        resetData();
      } else if (event === 'SIGNED_IN' && session && appState !== 'app') {
        loadUserData(session.user.id);
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  async function pollForUpgrade(userId: string, stripeSessionId: string) {
    setAppState('verifying-upgrade');
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-upgrade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession?.access_token}`,
          },
          body: JSON.stringify({ sessionId: stripeSessionId }),
        }
      );
      const result = await response.json();
      if (result.upgraded) {
        const { data: subData } = await supabase
          .from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
        if (subData) setSubscription(subData as Subscription);
      }
    } catch {
      // fall through to loadUserData
    }
    await loadUserData(userId);
  }

  function resetData() {
    setProfile(null);
    setBudgetItems([]);
    setGuests([]);
    setHouseholds([]);
    setVendors([]);
    setChecklist([]);
    setBridalParty([]);
    setSubscription(null);
  }

  async function loadUserData(userId: string) {
    setAppState('loading');

    const [{ data: profileData }, { data: subData }] = await Promise.all([
      supabase.from('wedding_profile').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (subData) setSubscription(subData as Subscription);

    if (!profileData) {
      setAppState('onboarding');
      return;
    }

    setProfile(profileData as WeddingProfile);
    const weddingId = profileData.id;

    // Set currency from profile
    if (profileData.currency_code) setCurrency(profileData.currency_code, profileData.currency_symbol || '$');
    prevWeddingDate.current = profileData.wedding_date || null;
    if (!profileData.referral_code) {
      const code = randomSuffix(7);
      supabase.from('wedding_profile').update({ referral_code: code }).eq('id', weddingId)
        .select().single().then(({ data }) => { if (data) setProfile(data as WeddingProfile); });
    }

    const [
      { data: budgetData },
      { data: guestData },
      { data: vendorData },
      { data: checklistData },
      { data: bridalData },
      { data: householdData },
    ] = await Promise.all([
      supabase.from('budget_items').select('*').eq('wedding_id', weddingId).order('created_at'),
      supabase.from('guests').select('*').eq('wedding_id', weddingId).order('last_name'),
      supabase.from('vendors').select('*').eq('wedding_id', weddingId).order('category'),
      supabase.from('checklist_items').select('*').eq('wedding_id', weddingId).order('created_at'),
      supabase.from('bridal_party').select('*').eq('wedding_id', weddingId).order('side'),
      supabase.from('households').select('*').eq('wedding_id', weddingId).order('name'),
    ]);

    if (budgetData) setBudgetItems(budgetData);
    if (guestData) setGuests(guestData);
    if (householdData) setHouseholds(householdData);
    if (vendorData) setVendors(vendorData);
    if (bridalData) setBridalParty(bridalData);

    // Load budget payments
    const { data: paymentsData } = await supabase.from('budget_payments').select('*').in('budget_item_id', (budgetData || []).map(b => b.id));
    if (paymentsData) setBudgetPayments(paymentsData);

    if (checklistData && checklistData.length > 0) {
      // Backfill due_dates for existing items that don't have one
      const profileWithDate = profileData as WeddingProfile;
      const backfilled = profileWithDate.wedding_date
        ? backfillDueDates(checklistData as ChecklistItem[], profileWithDate.wedding_date)
        : checklistData as ChecklistItem[];
      setChecklist(backfilled);

      // Persist backfilled due_dates to DB
      const itemsToUpdate = backfilled.filter(item => item.due_date && checklistData.find(c => c.id === item.id && !c.due_date));
      if (itemsToUpdate.length > 0) {
        Promise.all(itemsToUpdate.map(item =>
          supabase.from('checklist_items').update({ due_date: item.due_date }).eq('id', item.id)
        )).then(() => {});
      }
    } else {
      // Seed default tasks for users whose checklist was never populated
      const createdAt = (profileData as WeddingProfile).created_at || new Date().toISOString();
      const seededRows = seedDueDates(DEFAULT_CHECKLIST_TASKS, profileData.wedding_date || '', createdAt)
        .map(t => ({ ...t, wedding_id: weddingId, completed: false }));
      const { data: seeded, error: seedErr } = await supabase.from('checklist_items').insert(seededRows).select();
      if (seedErr) {
        // 409 conflict — items already exist (possibly from a race). Re-fetch them.
        const { data: existing } = await supabase.from('checklist_items').select('*').eq('wedding_id', weddingId).order('created_at');
        if (existing) setChecklist(existing);
      } else if (seeded && seeded.length > 0) {
        setChecklist(seeded);
      }
    }

    setAppState('app');
  }

  const handleOnboardingComplete = async (newProfile: WeddingProfile) => {
    setProfile(newProfile);
    const weddingId = newProfile.id;

    // Record referral if arrived via a referral link — look up referrer from the code
    const referralCode = sessionStorage.getItem('vow_referral');
    if (referralCode) {
      sessionStorage.removeItem('vow_referral');
      const { data: referrerProfile } = await supabase
        .from('wedding_profile')
        .select('user_id')
        .eq('referral_code', referralCode)
        .maybeSingle();
      if (referrerProfile && referrerProfile.user_id !== newProfile.user_id) {
        await supabase.from('referrals').insert({
          referral_code: referralCode,
          referred_user_id: newProfile.user_id,
          referrer_user_id: referrerProfile.user_id,
        });
      }
    }

    // Auto-generate referral code
    const code = randomSuffix(7);
    supabase.from('wedding_profile').update({ referral_code: code }).eq('id', weddingId).then(() => {});
    const [{ data: subData }, { data: checklistData }, { data: budgetData }] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('user_id', newProfile.user_id).maybeSingle(),
      supabase.from('checklist_items').select('*').eq('wedding_id', weddingId).order('created_at'),
      supabase.from('budget_items').select('*').eq('wedding_id', weddingId).order('created_at'),
    ]);
    if (subData) setSubscription(subData as Subscription);
    if (budgetData) setBudgetItems(budgetData);

    if (checklistData && checklistData.length > 0) {
      setChecklist(checklistData);
    } else {
      const createdAt = newProfile.created_at || new Date().toISOString();
      const seededRows = seedDueDates(DEFAULT_CHECKLIST_TASKS, newProfile.wedding_date || '', createdAt)
        .map(t => ({ ...t, wedding_id: weddingId, completed: false }));
      const { data: seeded } = await supabase.from('checklist_items').insert(seededRows).select();
      if (seeded && seeded.length > 0) setChecklist(seeded);
    }

    setAppState('app');
  };

  // Detect wedding date change and prompt to shift task dates
  useEffect(() => {
    if (!profile?.wedding_date) return;
    if (prevWeddingDate.current === null) {
      prevWeddingDate.current = profile.wedding_date;
      return;
    }
    if (prevWeddingDate.current !== profile.wedding_date) {
      setShowShiftPrompt(true);
    }
  }, [profile?.wedding_date]);

  const shiftTaskDates = async () => {
    if (!profile?.wedding_date) return;
    const newDate = profile.wedding_date;
    const itemsToUpdate = checklist.filter(item => !item.overridden && item.due_date);
    await Promise.all(itemsToUpdate.map(item => {
      const newDue = computeDueDate(item.timeframe, newDate);
      return newDue ? supabase.from('checklist_items').update({ due_date: newDue }).eq('id', item.id) : Promise.resolve();
    }));
    setChecklist(prev => prev.map(item =>
      !item.overridden && item.due_date ? { ...item, due_date: computeDueDate(item.timeframe, newDate) || item.due_date } : item
    ));
    prevWeddingDate.current = newDate;
    setShowShiftPrompt(false);
  };

  const navigate = useCallback((s: Section) => {
    setSection(s);
    setSidebarOpen(false);
    setShowQuickAdd(false);
    window.scrollTo({ top: 0 });
  }, []);

  const sectionTitles: Record<Section, string> = {
    dashboard: 'Dashboard',
    overview: 'Wedding Overview',
    website: 'Wedding Website',
    checklist: 'Master Checklist',
    budget: 'Budget Tracker',
    guests: 'Guest List',
    vendors: 'Vendors',
    seating: 'Seating Chart',
    'bridal-party': 'Bridal Party',
    timeline: 'Day Timeline',
    honeymoon: 'Honeymoon',
    notes: 'Notes & Journal',
    planner: 'Planner Dashboard',
      referrals: 'Invite Friends',
    settings: 'Settings',
  };

  const handleGetStarted = () => {
    window.location.href = '/signup';
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  // Landing pages (no login required)
  if (landingRoute) {
    const props = { onGetStarted: handleGetStarted, onLogin: handleLogin };

    if (typeof landingRoute === 'object' && landingRoute.type === 'rsvp') {
      document.title = 'RSVP — Vow Wedding Planner';
      return <RsvpPage slug={landingRoute.slug} />;
    }
    if (typeof landingRoute === 'object' && landingRoute.type === 'countdown') {
      document.title = 'Countdown — Vow Wedding Planner';
      return <CountdownPage slug={landingRoute.slug} />;
    }
    if (typeof landingRoute === 'object' && landingRoute.type === 'timeline') {
      document.title = 'Wedding Timeline — Vow Wedding Planner';
      return <TimelineSharePage slug={landingRoute.slug} />;
    }
    if (typeof landingRoute === 'object' && landingRoute.type === 'website') {
      return <WeddingWebsitePage slug={landingRoute.slug} />;
    }

    if (landingRoute === 'home') {
      // Authenticated app states fall through to the render logic below.
      // Only genuinely logged-out states (auth, or null session) show the landing page.
      if (appState === 'app' || appState === 'onboarding' || appState === 'weak-password') {
        /* fall through to the render logic below */
      } else if (appState === 'loading' || appState === 'verifying-upgrade') {
        /* show spinner below */
      } else return <><Seo pathname="/" /><HomePage {...props} /></>;
    }
    if (landingRoute === 'login') return <><Seo pathname="/login" /><AuthPage onAuth={() => { window.location.href = '/'; }} /></>;
    if (landingRoute === 'signup') return <><Seo pathname="/signup" /><SignupPage onAuth={() => { window.location.href = '/'; }} /></>;
    if (landingRoute === 'features/budget-tracker') return <><Seo pathname="/features/budget-tracker" /><BudgetTrackerPage {...props} /></>;
    if (landingRoute === 'features/guest-list') return <><Seo pathname="/features/guest-list" /><GuestListPage {...props} /></>;
    if (landingRoute === 'features/checklist') return <><Seo pathname="/features/checklist" /><ChecklistPage {...props} /></>;
    if (landingRoute === 'features/seating-chart') return <><Seo pathname="/features/seating-chart" /><SeatingChartPage {...props} /></>;
    if (landingRoute === 'blog') return <><Seo pathname="/blog" /><BlogIndexPage {...props} /></>;
    if (landingRoute === 'blog/wedding-planning-timeline') return <><Seo pathname="/blog/wedding-planning-timeline" /><WeddingTimelineBlogPost {...props} /></>;
    if (landingRoute === 'blog/wedding-budget-tips') return <><Seo pathname="/blog/wedding-budget-tips" /><BlogPostPage slug="wedding-budget-tips" {...props} /></>;
    if (landingRoute === 'blog/guest-list-etiquette') return <><Seo pathname="/blog/guest-list-etiquette" /><BlogPostPage slug="guest-list-etiquette" {...props} /></>;
    if (landingRoute === 'blog/vendor-tips') return <><Seo pathname="/blog/vendor-tips" /><BlogPostPage slug="vendor-tips" {...props} /></>;
    if (landingRoute === 'blog/wedding-day-timeline') return <><Seo pathname="/blog/wedding-day-timeline" /><BlogPostPage slug="wedding-day-timeline" {...props} /></>;
    if (landingRoute === 'blog/honeymoon-planning') return <><Seo pathname="/blog/honeymoon-planning" /><BlogPostPage slug="honeymoon-planning" {...props} /></>;
    if (landingRoute === 'blog/wedding-catering-service-charge-vs-gratuity') return <><Seo pathname="/blog/wedding-catering-service-charge-vs-gratuity" /><BlogPostPage slug="wedding-catering-service-charge-vs-gratuity" {...props} /></>;
    if (landingRoute === 'blog/wedding-day-timeline-4pm-ceremony') return <><Seo pathname="/blog/wedding-day-timeline-4pm-ceremony" /><BlogPostPage slug="wedding-day-timeline-4pm-ceremony" {...props} /></>;
    if (landingRoute === 'blog/what-time-to-start-wedding-ceremony') return <><Seo pathname="/blog/what-time-to-start-wedding-ceremony" /><BlogPostPage slug="what-time-to-start-wedding-ceremony" {...props} /></>;
    if (landingRoute === 'blog/wedding-b-list-invitation-timing') return <><Seo pathname="/blog/wedding-b-list-invitation-timing" /><BlogPostPage slug="wedding-b-list-invitation-timing" {...props} /></>;
    if (landingRoute === 'blog/do-you-have-to-feed-wedding-vendors') return <><Seo pathname="/blog/do-you-have-to-feed-wedding-vendors" /><BlogPostPage slug="do-you-have-to-feed-wedding-vendors" {...props} /></>;
    if (landingRoute === 'blog/kids-table-wedding-reception') return <><Seo pathname="/blog/kids-table-wedding-reception" /><BlogPostPage slug="kids-table-wedding-reception" {...props} /></>;
    if (landingRoute === 'blog/how-many-guests-per-table') return <><Seo pathname="/blog/how-many-guests-per-table" /><BlogPostPage slug="how-many-guests-per-table" {...props} /></>;
    if (landingRoute === 'blog/how-to-seat-divorced-parents') return <><Seo pathname="/blog/how-to-seat-divorced-parents" /><BlogPostPage slug="how-to-seat-divorced-parents" {...props} /></>;
    if (landingRoute === 'blog/hidden-wedding-costs-forgotten') return <><Seo pathname="/blog/hidden-wedding-costs-forgotten" /><BlogPostPage slug="hidden-wedding-costs-forgotten" {...props} /></>;
    if (landingRoute === 'blog/25000-wedding-budget-100-guests') return <><Seo pathname="/blog/25000-wedding-budget-100-guests" /><BlogPostPage slug="25000-wedding-budget-100-guests" {...props} /></>;
    if (landingRoute === 'blog/cost-per-wedding-guest') return <><Seo pathname="/blog/cost-per-wedding-guest" /><BlogPostPage slug="cost-per-wedding-guest" {...props} /></>;
    if (landingRoute === 'blog/percentage-wedding-guests-decline') return <><Seo pathname="/blog/percentage-wedding-guests-decline" /><BlogPostPage slug="percentage-wedding-guests-decline" {...props} /></>;
    if (landingRoute === 'blog/guests-didnt-rsvp-what-to-do') return <><Seo pathname="/blog/guests-didnt-rsvp-what-to-do" /><BlogPostPage slug="guests-didnt-rsvp-what-to-do" {...props} /></>;
    if (landingRoute === 'blog/how-to-cut-wedding-guest-list') return <><Seo pathname="/blog/how-to-cut-wedding-guest-list" /><BlogPostPage slug="how-to-cut-wedding-guest-list" {...props} /></>;
    if (landingRoute === 'blog/wedding-checklist-final-month') return <><Seo pathname="/blog/wedding-checklist-final-month" /><BlogPostPage slug="wedding-checklist-final-month" {...props} /></>;
    if (landingRoute === 'blog/wedding-vendor-contract-red-flags') return <><Seo pathname="/blog/wedding-vendor-contract-red-flags" /><BlogPostPage slug="wedding-vendor-contract-red-flags" {...props} /></>;
    if (landingRoute === 'blog/wedding-timeline-buffer-time') return <><Seo pathname="/blog/wedding-timeline-buffer-time" /><BlogPostPage slug="wedding-timeline-buffer-time" {...props} /></>;
    if (landingRoute === 'blog/head-table-vs-sweetheart-table') return <><Seo pathname="/blog/head-table-vs-sweetheart-table" /><BlogPostPage slug="head-table-vs-sweetheart-table" {...props} /></>;
    if (landingRoute === 'blog/wedding-vendor-payment-schedule') return <><Seo pathname="/blog/wedding-vendor-payment-schedule" /><BlogPostPage slug="wedding-vendor-payment-schedule" {...props} /></>;
    if (landingRoute === 'blog/who-gets-a-plus-one-wedding') return <><Seo pathname="/blog/who-gets-a-plus-one-wedding" /><BlogPostPage slug="who-gets-a-plus-one-wedding" {...props} /></>;
    if (landingRoute === 'blog/over-wedding-budget-what-to-cut') return <><Seo pathname="/blog/over-wedding-budget-what-to-cut" /><BlogPostPage slug="over-wedding-budget-what-to-cut" {...props} /></>;
    if (landingRoute === 'blog/adults-only-wedding-how-to-tell-guests') return <><Seo pathname="/blog/adults-only-wedding-how-to-tell-guests" /><BlogPostPage slug="adults-only-wedding-how-to-tell-guests" {...props} /></>;
    if (landingRoute === 'blog/what-to-book-first-after-engaged') return <><Seo pathname="/blog/what-to-book-first-after-engaged" /><BlogPostPage slug="what-to-book-first-after-engaged" {...props} /></>;
    if (landingRoute === 'blog/wedding-shuttle-schedule-guests') return <><Seo pathname="/blog/wedding-shuttle-schedule-guests" /><BlogPostPage slug="wedding-shuttle-schedule-guests" {...props} /></>;
    if (landingRoute === 'for-planners') return <><Seo pathname="/for-planners" /><ForPlannersPage {...props} /></>;
    if (landingRoute === 'terms') return <><Seo pathname="/terms" /><TermsPage {...props} /></>;
    if (landingRoute === 'privacy') return <><Seo pathname="/privacy" /><PrivacyPage {...props} /></>;
    if (landingRoute === 'tools/wedding-budget-calculator') return <><Seo pathname="/tools/wedding-budget-calculator" /><BudgetCalculatorPage {...props} /></>;
    if (landingRoute === 'tools/wedding-checklist') return <><Seo pathname="/tools/wedding-checklist" /><WeddingChecklistPage {...props} /></>;
    if (landingRoute === 'tools/wedding-seating-chart-maker') return <><Seo pathname="/tools/wedding-seating-chart-maker" /><SeatingChartMakerTool {...props} /></>;
    if (landingRoute === 'tools/wedding-guest-list-template') return <><Seo pathname="/tools/wedding-guest-list-template" /><GuestListTemplateTool {...props} /></>;
    if (landingRoute === 'tools/wedding-day-timeline-template') return <><Seo pathname="/tools/wedding-day-timeline-template" /><DayTimelineTemplateTool {...props} /></>;
    if (landingRoute === 'tools/wedding-hashtag-generator') return <><Seo pathname="/tools/wedding-hashtag-generator" /><HashtagGeneratorTool {...props} /></>;
    if (landingRoute === 'tools/honeymoon-budget-calculator') return <><Seo pathname="/tools/honeymoon-budget-calculator" /><HoneymoonBudgetTool {...props} /></>;
    if (landingRoute === 'tools/wedding-vendor-questions') return <><Seo pathname="/tools/wedding-vendor-questions" /><VendorQuestionsTool {...props} /></>;
    if (landingRoute === 'tools/save-the-date-wording') return <><Seo pathname="/tools/save-the-date-wording" /><SaveTheDateTool {...props} /></>;
  }

  // Unmatched public route — show 404 instead of the app loading spinner
  if (!landingRoute && (appState === 'auth' || appState === 'loading' || !session)) {
    return <NotFound />;
  }

  if (appState === 'loading' || appState === 'verifying-upgrade') {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#c9a96e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#5d4e3e] font-serif text-lg">
            {appState === 'verifying-upgrade' ? 'Confirming your upgrade…' : 'Loading your planner…'}
          </p>
          {appState === 'verifying-upgrade' && (
            <p className="text-[#6b5d4f] text-sm mt-2">This may take a few seconds</p>
          )}
        </div>
      </div>
    );
  }

  if (appState === 'weak-password' && session) {
    return (
      <UpdatePasswordScreen
        reasons={weakPasswordReasons}
        email={session.user.email || ''}
        onResolved={() => loadUserData(session.user.id)}
        onBack={() => {
          supabase.auth.signOut();
          setSession(null);
          setAppState('auth');
        }}
      />
    );
  }

  if (appState === 'auth') {
    return <AuthPage onAuth={() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const reasonsRaw = sessionStorage.getItem('vow_weak_password_reasons');
          if (reasonsRaw) {
            sessionStorage.removeItem('vow_weak_password_reasons');
            sessionStorage.removeItem('vow_weak_password_email');
            setWeakPasswordReasons(JSON.parse(reasonsRaw));
            setAppState('weak-password');
            return;
          }
          loadUserData(session.user.id);
        }
      });
    }} />;
  }

  if (appState === 'onboarding' && session) {
    return <Onboarding userId={session.user.id} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] font-sans">
      {showPricing && (
        <PricingPage subscription={subscription} onClose={() => setShowPricing(false)} />
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed left-0 top-0 h-screen w-72 lg:w-64 z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <Sidebar
          active={section}
          onSelect={navigate}
          partner1={profile?.partner1_name || ''}
          partner2={profile?.partner2_name || ''}
          weddingDate={profile?.wedding_date || null}
          onClose={() => setSidebarOpen(false)}
          isPro={!!isPro}
          onShowPricing={() => setShowPricing(true)}
          checklistPct={checklistPct}
        />
      </div>

      <div className="lg:ml-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-stone-200 px-4 lg:px-8 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="lg:hidden text-[#5d4e3e]">
            <Menu size={22} />
          </button>
          <h2 className="text-[#2a1f15] font-serif text-xl">{sectionTitles[section]}</h2>
          <div className="ml-auto flex items-center gap-3">
            {profile?.wedding_date && (
              <span className="text-[#8a6d3b] text-sm hidden md:flex items-center gap-1.5">
                <Heart size={12} className="fill-[#c9a96e]/60" />
                <span className="text-[#6b5d4f]">Wedding day</span>
                {new Date(`${profile.wedding_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {!isPro && ['dashboard', 'seating', 'bridal-party', 'timeline', 'honeymoon'].includes(section) && (
              <button
                onClick={() => setShowPricing(true)}
                className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-[#c9a96e] to-[#b8955a] text-white text-xs px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Upgrade to Pro
              </button>
            )}
            {session && (
              <AccountMenu
                email={session.user.email || ''}
                subscription={subscription}
                onShowPricing={() => setShowPricing(true)}
                referralCode={profile?.referral_code ?? null}
                onSignOut={() => {
                  setAppState('auth');
                  resetData();
                }}
              />
            )}
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-8">
          {section === 'dashboard' && (
            <Dashboard
              profile={profile}
              budgetItems={budgetItems}
              payments={budgetPayments}
              guests={guests}
              households={households}
              checklist={checklist}
              vendors={vendors}
              onNavigate={navigate}
              isPro={!!isPro}
              onShowPricing={() => setShowPricing(true)}
              onToggleTask={async (item) => {
                const { data } = await supabase
                  .from('checklist_items')
                  .update({ completed: !item.completed, completed_at: !item.completed ? new Date().toISOString() : null })
                  .eq('id', item.id)
                  .select()
                  .single();
                if (data) setChecklist(prev => prev.map(i => i.id === item.id ? data : i));
              }}
            >
              {profile && session && (
                <PartnerCollaboration
                  profile={profile}
                  isPro={!!isPro}
                  onShowPricing={() => setShowPricing(true)}
                  currentUserId={session.user.id}
                />
              )}
              {profile && !profile.partner_user_id && !sessionStorage.getItem('vow-partner-invite-dismissed') && (
                <PartnerInviteCard profile={profile} onDismiss={() => sessionStorage.setItem('vow-partner-invite-dismissed', '1')} />
              )}
              {profile?.referral_code && (
                <ReferralPanel profile={profile} onGetStarted={() => setShowPricing(true)} variant="card" />
              )}
            </Dashboard>
          )}
          {section === 'overview' && (
            <WeddingOverview profile={profile} onUpdate={setProfile} />
          )}
          {section === 'website' && (
            <WeddingWebsiteEditor profile={profile} onUpdateProfile={setProfile} />
          )}
          {section === 'budget' && (
            <BudgetTracker items={budgetItems} profile={profile} vendors={vendors} onUpdate={setBudgetItems} payments={budgetPayments} onUpdatePayments={setBudgetPayments} isPro={!!isPro} onShowPricing={() => setShowPricing(true)} />
          )}
          {section === 'guests' && (
            <GuestList
              guests={guests}
              onUpdate={setGuests}
              partner1={profile?.partner1_name || 'Partner 1'}
              partner2={profile?.partner2_name || 'Partner 2'}
              weddingId={profile?.id || ''}
              isPro={!!isPro}
              onShowPricing={() => setShowPricing(true)}
              profile={profile}
              onUpdateProfile={setProfile}
              households={households}
              onUpdateHouseholds={setHouseholds}
            />
          )}
          {section === 'vendors' && (
            <VendorManager vendors={vendors} onUpdate={setVendors} profile={profile} isPro={!!isPro} onShowPricing={() => setShowPricing(true)} triggerAddVendor={triggerAddVendor} budgetItems={budgetItems} onBudgetItemAdded={item => setBudgetItems(prev => [...prev, item])} onBudgetItemUpdated={item => setBudgetItems(prev => prev.map(b => b.id === item.id ? item : b))} />
          )}
          {section === 'checklist' && (
            <Checklist items={checklist} onUpdate={setChecklist} weddingId={profile?.id || ''} isPro={!!isPro} onShowPricing={() => setShowPricing(true)} profile={profile} guests={guests} vendors={vendors} />
          )}
          {section === 'bridal-party' && (
            <BridalParty
              members={bridalParty}
              onUpdate={setBridalParty}
              partner1={profile?.partner1_name || 'Partner 1'}
              partner2={profile?.partner2_name || 'Partner 2'}
              weddingId={profile?.id || ''}
            />
          )}
          {section === 'seating' && (
            <SeatingChart guests={guests} onUpdate={setGuests} weddingId={profile?.id || ''} households={households} profile={profile} />
          )}
          {section === 'timeline' && <DayTimeline weddingId={profile?.id || ''} isPro={!!isPro} onShowPricing={() => setShowPricing(true)} profile={profile} vendors={vendors} bridalParty={bridalParty} />}
          {section === 'honeymoon' && <Honeymoon weddingId={profile?.id || ''} />}
          {section === 'notes' && <Notes weddingId={profile?.id || ''} />}
          {section === 'settings' && (
            <div className="space-y-6 max-w-3xl">
              <SettingsPage profile={profile} onUpdateProfile={setProfile} onNavigate={navigate} isPro={!!isPro} onShowPricing={() => setShowPricing(true)} />
              <ChangePasswordPanel />
              <MfaEnrollPanel onReauthRequired={() => showToast('Please reauthenticate to remove MFA')} />
            </div>
          )}
          {section === 'referrals' && (
            <div className="max-w-3xl">
              <ReferralPanel profile={profile} onGetStarted={() => setShowPricing(true)} />
            </div>
          )}
          {section === 'planner' && <PlannerDashboard isPro={!!isPro} onShowPricing={() => setShowPricing(true)} />}
        </main>

        <footer className="border-t border-stone-200 px-8 py-4 text-center text-[#6b5d4f] text-xs">
          Vow &mdash; Your beautiful journey begins here
        </footer>
      </div>

      {/* Quick Add FAB */}
      <div className="fixed bottom-6 right-6 z-30">
        {showQuickAdd && (
          <div className="absolute bottom-16 right-0 bg-white rounded-2xl border border-stone-200 shadow-xl p-2 min-w-44">
            {[
              { icon: <CheckSquare size={15} />, label: 'Add Task', action: () => { navigate('checklist'); setShowQuickAdd(false); } },
              { icon: <User size={15} />, label: 'Add Guest', action: () => { navigate('guests'); setShowQuickAdd(false); } },
              { icon: <DollarSign size={15} />, label: 'Add Budget Item', action: () => { navigate('budget'); setShowQuickAdd(false); } },
              { icon: <ShoppingBag size={15} />, label: 'Add Vendor', action: () => { navigate('vendors'); setTriggerAddVendor(prev => prev + 1); setShowQuickAdd(false); } },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-[#2a1f15] hover:bg-stone-50 transition-colors text-left"
              >
                <span className="text-[#8a6d3b]">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowQuickAdd(q => !q)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
            showQuickAdd ? 'bg-[#2a1f15] rotate-45' : 'bg-[#c9a96e] hover:bg-[#b8955a] hover:scale-105'
          }`}
        >
          <Plus size={24} className="text-white" />
        </button>
      </div>

      {showQuickAdd && (
        <div className="fixed inset-0 z-20" onClick={() => setShowQuickAdd(false)} />
      )}

      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} onNavigate={navigate} guests={guests} vendors={vendors} checklist={checklist} />

      <ToastContainer />

      {showShiftPrompt && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <Calendar size={20} className="text-[#8a6d3b]" />
              <h3 className="font-serif text-lg text-[#2a1f15]">Shift task dates?</h3>
            </div>
            <p className="text-[#5d4e3e] text-sm mb-5">Your wedding date changed. Shift all auto-scheduled task dates to match? Tasks you've manually overridden will stay put.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { prevWeddingDate.current = profile?.wedding_date || null; setShowShiftPrompt(false); }} className="px-4 py-2 rounded-lg text-sm text-[#5d4e3e] hover:bg-stone-100">Don't shift</button>
              <button onClick={shiftTaskDates} className="px-4 py-2 rounded-lg text-sm bg-[#8a6d3b] text-white hover:bg-[#7a6030]">Shift dates</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
