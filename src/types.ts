export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro';
  status: string;
  billing_interval: 'monthly' | 'annual' | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
}

export interface WeddingProfile {
  id: string;
  user_id: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  venue: string;
  theme: string;
  total_budget: number;
  color_palette: string;
  notes: string;
  partner_user_id: string | null;
  rsvp_slug: string | null;
  rsvp_enabled: boolean;
  rsvp_deadline: string | null;
  countdown_slug: string | null;
  countdown_enabled: boolean;
  referral_code: string | null;
  hide_branding: boolean;
  currency_code: string;
  currency_symbol: string;
  hero_image_path: string | null;
  website_enabled: boolean;
  website_slug: string | null;
  website_content: WebsiteContent | null;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  wedding_id: string;
  category: string;
  item_name: string;
  estimated_cost: number;
  actual_cost: number;
  deposit_paid: number;
  balance_due: number;
  due_date: string | null;
  paid: boolean;
  notes: string;
  vendor_id: string | null;
  paid_by: string;
}

export interface BudgetPayment {
  id: string;
  budget_item_id: string;
  label: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  method_note: string;
}

export interface Household {
  id: string;
  wedding_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  rsvp_status: string;
  notes: string;
  invite_method: 'email' | 'post';
  invite_sent: boolean;
  thank_you_sent: boolean;
}

export interface Guest {
  id: string;
  wedding_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  group_name: string;
  side: string;
  rsvp_status: string;
  meal_choice: string;
  has_plus_one: boolean;
  plus_one_name: string;
  plus_one_rsvp: string;
  table_number: number | null;
  invite_sent: boolean;
  thank_you_sent: boolean;
  gift_received: string;
  dietary_restrictions: string;
  notes: string;
  household_id: string | null;
  age_group: string;
  relationship: string;
  plus_one_allowed: boolean;
  seat_number: number | null;
}

export type TableShape = 'round' | 'rectangle' | 'head' | 'sweetheart';
export type ObjectType = 'dance_floor' | 'bar' | 'stage' | 'cake_table' | 'dj' | 'other';

export interface SeatingTable {
  id: string;
  wedding_id: string;
  label: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  table_number: number;
}

export interface SeatingObject {
  id: string;
  wedding_id: string;
  label: string;
  object_type: ObjectType;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
}

export interface SeatingRule {
  id: string;
  wedding_id: string;
  rule_type: 'together' | 'apart';
  scope: 'guest' | 'household';
  guest_a_id: string | null;
  guest_b_id: string | null;
  household_a_id: string | null;
  household_b_id: string | null;
}

export interface Vendor {
  id: string;
  wedding_id: string;
  category: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  price: number;
  deposit_paid: number;
  balance_due: number;
  contract_signed: boolean;
  contract_file_path: string | null;
  payment_due_date: string | null;
  status: string;
  rating: number;
  notes: string;
}

export interface ChecklistItem {
  id: string;
  wedding_id: string;
  timeframe: string;
  task: string;
  category: string;
  completed: boolean;
  completed_at: string | null;
  notes: string;
  due_date?: string | null;
  assignee?: string | null;
  assignee_name?: string | null;
  overridden?: boolean;
}

export interface BridalPartyMember {
  id: string;
  wedding_id: string;
  name: string;
  role: string;
  side: string;
  phone: string;
  email: string;
  outfit_details: string;
  outfit_ordered: boolean;
  gift_given: boolean;
  gift_details: string;
  notes: string;
}

export interface TimelineEvent {
  id: string;
  wedding_id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  location: string;
  notes: string;
  category: string;
  sort_order: number;
}

export interface TimelineAssignment {
  id: string;
  timeline_event_id: string;
  wedding_id: string;
  assignee_type: 'vendor' | 'person';
  vendor_id: string | null;
  person_name: string;
  person_role: string;
  sort_order: number;
}

export interface ActivityFeedItem {
  id: string;
  wedding_id: string;
  user_id: string;
  actor_name: string;
  action: string;
  created_at: string;
}

export interface PartnerInvite {
  id: string;
  wedding_id: string;
  invited_by_user_id: string;
  invited_email: string;
  token: string;
  accepted_at: string | null;
  created_at: string;
}

export interface WebsiteScheduleItem {
  time: string;
  title: string;
  location: string;
  note: string;
}

export interface WebsiteFaqItem {
  question: string;
  answer: string;
}

export interface RegistryLink {
  label: string;
  url: string;
  note: string;
}

export interface WebsiteContent {
  story: string;
  schedule: WebsiteScheduleItem[];
  travel_notes: string;
  faqs: WebsiteFaqItem[];
  registry_links: RegistryLink[];
}

export type Section =
  | 'dashboard'
  | 'overview'
  | 'website'
  | 'checklist'
  | 'budget'
  | 'guests'
  | 'vendors'
  | 'seating'
  | 'bridal-party'
  | 'timeline'
  | 'honeymoon'
  | 'notes'
  | 'planner'
  | 'referrals'
  | 'settings';
