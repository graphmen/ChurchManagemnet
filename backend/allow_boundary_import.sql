-- =============================================================
-- Run this in Supabase SQL Editor BEFORE running the import script
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- =============================================================

-- 1. Allow public INSERT on ezc_pastoral_boundaries (for import)
DROP POLICY IF EXISTS "Allow public insert boundaries" ON public.ezc_pastoral_boundaries;
CREATE POLICY "Allow public insert boundaries"
  ON public.ezc_pastoral_boundaries
  FOR INSERT
  WITH CHECK (true);

-- 2. Allow public UPDATE on ezc_pastoral_boundaries
DROP POLICY IF EXISTS "Allow public update boundaries" ON public.ezc_pastoral_boundaries;
CREATE POLICY "Allow public update boundaries"
  ON public.ezc_pastoral_boundaries
  FOR UPDATE
  USING (true);

-- 3. Allow public DELETE on ezc_pastoral_boundaries (for re-import)
DROP POLICY IF EXISTS "Allow public delete boundaries" ON public.ezc_pastoral_boundaries;
CREATE POLICY "Allow public delete boundaries"
  ON public.ezc_pastoral_boundaries
  FOR DELETE
  USING (true);

-- =============================================================
-- AFTER the import is done, you can tighten security by running:
-- DROP POLICY "Allow public insert boundaries" ON public.ezc_pastoral_boundaries;
-- DROP POLICY "Allow public update boundaries" ON public.ezc_pastoral_boundaries;
-- DROP POLICY "Allow public delete boundaries" ON public.ezc_pastoral_boundaries;
-- =============================================================
