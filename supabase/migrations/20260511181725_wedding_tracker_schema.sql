
/*
  # Wedding Tracker Schema

  1. New Tables
    - `wedding_profile` - Core wedding details (couple names, date, venue, budget)
    - `budget_items` - Budget line items per category with estimated/actual costs
    - `guests` - Guest database with RSVP, meal, seating info
    - `vendors` - Vendor contacts, pricing, payment tracking
    - `checklist_items` - Master checklist with timeframes and completion
    - `bridal_party` - Bridal party members and roles
    - `vendor_payments` - Payment records per vendor

  2. Security
    - RLS enabled on all tables
    - Public access policies (no auth required for this demo planner)
*/

-- Wedding profile
CREATE TABLE IF NOT EXISTS wedding_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner1_name text DEFAULT '',
  partner2_name text DEFAULT '',
  wedding_date date,
  venue text DEFAULT '',
  theme text DEFAULT '',
  total_budget numeric(12,2) DEFAULT 0,
  color_palette text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wedding_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read wedding_profile"
  ON wedding_profile FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert wedding_profile"
  ON wedding_profile FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update wedding_profile"
  ON wedding_profile FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Budget items
CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_profile(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT '',
  item_name text NOT NULL DEFAULT '',
  estimated_cost numeric(12,2) DEFAULT 0,
  actual_cost numeric(12,2) DEFAULT 0,
  deposit_paid numeric(12,2) DEFAULT 0,
  balance_due numeric(12,2) DEFAULT 0,
  due_date date,
  paid boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read budget_items"
  ON budget_items FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert budget_items"
  ON budget_items FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update budget_items"
  ON budget_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete budget_items"
  ON budget_items FOR DELETE TO anon, authenticated USING (true);

-- Guests
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_profile(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  group_name text DEFAULT '',
  side text DEFAULT 'both',
  rsvp_status text DEFAULT 'pending',
  meal_choice text DEFAULT '',
  has_plus_one boolean DEFAULT false,
  plus_one_name text DEFAULT '',
  plus_one_rsvp text DEFAULT 'pending',
  table_number integer,
  invite_sent boolean DEFAULT false,
  thank_you_sent boolean DEFAULT false,
  gift_received text DEFAULT '',
  dietary_restrictions text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read guests"
  ON guests FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert guests"
  ON guests FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update guests"
  ON guests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete guests"
  ON guests FOR DELETE TO anon, authenticated USING (true);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_profile(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  contact_name text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  website text DEFAULT '',
  price numeric(12,2) DEFAULT 0,
  deposit_paid numeric(12,2) DEFAULT 0,
  balance_due numeric(12,2) DEFAULT 0,
  contract_signed boolean DEFAULT false,
  payment_due_date date,
  status text DEFAULT 'researching',
  rating integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read vendors"
  ON vendors FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert vendors"
  ON vendors FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update vendors"
  ON vendors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete vendors"
  ON vendors FOR DELETE TO anon, authenticated USING (true);

-- Checklist items
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_profile(id) ON DELETE CASCADE,
  timeframe text NOT NULL DEFAULT '',
  task text NOT NULL DEFAULT '',
  category text DEFAULT '',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read checklist_items"
  ON checklist_items FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert checklist_items"
  ON checklist_items FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update checklist_items"
  ON checklist_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete checklist_items"
  ON checklist_items FOR DELETE TO anon, authenticated USING (true);

-- Bridal party
CREATE TABLE IF NOT EXISTS bridal_party (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_profile(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  side text DEFAULT 'partner1',
  phone text DEFAULT '',
  email text DEFAULT '',
  outfit_details text DEFAULT '',
  outfit_ordered boolean DEFAULT false,
  gift_given boolean DEFAULT false,
  gift_details text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bridal_party ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read bridal_party"
  ON bridal_party FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert bridal_party"
  ON bridal_party FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public update bridal_party"
  ON bridal_party FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete bridal_party"
  ON bridal_party FOR DELETE TO anon, authenticated USING (true);

-- Seed default checklist items
INSERT INTO wedding_profile (id, partner1_name, partner2_name, total_budget)
VALUES ('00000000-0000-0000-0000-000000000001', 'Partner 1', 'Partner 2', 25000)
ON CONFLICT (id) DO NOTHING;
