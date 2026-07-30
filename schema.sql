-- ========================================================
-- BL4CKOUT CTF Platform — Production Database Schema
-- Run this in your Supabase SQL Editor
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- 1. TEAMS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------
-- 2. PROFILES TABLE (Linked to Auth.Users)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    role TEXT DEFAULT 'player',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Foreign Key for teams.created_by -> profiles.id
ALTER TABLE public.teams 
    DROP CONSTRAINT IF EXISTS fk_teams_creator,
    ADD CONSTRAINT fk_teams_creator FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- --------------------------------------------------------
-- 3. CHALLENGES TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Web', 'Forensics', 'Pwn', 'Crypto', 'Reverse', 'Misc')),
    difficulty TEXT DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    description TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 100,
    flag TEXT NOT NULL,
    file_url TEXT,
    author TEXT DEFAULT 'Admin',
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns if they don't exist
DO $$ BEGIN
    ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- --------------------------------------------------------
-- 4. HINTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    hint_text TEXT NOT NULL,
    cost INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------
-- 5. SOLVES TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_team_solve UNIQUE (team_id, challenge_id)
);

-- --------------------------------------------------------
-- 6. ANNOUNCEMENTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------
-- 7. SUBMISSION LOGS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    submitted_flag TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------
-- 8. SETTINGS TABLE (Key-Value Store)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------
-- INDEXES
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_solves_team_id ON public.solves(team_id);
CREATE INDEX IF NOT EXISTS idx_solves_challenge_id ON public.solves(challenge_id);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON public.teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_hints_challenge_id ON public.hints(challenge_id);
CREATE INDEX IF NOT EXISTS idx_submission_logs_challenge ON public.submission_logs(challenge_id);

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts on re-run
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- PROFILES POLICIES
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- TEAMS POLICIES
CREATE POLICY "Teams viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Authed users create team" ON public.teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Team members update team" ON public.teams FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.team_id = teams.id)
);

-- CHALLENGES POLICIES
CREATE POLICY "Challenges viewable by everyone" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Admins insert challenges" ON public.challenges FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins update challenges" ON public.challenges FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins delete challenges" ON public.challenges FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- HINTS POLICIES
CREATE POLICY "Hints viewable by everyone" ON public.hints FOR SELECT USING (true);
CREATE POLICY "Admins insert hints" ON public.hints FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins update hints" ON public.hints FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins delete hints" ON public.hints FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- SOLVES POLICIES
CREATE POLICY "Solves viewable by everyone" ON public.solves FOR SELECT USING (true);
CREATE POLICY "Authed users insert solves" ON public.solves FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ANNOUNCEMENTS POLICIES
CREATE POLICY "Announcements viewable by everyone" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins insert announcements" ON public.announcements FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins update announcements" ON public.announcements FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins delete announcements" ON public.announcements FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- SUBMISSION LOGS POLICIES
CREATE POLICY "Submission logs viewable by admins" ON public.submission_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Authed users insert submission logs" ON public.submission_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- SETTINGS POLICIES
CREATE POLICY "Settings viewable by everyone" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admins upsert settings" ON public.settings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins update settings" ON public.settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- --------------------------------------------------------
-- STORAGE BUCKET FOR CHALLENGE FILES
-- --------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('challenge-files', 'challenge-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Public challenge file downloads" ON storage.objects 
FOR SELECT USING (bucket_id = 'challenge-files');

CREATE POLICY "Admin challenge file uploads" ON storage.objects 
FOR INSERT WITH CHECK (
    bucket_id = 'challenge-files' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin challenge file deletes" ON storage.objects 
FOR DELETE USING (
    bucket_id = 'challenge-files' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- --------------------------------------------------------
-- SECURITY HARDENING: REVOKE DIRECT FLAG SELECT
-- --------------------------------------------------------
REVOKE SELECT (flag) ON public.challenges FROM anon, authenticated;

-- DEFAULT SETTINGS
INSERT INTO public.settings (key, value) VALUES
    ('competition_name', 'BL4CKOUT CTF'),
    ('scoreboard_frozen', 'false')
ON CONFLICT (key) DO NOTHING;
