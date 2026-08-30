import { ArrowRight, ArrowLeft, Share2, Calendar, Heart } from 'lucide-react';
import { BLOG_CONTENT_BATCH1 } from '../lib/blogContentBatch1';
import { BLOG_CONTENT_BATCH2 } from '../lib/blogContentBatch2';
import { BLOG_CONTENT_BATCH3 } from '../lib/blogContentBatch3';
import BlogEmailCapture from './BlogEmailCapture';

export interface BlogContent {
  slug: string;
  title: string;
  date: string;
  dateISO: string;
  cat: string;
  excerpt: string;
  image: string;
  readTime: string;
  sections: { heading: string; body: string }[];
  featureLink: { label: string; href: string };
  toolLink: { label: string; href: string };
  relatedSlugs: string[];
}

export const BLOG_CONTENT: Record<string, BlogContent> = {
  'wedding-planning-timeline': {
    slug: 'wedding-planning-timeline',
    title: 'The Complete Wedding Planning Timeline',
    date: 'Jan 15, 2026',
    dateISO: '2026-01-15',
    cat: 'Planning',
    excerpt: 'Your complete month-by-month wedding planning timeline from 18 months out to your wedding day — every task organized so you never miss a step.',
    image: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1200',
    readTime: '8 min read',
    sections: [],
    featureLink: { label: 'Explore the Checklist', href: '/features/checklist' },
    toolLink: { label: 'Free Checklist Tool', href: '/tools/wedding-checklist' },
    relatedSlugs: ['wedding-budget-tips', 'vendor-tips', 'wedding-day-timeline'],
  },
  'wedding-budget-tips': {
    slug: 'wedding-budget-tips',
    title: '10 Ways to Stretch Your Wedding Budget',
    date: 'Jan 22, 2026',
    dateISO: '2026-01-22',
    cat: 'Budget',
    excerpt: 'Smart strategies to save money without sacrificing the wedding of your dreams.',
    image: 'https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg?auto=compress&cs=tinysrgb&w=1200',
    readTime: '6 min read',
    sections: [
      { heading: 'Prioritize what matters most', body: 'Before you spend a dollar, sit down with your partner and rank your top three priorities. Is it the venue? The photography? The food? Allocate more of your budget to those areas and cut back on the rest. Most couples try to do everything well and end up overspending — focusing on a few key areas gives you a better result for less.' },
      { heading: 'Choose an off-peak date', body: 'Saturday nights in June and October are the most expensive times to get married. Consider a Friday or Sunday wedding, or a Saturday in January or March. Venues often offer 10-20% discounts for off-peak dates, and vendors may negotiate lower rates too.' },
      { heading: 'Trim the guest list', body: 'Every guest adds cost — catering, rentals, bar, invitations, and favors. Cutting from 150 to 100 guests can save $5,000 or more. Be ruthless: if you wouldn\'t take them to dinner, they probably don\'t need to be at your wedding.' },
      { heading: 'Go seasonal with flowers', body: 'Ask your florist for in-season blooms rather than specific varieties. Peonies in December cost a fortune; in May they\'re abundant and affordable. Seasonal flowers are fresher, more sustainable, and dramatically cheaper.' },
      { heading: 'Rethink the bar', body: 'A full open bar is one of the biggest wedding expenses. Consider beer and wine only, or a signature cocktail plus beer and wine. Most guests won\'t notice the difference, and you\'ll save $1,500-$3,000.' },
      { heading: 'Use digital invitations', body: 'Digital save-the-dates and invitations save on paper, printing, and postage. Sites like Paperless Post offer beautiful designs for a fraction of the cost. For guests who prefer paper, send physical invites only to older family members.' },
      { heading: 'Book a bundled venue', body: 'Venues that include tables, chairs, linens, and sometimes catering can save you thousands in rentals. All-inclusive venues simplify logistics and often cost less than booking each piece separately.' },
      { heading: 'Rent, don\'t buy, decor', body: 'Buying decor outright is expensive and you\'ll never use it again. Rent centerpieces, backdrops, and lighting from your florist or a rental company. Many venues also have decor you can use at no extra cost.' },
      { heading: 'Skip the wedding cake', body: 'Traditional tiered wedding cakes cost $300-$800. Consider a dessert table, donut wall, or sheet cake instead. A small cutting cake for photos plus a dessert bar gives guests more options for less.' },
      { heading: 'Track everything in one place', body: 'The biggest budget killer is losing track of deposits and balances. Use a budget tracker from day one so you always know exactly what you\'ve spent and what\'s still owed. Vow\'s budget tracker does this for free.' },
    ],
    featureLink: { label: 'Explore the Budget Tracker', href: '/features/budget-tracker' },
    toolLink: { label: 'Try the Free Budget Calculator', href: '/tools/wedding-budget-calculator' },
    relatedSlugs: ['vendor-tips', 'wedding-planning-timeline', 'guest-list-etiquette'],
  },
  'guest-list-etiquette': {
    slug: 'guest-list-etiquette',
    title: 'Guest List Etiquette: Who to Invite and How to Handle the Hard Cases',
    date: 'Feb 3, 2026',
    dateISO: '2026-02-03',
    cat: 'Guests',
    excerpt: 'Navigating the tricky politics of plus-ones, distant relatives, and coworkers.',
    image: 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=1200',
    readTime: '5 min read',
    sections: [
      { heading: 'Start with your budget', body: 'Your guest list size is ultimately a financial decision. Before you start naming names, determine how many guests your budget can accommodate. A good rule: divide your catering and bar budget by your per-head cost. That number is your guest list target.' },
      { heading: 'The plus-one rules', body: 'Married, engaged, and long-term partners should always be invited. For casual relationships, it\'s acceptable to invite single friends without a plus-one. The key is consistency: if you invite one single friend with a plus-one, invite them all — or none.' },
      { heading: 'Coworkers: invite or not?', body: 'You\'re not obligated to invite coworkers. If you socialize outside of work, invite them. If you only see them at the office, a polite "we\'re keeping it small" is a perfectly acceptable response. Avoid discussing the wedding at work to minimize awkwardness.' },
      { heading: 'Handling family pressure', body: 'Parents may want to invite their friends, especially if they\'re contributing financially. If they\'re paying, give them a set number of invitations (e.g., 10 seats). If you\'re paying, you have final say. Be firm but kind: "We love Aunt Carol but we\'re limited to immediate family."' },
      { heading: 'Kids or no kids?', body: 'An adults-only wedding is perfectly acceptable. State it clearly on your invitation and wedding website: "We love your little ones, but this is an adults-only celebration." Arrange a kids\' room with a sitter if many guests are traveling with children.' },
      { heading: 'B-list strategy', body: 'Create an A-list (must-invites) and a B-list (would-love-to-invites). Send A-list invitations early. As regrets come in, send B-list invitations. Never tell anyone they\'re on the B-list, and make sure B-list invitations go out at least 6 weeks before the wedding.' },
      { heading: 'Track RSVPs properly', body: 'A spreadsheet or app is essential for tracking RSVPs, meal choices, dietary restrictions, and plus-one details. Vow\'s guest list manager handles all of this for free — and you can export it to share with your caterer.' },
    ],
    featureLink: { label: 'Explore the Guest List Manager', href: '/features/guest-list' },
    toolLink: { label: 'Free Wedding Budget Calculator', href: '/tools/wedding-budget-calculator' },
    relatedSlugs: ['wedding-planning-timeline', 'wedding-budget-tips', 'wedding-day-timeline'],
  },
  'vendor-tips': {
    slug: 'vendor-tips',
    title: 'How to Interview and Book Wedding Vendors',
    date: 'Feb 18, 2026',
    dateISO: '2026-02-18',
    cat: 'Vendors',
    excerpt: 'The questions you must ask before signing any vendor contract.',
    image: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=1200',
    readTime: '7 min read',
    sections: [
      { heading: 'Start with referrals and reviews', body: 'Ask recently married friends, your venue coordinator, and local wedding groups on Facebook for recommendations. Cross-reference with reviews on WeddingWire and The Knot. Look for vendors with consistent positive reviews over time, not just a few glowing ones.' },
      { heading: 'Photographer questions', body: 'Ask: How many weddings have you shot? Can I see a full gallery from a recent wedding? What\'s your backup plan if you\'re sick? Do you bring a second shooter? What\'s the turnaround time for photos? Who owns the copyright?' },
      { heading: 'Caterer questions', body: 'Ask: Are you licensed and insured? Can you accommodate dietary restrictions? What\'s included in the per-head price (staff, rentals, linens)? Do you do tastings? What\'s your overtime policy? How many events do you handle on the same day?' },
      { heading: 'Florist questions', body: 'Ask: What flowers will be in season for my wedding? Can you work within my budget? Do you handle delivery and setup? Can I see photos of your work? What happens to the arrangements after the ceremony — can they be moved to the reception?' },
      { heading: 'DJ/band questions', body: 'Ask: Have you worked at my venue before? Can I see your setlist? Do you take requests? What\'s your backup plan if you can\'t make it? Do you provide MC services? What\'s your policy on do-not-play songs?' },
      { heading: 'Always get it in writing', body: 'Never book a vendor without a signed contract. It should include the service date, exact deliverables, payment schedule, cancellation policy, and what happens if either party needs to reschedule. If a vendor won\'t provide a contract, walk away.' },
      { heading: 'Track vendor details in one place', body: 'Keep all your vendor contacts, quotes, deposits, and contract status in a single vendor manager. Vow\'s vendor manager links directly to your budget items so costs stay in sync automatically.' },
    ],
    featureLink: { label: 'Explore the Vendor Manager', href: '/' },
    toolLink: { label: 'Free Wedding Checklist', href: '/tools/wedding-checklist' },
    relatedSlugs: ['wedding-planning-timeline', 'wedding-budget-tips', 'wedding-day-timeline'],
  },
  'wedding-day-timeline': {
    slug: 'wedding-day-timeline',
    title: 'Building the Perfect Wedding Day Timeline',
    date: 'Mar 5, 2026',
    dateISO: '2026-03-05',
    cat: 'Planning',
    excerpt: 'How to structure your day to minimize stress and maximize enjoyment.',
    image: 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=1200',
    readTime: '6 min read',
    sections: [
      { heading: 'Work backwards from the reception end time', body: 'Your venue will tell you when the music has to stop — typically 11pm or midnight. Work backwards from there: 30 minutes for last dance and send-off, 60 minutes for dancing, 30 minutes for cake cutting, 60 minutes for dinner, 30 minutes for toasts, 30 minutes for first dances, 30 minutes for entrance.' },
      { heading: 'Build in buffer time', body: 'Everything takes longer than you think. Add 15-30 minutes of buffer between major transitions. If hair and makeup are scheduled for 11am, expect it to run until 11:30. Building in buffer means you\'re never rushing, and if things go smoothly you have a moment to breathe.' },
      { heading: 'Getting ready (2-3 hours)', body: 'Schedule hair and makeup to finish 90 minutes before you need to leave for the ceremony. Build in time for getting dressed, photos of the dress and rings, and a first look with your partner if you\'re doing one. Don\'t forget to eat!' },
      { heading: 'Ceremony (30-60 minutes)', body: 'A typical ceremony runs 30-45 minutes. Build in 15 minutes for guests to be seated before the start time, and 15 minutes after for congratulations and the recessional. If your ceremony and reception are at different venues, add travel time plus 30 minutes for guest transit.' },
      { heading: 'Cocktail hour (60 minutes)', body: 'Use cocktail hour for your wedding party photos. This is when you\'ll take family photos, bridal party photos, and couple portraits. Give your photographer a shot list in advance so nothing is missed. Guests enjoy drinks and appetizers while you\'re posing.' },
      { heading: 'Reception flow', body: 'Grand entrance, first dance (or save it for after dinner), toasts, dinner, cake cutting, parent dances, open dancing, bouquet toss, last dance, send-off. Not every tradition has to happen — pick the ones that matter to you and skip the rest.' },
      { heading: 'Share the timeline with vendors', body: 'Your photographer, caterer, DJ, and venue all need a copy of the timeline. A shared day-of timeline ensures everyone is on the same page. Vow\'s day timeline builder lets you create and share a minute-by-minute schedule with your entire vendor team.' },
    ],
    featureLink: { label: 'Explore the Day Timeline Builder', href: '/' },
    toolLink: { label: 'Free Wedding Checklist', href: '/tools/wedding-checklist' },
    relatedSlugs: ['wedding-planning-timeline', 'vendor-tips', 'honeymoon-planning'],
  },
  'honeymoon-planning': {
    slug: 'honeymoon-planning',
    title: 'Honeymoon Planning 101',
    date: 'Mar 20, 2026',
    dateISO: '2026-03-20',
    cat: 'Honeymoon',
    excerpt: 'From destination selection to packing lists — plan your perfect post-wedding escape.',
    image: 'https://images.pexels.com/photos/237272/pexels-photo-237272.jpeg?auto=compress&cs=tinysrgb&w=1200',
    readTime: '5 min read',
    sections: [
      { heading: 'Set a honeymoon budget', body: 'Decide your honeymoon budget early — ideally before you start planning the wedding. Many couples add honeymoon funds to their registry. A typical honeymoon costs $3,000-$8,000 depending on destination and duration. Be realistic about what you can afford after wedding expenses.' },
      { heading: 'Choose your travel style', body: 'Beach resort? European city tour? Adventure safari? Road trip? Discuss with your partner what you both want from this trip. Some couples want to do nothing but lay on a beach; others want to explore. There\'s no wrong answer — just make sure you agree.' },
      { heading: 'Book early for the best deals', body: 'Book flights 2-6 months in advance for the best prices. Resort packages often have early-bird discounts. If you\'re traveling internationally, make sure your passports are valid for at least 6 months beyond your return date.' },
      { heading: 'Consider a mini-moon', body: 'If a big honeymoon isn\'t in the budget right after the wedding, consider a mini-moon — a 2-3 day getaway right after the wedding, followed by a bigger trip later in the year. This lets you decompress without financial stress and plan a better trip when you have more savings.' },
      { heading: 'Pack smart', body: 'Make a packing list 2 weeks before departure. Roll clothes to save space. Pack a small first-aid kit with pain relievers, band-aids, and any prescription medications. Bring copies of your passport, travel insurance, and reservation confirmations.' },
      { heading: 'Plan for jet lag', body: 'If crossing multiple time zones, start adjusting your sleep schedule a few days before departure. Stay hydrated on the plane. Plan a light first day — don\'t book a full excursion the morning you arrive. Give your body time to adjust.' },
      { heading: 'Keep honeymoon details organized', body: 'Use a honeymoon planner to track destinations, travel dates, packing lists, and notes. Vow\'s honeymoon planner keeps everything alongside your wedding planning so you don\'t lose track of details.' },
    ],
    featureLink: { label: 'Explore the Honeymoon Planner', href: '/' },
    toolLink: { label: 'Free Wedding Checklist', href: '/tools/wedding-checklist' },
    relatedSlugs: ['wedding-planning-timeline', 'wedding-day-timeline', 'wedding-budget-tips'],
  },
  ...BLOG_CONTENT_BATCH1,
  ...BLOG_CONTENT_BATCH2,
  ...BLOG_CONTENT_BATCH3,
};

