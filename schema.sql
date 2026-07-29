-- ========================================================
-- BL4CKOUT CTF Platform Production Database Schema
-- Run this script in your Supabase SQL Editor
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
    description TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 100,
    flag TEXT NOT NULL,
    file_url TEXT,
    author TEXT DEFAULT 'BL4CKOUT Team',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------
-- 4. SOLVES TABLE
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
-- INDEXES FOR PERFORMANCE & LEADERBOARDS
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_solves_team_id ON public.solves(team_id);
CREATE INDEX IF NOT EXISTS idx_solves_challenge_id ON public.solves(challenge_id);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON public.teams(invite_code);

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solves ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- TEAMS POLICIES
CREATE POLICY "Teams are viewable by everyone" ON public.teams
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create a team" ON public.teams
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Team members can update team" ON public.teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.team_id = teams.id
        )
    );

-- CHALLENGES POLICIES
CREATE POLICY "Challenges viewable by everyone" ON public.challenges
    FOR SELECT USING (true);

-- SOLVES POLICIES
CREATE POLICY "Solves are viewable by everyone" ON public.solves
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert solves" ON public.solves
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- --------------------------------------------------------
-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------
-- INITIAL REAL CHALLENGE SEED DATA
-- --------------------------------------------------------
INSERT INTO public.challenges (title, category, description, points, flag, author, file_url)
VALUES
(
  'The Real GOAT Debate', 
  'Forensics', 
  'My friends are currently locked in a civil war. Friend A swears Messi is the undisputed GOAT. Friend B insists Ronaldo stands at the absolute peak of humanity. I realized both of them were completely wrong. To show them who the true, undisputed legend of modern sports really is, I rendered the ultimate video evidence... but a toxic Messi/CR7 debate on Reddit corrupted my container headers. Fix the file, play the video, and witness the true GOAT!', 
  450, 
  'TCF{max_verstappen}', 
  'CyberGOAT', 
  '/files/challenge.bin'
)
ON CONFLICT DO NOTHING;
