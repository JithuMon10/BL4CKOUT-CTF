-- ============================================================
-- BL4CKOUT CTF — Fix Team Deletion RLS Policies & FK Unlinking
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. ADD DELETE POLICY FOR TEAMS TABLE
-- Allows Team Captains OR Admins to delete a team
DROP POLICY IF EXISTS "Admins or Captains delete team" ON public.teams;

CREATE POLICY "Admins or Captains delete team" ON public.teams
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 2. ALLOW TEAM CAPTAINS AND ADMINS TO UPDATE TEAMS
DROP POLICY IF EXISTS "Team members update team" ON public.teams;

CREATE POLICY "Captains or Admins update team" ON public.teams
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 3. ALLOW ADMINS AND CAPTAINS TO UNLINK MEMBERS FROM PROFILES
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile or Admin/Captain updates" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = profiles.team_id AND t.created_by = auth.uid()
    )
  );

-- 4. ALLOW ADMINS AND CAPTAINS TO UNLINK SOLVES
DROP POLICY IF EXISTS "Admins or Captains update solves" ON public.solves;

CREATE POLICY "Admins or Captains update solves" ON public.solves
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = solves.team_id AND t.created_by = auth.uid()
    )
  );

-- 5. ALLOW ADMINS AND CAPTAINS TO UNLINK HINT REVEALS
DROP POLICY IF EXISTS "Admins or Captains update hint_reveals" ON public.hint_reveals;

CREATE POLICY "Admins or Captains update hint_reveals" ON public.hint_reveals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = hint_reveals.team_id AND t.created_by = auth.uid()
    )
  );

-- 6. ALLOW ADMINS AND CAPTAINS TO UNLINK SUBMISSION LOGS
DROP POLICY IF EXISTS "Admins or Captains update submission_logs" ON public.submission_logs;

CREATE POLICY "Admins or Captains update submission_logs" ON public.submission_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = submission_logs.team_id AND t.created_by = auth.uid()
    )
  );

-- 7. ALLOW ADMINS TO UNLINK CHALLENGES FIRST BLOOD TEAM
DROP POLICY IF EXISTS "Admins update challenges first blood" ON public.challenges;

-- Re-verify challenge policy for admins
CREATE POLICY "Admins update all challenges" ON public.challenges
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
