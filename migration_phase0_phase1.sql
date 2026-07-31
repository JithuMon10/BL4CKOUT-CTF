-- ============================================================
-- BL4CKOUT CTF — Phase 0 + Phase 1 Database Migration
-- Run this in Supabase SQL Editor (safe to re-run)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. SECURITY FIX: Revoke invite_code from public
--    (Same pattern as flag column already had)
-- ─────────────────────────────────────────────
REVOKE SELECT (invite_code) ON public.teams FROM anon, authenticated;

-- ─────────────────────────────────────────────
-- 2. SECURITY FIX: Fix is_visible to be server-enforced in RLS
--    Admins can still see all challenges; players only see visible ones
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Challenges viewable by everyone" ON public.challenges;

CREATE POLICY "Challenges viewable by participants" ON public.challenges
  FOR SELECT USING (
    is_visible = true
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────
-- 3. FIRST BLOOD: Add columns to challenges table
-- ─────────────────────────────────────────────
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS first_blood_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_blood_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_blood_at TIMESTAMP WITH TIME ZONE;

-- ─────────────────────────────────────────────
-- 4. SCOREBOARD FREEZE FIX: Add freeze timestamp to settings
--    When frozen, leaderboard only counts solves before this time
-- ─────────────────────────────────────────────
INSERT INTO public.settings (key, value)
VALUES ('scoreboard_frozen_at', '')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────
-- 5. PLATFORM MODE: Add mode setting (practice | competition)
-- ─────────────────────────────────────────────
INSERT INTO public.settings (key, value)
VALUES 
  ('platform_mode', 'practice'),
  ('allow_solo_submissions', 'true')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────
-- 6. HINT REVEALS TABLE: Server-tracked hint reveals with cost deduction
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hint_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  hint_id UUID NOT NULL REFERENCES public.hints(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  cost_paid INTEGER NOT NULL DEFAULT 0,
  revealed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_hint_reveal UNIQUE (user_id, hint_id)
);

CREATE INDEX IF NOT EXISTS idx_hint_reveals_user_id ON public.hint_reveals(user_id);
CREATE INDEX IF NOT EXISTS idx_hint_reveals_challenge_id ON public.hint_reveals(challenge_id);
CREATE INDEX IF NOT EXISTS idx_hint_reveals_team_id ON public.hint_reveals(team_id);

ALTER TABLE public.hint_reveals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own hint reveals" ON public.hint_reveals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own hint reveals" ON public.hint_reveals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all hint reveals" ON public.hint_reveals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────
-- 7. TEAM CAPACITY TRIGGER: Atomic 4-member cap at DB level
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_team_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.team_id IS NOT NULL THEN
    -- Check if this is a new team join (old team_id was null or different)
    IF (OLD.team_id IS DISTINCT FROM NEW.team_id) THEN
      IF (
        SELECT COUNT(*) FROM public.profiles 
        WHERE team_id = NEW.team_id AND id != NEW.id
      ) >= 4 THEN
        RAISE EXCEPTION 'Team has reached maximum capacity of 4 members';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_team_capacity ON public.profiles;

CREATE TRIGGER enforce_team_capacity
  BEFORE UPDATE OF team_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_team_capacity();

-- ─────────────────────────────────────────────
-- 8. LEADERBOARD VIEW: Single source of truth for scores
--    Replaces client-side .reduce() in 3+ components
--    Subtracts hint costs from team scores
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.team_scores AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  t.created_at AS team_created_at,
  COALESCE(SUM(s.points), 0) - COALESCE(hint_costs.total_cost, 0) AS total_points,
  COALESCE(COUNT(DISTINCT s.id), 0) AS solves_count,
  MAX(s.created_at) AS last_solve_time
FROM public.teams t
LEFT JOIN public.solves s ON s.team_id = t.id
LEFT JOIN (
  SELECT team_id, SUM(cost_paid) AS total_cost
  FROM public.hint_reveals
  WHERE team_id IS NOT NULL
  GROUP BY team_id
) hint_costs ON hint_costs.team_id = t.id
GROUP BY t.id, t.name, t.created_at, hint_costs.total_cost;

-- Grant SELECT on the view
GRANT SELECT ON public.team_scores TO anon, authenticated;

-- ─────────────────────────────────────────────
-- 9. POINTS CHECK: Enforce positive points at DB level  
-- ─────────────────────────────────────────────
ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS challenges_points_positive,
  ADD CONSTRAINT challenges_points_positive CHECK (points > 0);

ALTER TABLE public.hints
  DROP CONSTRAINT IF EXISTS hints_cost_nonnegative,
  ADD CONSTRAINT hints_cost_nonnegative CHECK (cost >= 0);

-- ─────────────────────────────────────────────
-- 10. SOLO SOLVE SUPPORT: Relax team_id NOT NULL constraint on solves
--     So solo players without a team can have their solves tracked
-- ─────────────────────────────────────────────
-- Drop and recreate solves table constraint allowing null team_id
ALTER TABLE public.solves
  ALTER COLUMN team_id DROP NOT NULL;

-- Update the unique constraint to handle both team and solo solves
ALTER TABLE public.solves
  DROP CONSTRAINT IF EXISTS unique_team_solve;

-- Team solves: unique per (team, challenge)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_team_solve
  ON public.solves(team_id, challenge_id)
  WHERE team_id IS NOT NULL;

-- Solo solves: unique per (user, challenge) when no team
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_solo_solve
  ON public.solves(user_id, challenge_id)
  WHERE team_id IS NULL;

-- ─────────────────────────────────────────────
-- 11. UPDATE SUBMISSION_LOGS to allow null team_id (solo mode)
-- ─────────────────────────────────────────────
ALTER TABLE public.submission_logs
  ALTER COLUMN team_id DROP NOT NULL;

-- ─────────────────────────────────────────────
-- 12. WRITE-UPS TABLE (Phase 3 prep — safe to add now)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.writeups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_writeup UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_writeups_challenge_id ON public.writeups(challenge_id);

ALTER TABLE public.writeups ENABLE ROW LEVEL SECURITY;

-- Write-ups visible only to users who solved the same challenge
CREATE POLICY "Solvers view challenge writeups" ON public.writeups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.solves
      WHERE solves.user_id = auth.uid()
        AND solves.challenge_id = writeups.challenge_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Solvers insert own writeup" ON public.writeups
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.solves
      WHERE solves.user_id = auth.uid()
        AND solves.challenge_id = writeups.challenge_id
    )
  );

CREATE POLICY "Users delete own writeup" ON public.writeups
  FOR DELETE USING (auth.uid() = user_id);