export const ALL_BLOG_POSTS = [
  { slug: 'wedding-planning-timeline', title: 'The Complete Wedding Planning Timeline', date: 'Jan 15, 2026', dateISO: '2026-01-15', cat: 'Planning', image: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'wedding-budget-tips', title: '10 Ways to Stretch Your Wedding Budget', date: 'Jan 22, 2026', dateISO: '2026-01-22', cat: 'Budget', image: 'https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '6 min read' },
  { slug: 'guest-list-etiquette', title: 'Guest List Etiquette: Who to Invite', date: 'Feb 3, 2026', dateISO: '2026-02-03', cat: 'Guests', image: 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '5 min read' },
  { slug: 'vendor-tips', title: 'How to Interview and Book Wedding Vendors', date: 'Feb 18, 2026', dateISO: '2026-02-18', cat: 'Vendors', image: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '7 min read' },
  { slug: 'wedding-day-timeline', title: 'Building the Perfect Wedding Day Timeline', date: 'Mar 5, 2026', dateISO: '2026-03-05', cat: 'Planning', image: 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '6 min read' },
  { slug: 'honeymoon-planning', title: 'Honeymoon Planning 101', date: 'Mar 20, 2026', dateISO: '2026-03-20', cat: 'Honeymoon', image: 'https://images.pexels.com/photos/237272/pexels-photo-237272.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '5 min read' },
  { slug: 'wedding-catering-service-charge-vs-gratuity', title: 'Service Charge vs Gratuity on a Wedding Catering Quote', date: 'Aug 15, 2026', dateISO: '2026-08-15', cat: 'Budget', image: 'https://images.pexels.com/photos/599338/pexels-photo-599338.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '9 min read' },
  { slug: 'wedding-day-timeline-4pm-ceremony', title: 'Wedding Day Timeline for a 4pm Ceremony', date: 'Aug 16, 2026', dateISO: '2026-08-16', cat: 'Planning', image: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '10 min read' },
  { slug: 'what-time-to-start-wedding-ceremony', title: 'What Time to Start Your Wedding Ceremony', date: 'Aug 17, 2026', dateISO: '2026-08-17', cat: 'Planning', image: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'wedding-b-list-invitation-timing', title: 'Wedding B-List Timing: When to Send Round Two', date: 'Aug 18, 2026', dateISO: '2026-08-18', cat: 'Guests', image: 'https://images.pexels.com/photos/3030966/pexels-photo-3030966.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'do-you-have-to-feed-wedding-vendors', title: 'Do You Have to Feed Your Wedding Vendors?', date: 'Aug 19, 2026', dateISO: '2026-08-19', cat: 'Vendors', image: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '7 min read' },
  { slug: 'kids-table-wedding-reception', title: 'Kids Table at a Wedding: Ages, Size and Placement', date: 'Aug 20, 2026', dateISO: '2026-08-20', cat: 'Guests', image: 'https://images.pexels.com/photos/1620760/pexels-photo-1620760.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '7 min read' },
  { slug: 'how-many-guests-per-table', title: 'How Many Guests Fit Per Wedding Table', date: 'Aug 21, 2026', dateISO: '2026-08-21', cat: 'Guests', image: 'https://images.pexels.com/photos/169190/pexels-photo-169190.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'how-to-seat-divorced-parents', title: 'How to Seat Divorced Parents at Your Wedding', date: 'Aug 22, 2026', dateISO: '2026-08-22', cat: 'Guests', image: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'hidden-wedding-costs-forgotten', title: 'Hidden Wedding Costs Couples Forget to Budget For', date: 'Aug 23, 2026', dateISO: '2026-08-23', cat: 'Budget', image: 'https://images.pexels.com/photos/6621337/pexels-photo-6621337.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '10 min read' },
  { slug: '25000-wedding-budget-100-guests', title: '$25,000 Wedding Budget for 100 Guests: Real Breakdown', date: 'Aug 24, 2026', dateISO: '2026-08-24', cat: 'Budget', image: 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '9 min read' },
  { slug: 'cost-per-wedding-guest', title: 'How Much Each Wedding Guest Actually Costs You', date: 'Aug 25, 2026', dateISO: '2026-08-25', cat: 'Budget', image: 'https://images.pexels.com/photos/1195750/pexels-photo-1195750.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '9 min read' },
  { slug: 'percentage-wedding-guests-decline', title: 'What Percent of Wedding Guests Actually Decline?', date: 'Aug 26, 2026', dateISO: '2026-08-26', cat: 'Guests', image: 'https://images.pexels.com/photos/2253879/pexels-photo-2253879.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'guests-didnt-rsvp-what-to-do', title: 'Guests Didn\'t RSVP by the Deadline? Do This.', date: 'Aug 27, 2026', dateISO: '2026-08-27', cat: 'Guests', image: 'https://images.pexels.com/photos/3759450/pexels-photo-3759450.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'how-to-cut-wedding-guest-list', title: 'How to Cut Your Wedding Guest List Without Drama', date: 'Aug 28, 2026', dateISO: '2026-08-28', cat: 'Guests', image: 'https://images.pexels.com/photos/2253833/pexels-photo-2253833.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'wedding-checklist-final-month', title: 'Wedding Checklist: The Final Month, Week by Week', date: 'Aug 29, 2026', dateISO: '2026-08-29', cat: 'Planning', image: 'https://images.pexels.com/photos/2253875/pexels-photo-2253875.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '9 min read' },
  { slug: 'wedding-vendor-contract-red-flags', title: 'Wedding Vendor Contract Red Flags to Check Before You Sign', date: 'Aug 30, 2026', dateISO: '2026-08-30', cat: 'Vendors', image: 'https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '10 min read' },
  { slug: 'wedding-timeline-buffer-time', title: 'How Much Buffer Time a Wedding Timeline Needs', date: 'Aug 31, 2026', dateISO: '2026-08-31', cat: 'Planning', image: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'head-table-vs-sweetheart-table', title: 'Head Table vs Sweetheart Table: How to Decide', date: 'Sep 1, 2026', dateISO: '2026-09-01', cat: 'Guests', image: 'https://images.pexels.com/photos/2253875/pexels-photo-2253875.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'wedding-vendor-payment-schedule', title: 'When Wedding Vendor Final Payments Are Due', date: 'Sep 2, 2026', dateISO: '2026-09-02', cat: 'Budget', image: 'https://images.pexels.com/photos/6621337/pexels-photo-6621337.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '9 min read' },
  { slug: 'who-gets-a-plus-one-wedding', title: 'Who Gets a Plus-One at Your Wedding? Clear Rules', date: 'Sep 3, 2026', dateISO: '2026-09-03', cat: 'Guests', image: 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'over-wedding-budget-what-to-cut', title: 'Over Your Wedding Budget? What to Cut, In Order', date: 'Sep 4, 2026', dateISO: '2026-09-04', cat: 'Budget', image: 'https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '9 min read' },
  { slug: 'adults-only-wedding-how-to-tell-guests', title: 'How to Tell Guests Your Wedding Is Adults-Only', date: 'Sep 5, 2026', dateISO: '2026-09-05', cat: 'Guests', image: 'https://images.pexels.com/photos/1620760/pexels-photo-1620760.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'what-to-book-first-after-engaged', title: 'What to Book First After Getting Engaged (Real Order)', date: 'Sep 6, 2026', dateISO: '2026-09-06', cat: 'Planning', image: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '8 min read' },
  { slug: 'wedding-shuttle-schedule-guests', title: 'How to Plan a Wedding Shuttle Schedule for Guests', date: 'Sep 7, 2026', dateISO: '2026-09-07', cat: 'Planning', image: 'https://images.pexels.com/photos/210182/pexels-photo-210182.jpeg?auto=compress&cs=tinysrgb&w=800', readTime: '9 min read' },
];

const TODAY = new Date().toISOString().slice(0, 10);
export const PUBLISHED_BLOG_POSTS = ALL_BLOG_POSTS.filter(p => p.dateISO <= TODAY);

interface BlogPostPageProps {
  slug: string;
  onGetStarted: () => void;
  onLogin?: () => void;
}

export function BlogPostPage({ slug, onGetStarted }: BlogPostPageProps) {
  const content = BLOG_CONTENT[slug];
  if (!content) return null;

  const relatedPosts = content.relatedSlugs
    .map(s => PUBLISHED_BLOG_POSTS.find(p => p.slug === s))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <Heart size={18} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <span className="font-serif text-2xl text-[#2a1f15]">Vow</span>
          </a>
          <div className="hidden md:flex items-center gap-6 text-sm text-[#5d4e3e]">
            <a href="/#features" className="hover:text-[#8a6d3b] transition-colors">Features</a>
            <a href="/#pricing" className="hover:text-[#8a6d3b] transition-colors">Pricing</a>
            <a href="/blog" className="hover:text-[#8a6d3b] transition-colors">Blog</a>
            <a href="/for-planners" className="hover:text-[#8a6d3b] transition-colors">For Planners</a>
          </div>
          <button onClick={onGetStarted} className="flex items-center gap-2 bg-[#8a6d3b] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#7a6030] transition-colors">
            Start planning free <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      <div className="w-full h-72 md:h-96 overflow-hidden">
        <img src={content.image} alt={content.title} className="w-full h-full object-cover" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#6b5d4f] mb-6">
          <a href="/" className="hover:text-[#8a6d3b] transition-colors">Home</a>
          <span>/</span>
          <a href="/blog" className="hover:text-[#8a6d3b] transition-colors">Blog</a>
          <span>/</span>
          <span className="text-[#8a6d3b]">{content.cat}</span>
        </nav>

        <a href="/blog" className="inline-flex items-center gap-1.5 text-[#8a6d3b] text-sm hover:text-[#b8955a] transition-colors mb-6">
          <ArrowLeft size={14} /> Back to Blog
        </a>

        <div className="mb-8">
          <span className="text-xs bg-[#c9a96e]/10 text-[#8a6d3b] px-2 py-0.5 rounded-full">{content.cat}</span>
          <h1 className="font-serif text-4xl text-[#2a1f15] mt-4 mb-3">{content.title}</h1>
          <div className="flex items-center gap-4 py-4 border-y border-stone-100">
            <div className="w-9 h-9 rounded-full bg-[#c9a96e]/10 border border-[#c9a96e]/20 flex items-center justify-center flex-shrink-0">
              <Heart size={14} className="text-[#8a6d3b] fill-[#c9a96e]" />
            </div>
            <div>
              <div className="text-[#2a1f15] text-sm font-medium">Vow Editorial Team</div>
              <div className="text-[#6b5d4f] text-xs flex items-center gap-2"><Calendar size={11} /> {content.date} · {content.readTime}</div>
            </div>
            <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="ml-auto flex items-center gap-1.5 text-[#6b5d4f] hover:text-[#8a6d3b] transition-colors text-xs border border-stone-200 px-3 py-1.5 rounded-lg">
              <Share2 size={13} /> Share
            </button>
          </div>
        </div>

        <p className="text-[#5d4e3e] text-lg mb-10 leading-relaxed">{content.excerpt}</p>

        {content.sections.map((s, i) => (
          <div key={s.heading} className="mb-8">
            <h2 className="font-serif text-2xl text-[#2a1f15] mb-3">{s.heading}</h2>
            <div
              className="text-[#5d4e3e] leading-relaxed [&_a]:text-[#8a6d3b] [&_a]:underline [&_a:hover]:text-[#b8955a] [&_strong]:text-[#2a1f15] [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: s.body }}
            />
            {i === Math.floor(content.sections.length / 2) - 1 && (
              <BlogEmailCapture sourcePost={slug} placement="mid" />
            )}
          </div>
        ))}

        <BlogEmailCapture sourcePost={slug} placement="end" />

        {/* Internal links to feature + tool */}
        <div className="bg-[#faf9f7] border border-stone-200 rounded-2xl p-6 mt-12">
          <h3 className="font-serif text-xl text-[#2a1f15] mb-4">Keep planning with Vow</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={content.featureLink.href} className="flex-1 inline-flex items-center justify-center gap-2 bg-[#8a6d3b] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors">
              {content.featureLink.label} <ArrowRight size={14} />
            </a>
            <a href={content.toolLink.href} className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-[#c9a96e] text-[#8a6d3b] px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#c9a96e]/5 transition-colors">
              {content.toolLink.label} <ArrowRight size={14} />
            </a>
          </div>
          <button onClick={onGetStarted} className="mt-3 w-full text-center text-sm text-[#6b5d4f] hover:text-[#8a6d3b] transition-colors">
            Or sign up free to start planning your wedding →
          </button>
        </div>

        {/* Related posts */}
        <div className="mt-16">
          <h3 className="font-serif text-2xl text-[#2a1f15] mb-6">Related Articles</h3>
          <div className="grid md:grid-cols-3 gap-5">
            {relatedPosts.map(p => p && (
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

      <footer className="bg-[#1a1510] text-white py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Heart size={18} className="text-[#8a6d3b] fill-[#c9a96e]" />
          <span className="font-serif text-2xl">Vow</span>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-[#c0a880]">
          <a href="/" className="hover:text-[#8a6d3b] transition-colors">Home</a>
          <a href="/features/budget-tracker" className="hover:text-[#8a6d3b] transition-colors">Budget Tracker</a>
          <a href="/features/guest-list" className="hover:text-[#8a6d3b] transition-colors">Guest List</a>
          <a href="/blog" className="hover:text-[#8a6d3b] transition-colors">Blog</a>
        </div>
        <div className="mt-4 text-[#a08868] text-xs">&copy; {new Date().getFullYear()} Vow Wedding Planner</div>
      </footer>
    </div>
  );
}
