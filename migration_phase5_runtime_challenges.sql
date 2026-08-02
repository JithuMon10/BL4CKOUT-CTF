-- ==============================================================================
-- BL4CKOUT CTF Platform — Phase 5 Database Migration: Runtime Challenge Management
-- ==============================================================================

-- 1. Add runtime configuration columns to public.challenges
ALTER TABLE public.challenges 
    ADD COLUMN IF NOT EXISTS has_runtime BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS runtime_template TEXT DEFAULT 'nc' CHECK (runtime_template IN ('nc', 'http', 'flask', 'php', 'pwn', 'crypto')),
    ADD COLUMN IF NOT EXISTS runtime_folder TEXT,
    ADD COLUMN IF NOT EXISTS runtime_timeout INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS runtime_memory INTEGER DEFAULT 64,
    ADD COLUMN IF NOT EXISTS runtime_cpu REAL DEFAULT 0.1,
    ADD COLUMN IF NOT EXISTS runtime_pids INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS runtime_port INTEGER DEFAULT 1337,
    ADD COLUMN IF NOT EXISTS runtime_protocol TEXT DEFAULT 'nc' CHECK (runtime_protocol IN ('nc', 'http', 'tcp'));

-- 2. Create index for fast runtime queries
CREATE INDEX IF NOT EXISTS idx_challenges_has_runtime ON public.challenges(has_runtime) WHERE has_runtime = true;
