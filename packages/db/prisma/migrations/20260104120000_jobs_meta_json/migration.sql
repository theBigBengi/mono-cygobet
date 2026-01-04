-- Add persistent JSON config for jobs (per-job parameters like markets/bookmakers)
ALTER TABLE "jobs"
ADD COLUMN IF NOT EXISTS "meta" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill defaults for update-prematch-odds (only if still empty)
UPDATE "jobs"
SET "meta" = jsonb_build_object(
  'odds',
  jsonb_build_object(
    'bookmakerExternalIds',
    jsonb_build_array(2),
    'marketExternalIds',
    jsonb_build_array(1, 57)
  )
)
WHERE "key" = 'update-prematch-odds'
  AND ("meta" = '{}'::jsonb OR "meta" IS NULL);


