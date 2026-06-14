-- =============================================================
-- EZC DATABASE SCHEMA UPDATES & STORAGE SETUP
-- =============================================================

-- 1. Update profiles.role check constraint to include 'church_leader' and 'conference_director'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('conference_admin', 'conference_director', 'district_admin', 'pastor', 'church_leader', 'viewer')
);

-- 2. Alter ezc_visitations table to support custom log fields from mobile app
ALTER TABLE public.ezc_visitations ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.ezc_churches(id);
ALTER TABLE public.ezc_visitations ADD COLUMN IF NOT EXISTS member_name TEXT;
ALTER TABLE public.ezc_visitations ADD COLUMN IF NOT EXISTS follow_up_needed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.ezc_visitations ADD COLUMN IF NOT EXISTS pastor_name TEXT;

-- 3. Create ezc_reports table for general reports & small group logs
CREATE TABLE IF NOT EXISTS public.ezc_reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id    UUID REFERENCES public.ezc_churches(id),
  report_date  DATE NOT NULL,
  pastor_name  TEXT,
  payload      JSONB, -- contains group_name, attendance_members, attendance_visitors, bible_studies, notes
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and setup policies for ezc_reports
ALTER TABLE public.ezc_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users read reports" ON public.ezc_reports;
CREATE POLICY "Auth users read reports" ON public.ezc_reports 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users insert reports" ON public.ezc_reports;
CREATE POLICY "Auth users insert reports" ON public.ezc_reports 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable RLS and setup policies for ezc_visitations
ALTER TABLE public.ezc_visitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users read visitations" ON public.ezc_visitations;
CREATE POLICY "Auth users read visitations" ON public.ezc_visitations 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users insert visitations" ON public.ezc_visitations;
CREATE POLICY "Auth users insert visitations" ON public.ezc_visitations 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Create storage bucket for media uploads (photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ezc_media', 'ezc_media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ezc_media bucket
DROP POLICY IF EXISTS "Allow public read access to ezc_media" ON storage.objects;
CREATE POLICY "Allow public read access to ezc_media"
  ON storage.objects FOR SELECT USING (bucket_id = 'ezc_media');

DROP POLICY IF EXISTS "Allow authenticated uploads to ezc_media" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to ezc_media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ezc_media' AND auth.role() = 'authenticated');

-- =============================================================
-- PHASE 1: CORE DEPARTMENTS, AUDITS, MEMBER 360, & SSPM MODULE
-- =============================================================

-- 4.5 Ensure ezc_churches has necessary extended columns
ALTER TABLE public.ezc_churches ADD COLUMN IF NOT EXISTS boundary_id UUID REFERENCES public.ezc_pastoral_boundaries(id);
ALTER TABLE public.ezc_churches ADD COLUMN IF NOT EXISTS property_status TEXT DEFAULT 'owned';
ALTER TABLE public.ezc_churches ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0;
ALTER TABLE public.ezc_churches ADD COLUMN IF NOT EXISTS established_date DATE;

-- 5. Create core departmental reports table
CREATE TABLE IF NOT EXISTS public.ezc_departmental_reports (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id               UUID REFERENCES public.ezc_churches(id) ON DELETE RESTRICT,
  submitted_by            UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  department_code         TEXT NOT NULL, -- 'SSPM', 'AY', 'WM', 'AMO', 'CM', 'STEW', 'HEALTH', 'COMM'
  reporting_period_start  DATE NOT NULL,
  reporting_period_end    DATE NOT NULL,
  status                  TEXT CHECK (status IN ('draft', 'submitted', 'reviewed_by_pastor', 'approved_by_director', 'rejected')) DEFAULT 'draft',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create SSPM specific metrics table
CREATE TABLE IF NOT EXISTS public.ezc_sspm_reports (
  id                                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id                         UUID REFERENCES public.ezc_departmental_reports(id) ON DELETE CASCADE,
  care_groups_active                INT DEFAULT 0,
  bible_studies_conducted           INT DEFAULT 0,
  baptism_candidates_added          INT DEFAULT 0,
  spiritual_gifts_surveys_completed INT DEFAULT 0,
  mission_volunteers_active         INT DEFAULT 0,
  details                           JSONB DEFAULT '{}'::jsonb
);

-- 7. Create geo-contextualized activities table
CREATE TABLE IF NOT EXISTS public.ezc_geo_activities (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id             UUID REFERENCES public.ezc_departmental_reports(id) ON DELETE CASCADE,
  activity_name         TEXT NOT NULL,
  geom                  JSONB, -- GeoJSON representation
  attendance_count      INT DEFAULT 0,
  narrative_summary     TEXT,
  captured_offline      BOOLEAN DEFAULT FALSE,
  gps_accuracy_meters   NUMERIC(5,2)
);

-- 8. Create member profile timeline table (Member 360)
CREATE TABLE IF NOT EXISTS public.ezc_member_profile_timeline (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id       UUID REFERENCES public.ezc_members(id) ON DELETE CASCADE,
  event_date      DATE NOT NULL,
  event_type      TEXT NOT NULL, -- e.g., 'baptism', 'pathfinder_induction', etc.
  department_code TEXT,
  description     TEXT NOT NULL,
  verified_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create audit trail ledger table (Write-only)
CREATE TABLE IF NOT EXISTS public.ezc_system_audit_trail (
  id                BIGSERIAL PRIMARY KEY,
  entity_name       TEXT NOT NULL,
  entity_id         UUID NOT NULL,
  action_type       TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'SUBMIT', 'VERIFY', 'APPROVE', 'REJECT'
  performed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address        TEXT,
  client_user_agent TEXT,
  timestamp         TIMESTAMPTZ DEFAULT NOW(),
  old_state         JSONB,
  new_state         JSONB
);

-- 10. Enable Row Level Security (RLS) on all new tables
ALTER TABLE public.ezc_departmental_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_sspm_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_geo_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_member_profile_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_system_audit_trail ENABLE ROW LEVEL SECURITY;

-- 11. Define RLS Policies for new tables

-- Departmental Reports Policies
DROP POLICY IF EXISTS "Users can read reports based on role" ON public.ezc_departmental_reports;
CREATE POLICY "Users can read reports based on role" ON public.ezc_departmental_reports
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      -- Admin or Director can read all
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('conference_admin', 'conference_director')
      ) OR
      -- Pastors can read reports from churches in boundaries assigned to them
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.ezc_pastors past ON past.user_id = p.id
        JOIN public.ezc_pastoral_boundaries b ON b.pastor_id = past.id
        JOIN public.ezc_churches c ON c.boundary_id = b.id
        WHERE p.id = auth.uid() AND c.id = ezc_departmental_reports.church_id
      ) OR
      -- Church leaders can read their own church reports
      EXISTS (
        SELECT 1 FROM public.ezc_members m
        WHERE m.added_by = auth.uid() AND m.church_id = ezc_departmental_reports.church_id
      ) OR
      submitted_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Leaders can insert reports" ON public.ezc_departmental_reports;
CREATE POLICY "Leaders can insert reports" ON public.ezc_departmental_reports
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND (
      submitted_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their reports" ON public.ezc_departmental_reports;
CREATE POLICY "Users can update their reports" ON public.ezc_departmental_reports
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      -- If admin
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'conference_admin'
      ) OR
      -- Or if pastor reviewing/approving
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'pastor'
      ) OR
      -- Or if director approving
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'conference_director'
      ) OR
      -- Or if submitted by self and status is draft/rejected
      (submitted_by = auth.uid() AND status IN ('draft', 'rejected'))
    )
  );

