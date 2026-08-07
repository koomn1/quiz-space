-- ============================================
-- AI Performance Monitoring Schema
-- ============================================

CREATE TABLE IF NOT EXISTS ai_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'extraction', 'generation', 'explanation'
    provider TEXT NOT NULL,  -- 'openrouter', 'groq', 'openai', 'deepseek'
    model TEXT,
    chunk_count INTEGER DEFAULT 1,
    total_pages INTEGER DEFAULT 1,
    status TEXT NOT NULL,    -- 'success', 'error'
    latency_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance tracking
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_performance_logs(created_at);

-- Enable RLS
ALTER TABLE ai_performance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can read all logs
CREATE POLICY ai_logs_admin_read ON ai_performance_logs 
    FOR SELECT 
    USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true));

-- Workers (using service role or anon key with specific header) might need insert
-- For simplicity in this environment, we allow authenticated users to insert their own logs
CREATE POLICY ai_logs_insert_own ON ai_performance_logs 
    FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id);
