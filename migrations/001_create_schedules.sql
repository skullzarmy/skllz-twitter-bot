-- Migration: Create schedules table for dynamic job scheduling
-- Date: 2025-11-10

CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('thank', 'shill')),
  cron_pattern VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying enabled schedules by type
CREATE INDEX idx_schedules_type_enabled ON schedules(type, enabled) WHERE enabled = true;

-- Index for ordering by next run time
CREATE INDEX idx_schedules_next_run ON schedules(next_run_at) WHERE enabled = true;