-- SSPM Reports Policies
DROP POLICY IF EXISTS "Auth read SSPM" ON public.ezc_sspm_reports;
CREATE POLICY "Auth read SSPM" ON public.ezc_sspm_reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert SSPM" ON public.ezc_sspm_reports;
CREATE POLICY "Auth insert SSPM" ON public.ezc_sspm_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update SSPM" ON public.ezc_sspm_reports;
CREATE POLICY "Auth update SSPM" ON public.ezc_sspm_reports
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Geo Activities Policies
DROP POLICY IF EXISTS "Auth read Geo Activities" ON public.ezc_geo_activities;
CREATE POLICY "Auth read Geo Activities" ON public.ezc_geo_activities
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert Geo Activities" ON public.ezc_geo_activities;
CREATE POLICY "Auth insert Geo Activities" ON public.ezc_geo_activities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Member Timeline Policies
DROP POLICY IF EXISTS "Auth read timeline" ON public.ezc_member_profile_timeline;
CREATE POLICY "Auth read timeline" ON public.ezc_member_profile_timeline
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth manage timeline" ON public.ezc_member_profile_timeline;
CREATE POLICY "Auth manage timeline" ON public.ezc_member_profile_timeline
  FOR ALL USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('conference_admin', 'pastor', 'conference_director')
    )
  );

-- Audit Trail Policies (Write-only to ensure compliance)
DROP POLICY IF EXISTS "Auth insert audit logs" ON public.ezc_system_audit_trail;
CREATE POLICY "Auth insert audit logs" ON public.ezc_system_audit_trail
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins read audit logs" ON public.ezc_system_audit_trail;
CREATE POLICY "Admins read audit logs" ON public.ezc_system_audit_trail
  FOR SELECT USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'conference_admin'
    )
  );

