-- ============================================================
-- SecureVision Surveillance Upgrade - Phase 1 Migration
-- Run this in the Supabase SQL Editor
-- Date: 2026-03-11
-- ============================================================

-- ==================== STORAGE BUCKETS ====================

-- Bucket: threat-clips (for 15s video clips of unauthorized/spoof events)
INSERT INTO storage.buckets (id, name, public)
VALUES ('threat-clips', 'threat-clips', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket: security-audits (for failed unlock attempt frames)
INSERT INTO storage.buckets (id, name, public)
VALUES ('security-audits', 'security-audits', false)
ON CONFLICT (id) DO NOTHING;


-- ==================== TABLE: attendance ====================
-- Tracks face-detected attendance with debounce logic

CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    detected_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'PRESENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups: "was this user already logged today?"
CREATE INDEX IF NOT EXISTS idx_attendance_user_date 
    ON attendance(user_id, date);

-- Index for date-range queries in the admin dashboard
CREATE INDEX IF NOT EXISTS idx_attendance_date 
    ON attendance(date DESC);


-- ==================== TABLE: surveillance_logs ====================
-- Unified event log for all surveillance activities

CREATE TABLE IF NOT EXISTS surveillance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL CHECK (event_type IN ('AUTHORIZED', 'UNAUTHORIZED', 'SPOOF', 'MOTION')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    snapshot_url TEXT,
    video_clip_url TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for filtering by event type
CREATE INDEX IF NOT EXISTS idx_surveillance_event_type 
    ON surveillance_logs(event_type);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_surveillance_timestamp 
    ON surveillance_logs(timestamp DESC);


-- ==================== TABLE: local_recordings ====================
-- Registry of local video file chunks

CREATE TABLE IF NOT EXISTS local_recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    local_path TEXT NOT NULL,
    trigger_type TEXT NOT NULL DEFAULT 'CONTINUOUS' CHECK (trigger_type IN ('CONTINUOUS', 'MOTION_ONLY')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_recordings_start_time 
    ON local_recordings(start_time DESC);


-- ==================== RLS POLICIES ====================
-- Enable RLS on new tables (service role bypasses RLS)

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveillance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_recordings ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (backend uses service key)
CREATE POLICY "Service role full access on attendance"
    ON attendance FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on surveillance_logs"
    ON surveillance_logs FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on local_recordings"
    ON local_recordings FOR ALL
    USING (auth.role() = 'service_role');

-- Storage policies for buckets
CREATE POLICY "Service role upload to threat-clips"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'threat-clips' AND auth.role() = 'service_role');

CREATE POLICY "Service role read threat-clips"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'threat-clips' AND auth.role() = 'service_role');

CREATE POLICY "Service role upload to security-audits"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'security-audits' AND auth.role() = 'service_role');

CREATE POLICY "Service role read security-audits"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'security-audits' AND auth.role() = 'service_role');


-- ============================================================
-- DONE! Verify in Supabase Dashboard:
--   Tables: attendance, surveillance_logs, local_recordings
--   Storage: threat-clips, security-audits
-- ============================================================
