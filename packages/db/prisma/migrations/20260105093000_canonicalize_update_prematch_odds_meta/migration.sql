-- Canonicalize `jobs.meta` for `update-prematch-odds`
-- Target canonical shape:
-- {
--   "odds": {
--     "bookmakerExternalIds": number[],
--     "marketExternalIds": number[]
--   }
-- }
--
-- This migration converts existing string arrays to numeric arrays and falls back to defaults.

WITH src AS (
  SELECT
    key,
    CASE
      WHEN jsonb_typeof(meta #> '{odds,bookmakerExternalIds}') = 'array' THEN meta #> '{odds,bookmakerExternalIds}'
      WHEN jsonb_typeof(meta -> 'bookmakerExternalIds') = 'array' THEN meta -> 'bookmakerExternalIds'
      ELSE '[]'::jsonb
    END AS b_arr,
    CASE
      WHEN jsonb_typeof(meta #> '{odds,marketExternalIds}') = 'array' THEN meta #> '{odds,marketExternalIds}'
      WHEN jsonb_typeof(meta -> 'marketExternalIds') = 'array' THEN meta -> 'marketExternalIds'
      ELSE '[]'::jsonb
    END AS m_arr
  FROM jobs
  WHERE key = 'update-prematch-odds'
),
norm AS (
  SELECT
    key,
    COALESCE(
      (SELECT jsonb_agg((value)::int) FROM jsonb_array_elements_text(b_arr) AS value),
      '[2]'::jsonb
    ) AS bookmaker_ids,
    COALESCE(
      (SELECT jsonb_agg((value)::int) FROM jsonb_array_elements_text(m_arr) AS value),
      '[1,57]'::jsonb
    ) AS market_ids
  FROM src
)
UPDATE jobs j
SET meta = jsonb_build_object(
  'odds',
  jsonb_build_object(
    'bookmakerExternalIds', norm.bookmaker_ids,
    'marketExternalIds', norm.market_ids
  )
)
FROM norm
WHERE j.key = norm.key;