-- 12. Create database trigger function to auto-populate the audit log
CREATE OR REPLACE FUNCTION public.log_departmental_report_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.ezc_system_audit_trail (entity_name, entity_id, action_type, performed_by, new_state)
    VALUES ('ezc_departmental_reports', NEW.id, 'INSERT', NEW.submitted_by, to_jsonb(NEW));
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.status <> NEW.status) THEN
      INSERT INTO public.ezc_system_audit_trail (entity_name, entity_id, action_type, performed_by, old_state, new_state)
      VALUES ('ezc_departmental_reports', NEW.id, 
              CASE 
                WHEN NEW.status = 'submitted' THEN 'SUBMIT'
                WHEN NEW.status = 'reviewed_by_pastor' THEN 'VERIFY'
                WHEN NEW.status = 'approved_by_director' THEN 'APPROVE'
                WHEN NEW.status = 'rejected' THEN 'REJECT'
                ELSE 'UPDATE'
              END, 
              COALESCE(auth.uid(), NEW.submitted_by), to_jsonb(OLD), to_jsonb(NEW));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_departmental_report_audit
  AFTER INSERT OR UPDATE ON public.ezc_departmental_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_departmental_report_audit();


-- =============================================================
-- PHASE 2: YOUTH, CHILDREN, & STEWARDSHIP DEPARTMENTS
-- =============================================================

-- 13. Create Youth & Pathfinder specific metrics table
CREATE TABLE IF NOT EXISTS public.ezc_youth_reports (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id                 UUID REFERENCES public.ezc_departmental_reports(id) ON DELETE CASCADE,
  ay_membership             INT DEFAULT 0,
  ay_attendance             INT DEFAULT 0,
  pathfinder_membership     INT DEFAULT 0,
  pathfinder_attendance     INT DEFAULT 0,
  adventurer_membership     INT DEFAULT 0,
  adventurer_attendance     INT DEFAULT 0,
  camporee_registrations     INT DEFAULT 0,
  honors_completed          INT DEFAULT 0,
  leadership_certifications INT DEFAULT 0,
  details                   JSONB DEFAULT '{}'::jsonb
);

-- 14. Create Children's Ministries specific metrics table
CREATE TABLE IF NOT EXISTS public.ezc_children_reports (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id              UUID REFERENCES public.ezc_departmental_reports(id) ON DELETE CASCADE,
  children_attendance    INT DEFAULT 0,
  vbs_attendance         INT DEFAULT 0,
  vbs_leaders_count      INT DEFAULT 0,
  safeguarding_compliant BOOLEAN DEFAULT TRUE,
  details                JSONB DEFAULT '{}'::jsonb
);

-- 15. Create Stewardship & Finance specific metrics table
CREATE TABLE IF NOT EXISTS public.ezc_stewardship_reports (
  id                             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id                      UUID REFERENCES public.ezc_departmental_reports(id) ON DELETE CASCADE,
  stewardship_seminar_attendance INT DEFAULT 0,
  tithe_givers_count             INT DEFAULT 0,
  budget_allocated               NUMERIC(15,2) DEFAULT 0.00,
  budget_spent                   NUMERIC(15,2) DEFAULT 0.00,
  details                        JSONB DEFAULT '{}'::jsonb
);

-- 16. Enable RLS on Phase 2 tables
ALTER TABLE public.ezc_youth_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_children_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_stewardship_reports ENABLE ROW LEVEL SECURITY;

-- 17. Define RLS Policies for Phase 2 tables

-- Youth Reports Policies
DROP POLICY IF EXISTS "Auth read Youth" ON public.ezc_youth_reports;
CREATE POLICY "Auth read Youth" ON public.ezc_youth_reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert Youth" ON public.ezc_youth_reports;
CREATE POLICY "Auth insert Youth" ON public.ezc_youth_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update Youth" ON public.ezc_youth_reports;
CREATE POLICY "Auth update Youth" ON public.ezc_youth_reports
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Children Reports Policies
DROP POLICY IF EXISTS "Auth read Children" ON public.ezc_children_reports;
CREATE POLICY "Auth read Children" ON public.ezc_children_reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert Children" ON public.ezc_children_reports;
CREATE POLICY "Auth insert Children" ON public.ezc_children_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update Children" ON public.ezc_children_reports;
CREATE POLICY "Auth update Children" ON public.ezc_children_reports
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Stewardship Reports Policies
DROP POLICY IF EXISTS "Auth read Stewardship" ON public.ezc_stewardship_reports;
CREATE POLICY "Auth read Stewardship" ON public.ezc_stewardship_reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert Stewardship" ON public.ezc_stewardship_reports;
CREATE POLICY "Auth insert Stewardship" ON public.ezc_stewardship_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update Stewardship" ON public.ezc_stewardship_reports;
CREATE POLICY "Auth update Stewardship" ON public.ezc_stewardship_reports
  FOR UPDATE USING (auth.role() = 'authenticated');


