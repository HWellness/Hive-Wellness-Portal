-- CRITICAL: Exclusion constraint to prevent overlapping appointments for the same therapist
-- This prevents double-booking by ensuring no two appointments for the same therapist overlap in time

-- First, ensure we have the required GIST operator extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add the exclusion constraint to prevent overlapping appointments
-- Uses GIST index with temporal range overlap (&&) operator
-- This constraint ensures that for any given therapist, no two appointments can have overlapping time ranges
ALTER TABLE appointments 
ADD CONSTRAINT appointments_no_overlap 
EXCLUDE USING GIST (
  primary_therapist_id WITH =, 
  tsrange(scheduled_at, end_time) WITH &&
)
WHERE (status != 'cancelled' AND is_archived = false);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT appointments_no_overlap ON appointments IS 
'Prevents overlapping appointments for the same therapist using GIST exclusion constraint. Only applies to non-cancelled, non-archived appointments.';

-- Create additional indexes for improved performance
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_time_conflict 
ON appointments (primary_therapist_id, scheduled_at, end_time) 
WHERE (status != 'cancelled' AND is_archived = false);

-- Index for idempotency key lookups (prevent duplicate submission races)
CREATE INDEX IF NOT EXISTS idx_appointments_idempotency_lookup 
ON appointments (idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Performance optimization: index for checking recent appointments
CREATE INDEX IF NOT EXISTS idx_appointments_recent_active 
ON appointments (scheduled_at DESC) 
WHERE (status != 'cancelled' AND is_archived = false AND scheduled_at >= NOW() - INTERVAL '7 days');