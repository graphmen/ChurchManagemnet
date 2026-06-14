-- ============================================================================
-- SQL MIGRATION: FIX SCHEMA MISMATCH ON ezc_small_groups & PROFILE PERMISSIONS
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Alter ezc_small_groups to match frontend expectations
ALTER TABLE public.ezc_small_groups 
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('small_group','prayer_band','bible_study','branch_sabbath','ministry_center','prayer_cell','intercessory')) DEFAULT 'small_group',
  ADD COLUMN IF NOT EXISTS leader_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- 2. Migrate existing coordinates geometry data to flat lat/lng columns if applicable
UPDATE public.ezc_small_groups 
SET 
  lat = ST_Y(coordinates::geometry),
  lng = ST_X(coordinates::geometry)
WHERE coordinates IS NOT NULL AND lat IS NULL;

-- 3. Enable RLS and setup policies for ezc_small_groups to prevent insert failures
ALTER TABLE public.ezc_small_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users read small groups" ON public.ezc_small_groups;
CREATE POLICY "Auth users read small groups" ON public.ezc_small_groups 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users insert small groups" ON public.ezc_small_groups;
CREATE POLICY "Auth users insert small groups" ON public.ezc_small_groups 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users update small groups" ON public.ezc_small_groups;
CREATE POLICY "Auth users update small groups" ON public.ezc_small_groups 
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. OPTIONAL: Promote your user profile from 'viewer' to 'conference_admin' or 'pastor'
-- Replace the email below with your login email to enable full data entry permissions:
-- UPDATE public.profiles SET role = 'conference_admin' WHERE email = 'your-email@example.com';