-- =============================================================
-- PHASE 3: SPECIALTY & COMMUNITY MINISTRIES
-- =============================================================

-- 18. Create Women's Ministries specific metrics table
CREATE TABLE IF NOT EXISTS public.ezc_womens_ministry_reports (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id               UUID REFERENCES public.ezc_departmental_reports(id) ON DELETE CASCADE,
  mentorship_pairs_active INT DEFAULT 0,
  retreat_attendance      INT DEFAULT 0,
  outreach_projects_count INT DEFAULT 0,
  circle_of_hope_attendees INT DEFAULT 0,
  details                 JSONB DEFAULT '{}'::jsonb
);

-- 19. Create Men's Organization specific metrics table
CREATE TABLE IF NOT EXISTS public.ezc_mens_organization_reports (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id                UUID REFERENCES public.ezc_departmental_reports(id) ON DELETE CASCADE,
  fellowship_attendance    INT DEFAULT 0,
  workshops_conducted      INT DEFAULT 0,
  community_service_hours  INT DEFAULT 0,
  details                  JSONB DEFAULT '{}'::jsonb
);

-- 20. Create Health & ADRA specific metrics table
CREATE TABLE IF NOT EXISTS public.ezc_health_adra_reports (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id                UUID REFERENCES public.ezc_departmental_reports(id) ON DELETE CASCADE,
  health_expos_count       INT DEFAULT 0,
  expo_consultations       INT DEFAULT 0,
  medical_camp_patients    INT DEFAULT 0,
  newstart_graduates       INT DEFAULT 0,
  adra_beneficiaries_count INT DEFAULT 0,
  details                  JSONB DEFAULT '{}'::jsonb
);

-- 21. Create Communication & PARL specific metrics table
CREATE TABLE IF NOT EXISTS public.ezc_communication_parl_reports (
  id                            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id                     UUID REFERENCES public.ezc_departmental_reports(id) ON DELETE CASCADE,
  media_broadcast_minutes       INT DEFAULT 0,
  newsletters_distributed       INT DEFAULT 0,
  religious_liberty_incidents   INT DEFAULT 0,
  government_relations_meetings INT DEFAULT 0,
  details                       JSONB DEFAULT '{}'::jsonb
);

-- 22. Enable RLS on Phase 3 tables
ALTER TABLE public.ezc_womens_ministry_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_mens_organization_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_health_adra_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_communication_parl_reports ENABLE ROW LEVEL SECURITY;

-- 23. Define RLS Policies for Phase 3 tables

-- Women's Ministries Policies
DROP POLICY IF EXISTS "Auth read WM" ON public.ezc_womens_ministry_reports;
CREATE POLICY "Auth read WM" ON public.ezc_womens_ministry_reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert WM" ON public.ezc_womens_ministry_reports;
CREATE POLICY "Auth insert WM" ON public.ezc_womens_ministry_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update WM" ON public.ezc_womens_ministry_reports;
CREATE POLICY "Auth update WM" ON public.ezc_womens_ministry_reports
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Men's Organization Policies
DROP POLICY IF EXISTS "Auth read AMO" ON public.ezc_mens_organization_reports;
CREATE POLICY "Auth read AMO" ON public.ezc_mens_organization_reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert AMO" ON public.ezc_mens_organization_reports;
CREATE POLICY "Auth insert AMO" ON public.ezc_mens_organization_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update AMO" ON public.ezc_mens_organization_reports;
CREATE POLICY "Auth update AMO" ON public.ezc_mens_organization_reports
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Health & ADRA Policies
DROP POLICY IF EXISTS "Auth read Health" ON public.ezc_health_adra_reports;
CREATE POLICY "Auth read Health" ON public.ezc_health_adra_reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert Health" ON public.ezc_health_adra_reports;
CREATE POLICY "Auth insert Health" ON public.ezc_health_adra_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update Health" ON public.ezc_health_adra_reports;
CREATE POLICY "Auth update Health" ON public.ezc_health_adra_reports
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Comm & PARL Policies
DROP POLICY IF EXISTS "Auth read Comm" ON public.ezc_communication_parl_reports;
CREATE POLICY "Auth read Comm" ON public.ezc_communication_parl_reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert Comm" ON public.ezc_communication_parl_reports;
CREATE POLICY "Auth insert Comm" ON public.ezc_communication_parl_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update Comm" ON public.ezc_communication_parl_reports;
CREATE POLICY "Auth update Comm" ON public.ezc_communication_parl_reports
  FOR UPDATE USING (auth.role() = 'authenticated');


-- =============================================================
-- PHASE 4: SCHEMA ADJUSTMENTS & ADVANCED M&E
-- =============================================================

ALTER TABLE public.ezc_small_groups ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;




