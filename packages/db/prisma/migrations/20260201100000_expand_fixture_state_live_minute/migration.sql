-- Expand fixture_state enum: add all SportMonks developer_name values.
-- PostgreSQL ADD VALUE is non-transactional; run as separate statements.
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'TBA';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'DELAYED';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'AU';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'INPLAY_1ST_HALF';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'INPLAY_2ND_HALF';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'INPLAY_ET';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'INPLAY_PENALTIES';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'HT';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'BREAK';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'EXTRA_TIME_BREAK';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'PEN_BREAK';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'AET';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'FT_PEN';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'POSTPONED';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'ABANDONED';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'INTERRUPTED';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'WO';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'AWARDED';
ALTER TYPE fixture_state ADD VALUE IF NOT EXISTS 'DELETED';

-- Add live minute column (real match minute from SportMonks periods)
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS live_minute INTEGER;

-- Data migration (old enum -> new enum) is in the next migration so new enum values
-- are committed before use (PostgreSQL: "New enum values must be committed before they can be used").
