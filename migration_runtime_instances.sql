-- ==============================================================================
-- BL4CKOUT CTF Platform — Phase 3 Database Schema Migration: Runtime Instances
-- ==============================================================================

-- 1. Create runtime_instances table
CREATE TABLE IF NOT EXISTS public.runtime_instances (
    instance_id TEXT PRIMARY KEY,
    challenge_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    protocol TEXT NOT NULL DEFAULT 'nc' CHECK (protocol IN ('nc', 'http', 'tcp')),
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('pending', 'running', 'terminating', 'terminated', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    terminated_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create optimized performance indexes
CREATE INDEX IF NOT EXISTS idx_runtime_instances_user_id ON public.runtime_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_runtime_instances_challenge_id ON public.runtime_instances(challenge_id);
CREATE INDEX IF NOT EXISTS idx_runtime_instances_status ON public.runtime_instances(status);
CREATE INDEX IF NOT EXISTS idx_runtime_instances_expires_at ON public.runtime_instances(expires_at);
CREATE INDEX IF NOT EXISTS idx_runtime_instances_user_chal_active 
    ON public.runtime_instances(user_id, challenge_id) 
    WHERE status = 'running';

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.runtime_instances ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own running or past instances
CREATE POLICY "Users can select own runtime instances"
    ON public.runtime_instances
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Admin users can view all runtime instances
CREATE POLICY "Admins can view all runtime instances"
    ON public.runtime_instances
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy 3: Service role full access for backend runtime proxy operations
CREATE POLICY "Service role full management on runtime instances"
    ON public.runtime_instances
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 4. Automatic Cleanup Recommendation (pg_cron)
-- If pg_cron extension is enabled on your Supabase Postgres instance, execute the following:
/*
CREATE OR REPLACE FUNCTION public.cleanup_expired_runtime_instances_db()
RETURNS void AS $$
BEGIN
    UPDATE public.runtime_instances
    SET status = 'terminated',
        terminated_at = NOW()
    WHERE status = 'running' AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule job to mark expired instances in database every 1 minute
SELECT cron.schedule('cleanup-expired-instances', '* * * * *', 'SELECT public.cleanup_expired_runtime_instances_db();');
*/
