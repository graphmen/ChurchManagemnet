-- =============================================================
-- EZC GEO-MAPPING INITIATIVE — SUPABASE DATABASE SCHEMA
-- East Zimbabwe Conference GIS Platform
-- =============================================================

-- -------------------------
-- AUTH & PROFILES
-- -------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name    TEXT,
  role         TEXT CHECK (role IN ('conference_admin', 'district_admin', 'pastor', 'viewer')) DEFAULT 'viewer',
  phone        TEXT,
  email        TEXT,
  avatar_url   TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------
-- PASTORS
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_pastors (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES auth.users(id),
  name               TEXT NOT NULL,
  phone              TEXT,
  email              TEXT,
  photo_url          TEXT,
  ordination_date    DATE,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------
-- PASTORAL BOUNDARIES (Harare + EZC)
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_pastoral_boundaries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  district_name   TEXT NOT NULL,
  region          TEXT DEFAULT 'Harare',
  pastor_id       UUID REFERENCES public.ezc_pastors(id),
  pastor_name     TEXT,
  geom            JSONB,           -- GeoJSON geometry
  is_unassigned   BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Pastor assignment history
CREATE TABLE IF NOT EXISTS public.ezc_pastor_assignments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pastor_id         UUID REFERENCES public.ezc_pastors(id),
  boundary_id       UUID REFERENCES public.ezc_pastoral_boundaries(id),
  district_name     TEXT,
  assigned_date     DATE NOT NULL,
  relieved_date     DATE,
  is_current        BOOLEAN DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------
-- CHURCHES (existing, extended)
-- -------------------------
-- ezc_churches table already exists; ensure these columns are present:
-- ALTER TABLE ezc_churches ADD COLUMN IF NOT EXISTS boundary_id UUID REFERENCES public.ezc_pastoral_boundaries(id);
-- ALTER TABLE ezc_churches ADD COLUMN IF NOT EXISTS property_status TEXT DEFAULT 'owned';
-- ALTER TABLE ezc_churches ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0;
-- ALTER TABLE ezc_churches ADD COLUMN IF NOT EXISTS established_date DATE;

-- -------------------------
-- MEMBERS
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_members (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id        UUID REFERENCES public.ezc_churches(id),
  household_id     UUID,
  full_name        TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  gender           TEXT CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth    DATE,
  baptism_date     DATE,
  status           TEXT CHECK (status IN ('active', 'inactive', 'interest', 'candidate', 'transferred')) DEFAULT 'active',
  last_visited     DATE,
  photo_url        TEXT,
  notes            TEXT,
  added_by         UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------
-- HOUSEHOLDS
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_households (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_name         TEXT NOT NULL,
  address             TEXT,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  church_id           UUID REFERENCES public.ezc_churches(id),
  head_of_household   TEXT,
  phone               TEXT,
  member_count        INT DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ezc_members ADD CONSTRAINT fk_household
  FOREIGN KEY (household_id) REFERENCES public.ezc_households(id);

-- -------------------------
-- SMALL GROUPS & PRAYER MINISTRIES
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_small_groups (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT CHECK (type IN ('small_group','prayer_band','bible_study','branch_sabbath','ministry_center','prayer_cell','intercessory')) DEFAULT 'small_group',
  leader_name   TEXT,
  leader_phone  TEXT,
  church_id     UUID REFERENCES public.ezc_churches(id),
  meeting_day   TEXT,
  meeting_time  TEXT,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  address       TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  member_count  INT DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------
-- CHURCH PROPERTIES
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_properties (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT CHECK (type IN ('church','school','office','land','hospital','clinic','institution','business','other')) DEFAULT 'church',
  district_name   TEXT,
  church_id       UUID REFERENCES public.ezc_churches(id),
  address         TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  status          TEXT CHECK (status IN ('active','under_construction','planned','sold','leased')) DEFAULT 'active',
  area_sqm        DOUBLE PRECISION,
  title_deed      TEXT,
  valuation       DOUBLE PRECISION,
  currency        TEXT DEFAULT 'USD',
  photo_url       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------
-- EVANGELISM CAMPAIGNS & ACTIVITIES
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_campaigns (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT CHECK (type IN ('campaign','seminar','revival','outreach','community','vbs','health')) DEFAULT 'campaign',
  pastor_id     UUID REFERENCES public.ezc_pastors(id),
  church_id     UUID REFERENCES public.ezc_churches(id),
  start_date    DATE,
  end_date      DATE,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  address       TEXT,
  attendance    INT DEFAULT 0,
  baptisms      INT DEFAULT 0,
  bible_studies INT DEFAULT 0,
  decisions     INT DEFAULT 0,
  status        TEXT CHECK (status IN ('planned','active','completed','cancelled')) DEFAULT 'planned',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------
-- PASTORAL VISITATIONS
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_visitations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pastor_id    UUID REFERENCES public.ezc_pastors(id),
  member_id    UUID REFERENCES public.ezc_members(id),
  visit_date   DATE NOT NULL,
  visit_type   TEXT CHECK (visit_type IN ('home','hospital','follow_up','crisis','discipleship','evangelism','other')) DEFAULT 'home',
  outcome      TEXT,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------
-- BAPTISMAL CANDIDATES (Discipleship Pipeline)
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_baptismal_candidates (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name                TEXT NOT NULL,
  phone                    TEXT,
  address                  TEXT,
  lat                      DOUBLE PRECISION,
  lng                      DOUBLE PRECISION,
  church_id                UUID REFERENCES public.ezc_churches(id),
  pastor_id                UUID REFERENCES public.ezc_pastors(id),
  referrer_name            TEXT,
  bible_studies_completed  INT DEFAULT 0,
  bible_studies_total      INT DEFAULT 28,
  expected_baptism_date    DATE,
  actual_baptism_date      DATE,
  status                   TEXT CHECK (status IN ('studying','ready','baptized','withdrawn')) DEFAULT 'studying',
  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------
-- COMMUNITY ASSETS (Schools, Hospitals, etc.)
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_community_assets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT CHECK (type IN ('school','college','university','hospital','clinic','government','business','market','other')),
  address     TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------
-- EMERGENCY RESPONSE
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_emergency_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT NOT NULL,
  type            TEXT CHECK (type IN ('disaster','health','crisis','welfare','other')) DEFAULT 'crisis',
  description     TEXT,
  affected_area   TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  affected_count  INT DEFAULT 0,
  status          TEXT CHECK (status IN ('active','resolved','monitoring')) DEFAULT 'active',
  reported_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- -------------------------
-- UNREACHED TERRITORIES
-- -------------------------
CREATE TABLE IF NOT EXISTS public.ezc_unreached_territories (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  population_est  INT,
  priority        TEXT CHECK (priority IN ('high','medium','low')) DEFAULT 'medium',
  status          TEXT CHECK (status IN ('identified','planning','reached')) DEFAULT 'identified',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------
-- ROW LEVEL SECURITY (RLS)
-- -------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_pastors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ezc_pastoral_boundaries ENABLE ROW LEVEL SECURITY;

-- Public read for boundaries and churches
CREATE POLICY "Public read pastoral boundaries" ON public.ezc_pastoral_boundaries FOR SELECT USING (true);
CREATE POLICY "Auth users read members" ON public.ezc_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users insert members" ON public.ezc_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
