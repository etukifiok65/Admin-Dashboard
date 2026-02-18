-- Prevent duplicate FAQ titles within the same category
-- This migration first removes existing duplicates, then adds a unique partial index.

BEGIN;
-- 1) Remove duplicate FAQs while keeping the oldest row per normalized key
WITH ranked_faqs AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY
        COALESCE(category, ''),
        LOWER(BTRIM(title))
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS row_num
  FROM static_content
  WHERE type = 'faq'
)
DELETE FROM static_content sc
USING ranked_faqs rf
WHERE sc.ctid = rf.ctid
  AND rf.row_num > 1;
-- 2) Enforce uniqueness for FAQs by (category, normalized title)
CREATE UNIQUE INDEX IF NOT EXISTS idx_static_content_faq_category_title_unique
ON static_content (
  COALESCE(category, ''),
  LOWER(BTRIM(title))
)
WHERE type = 'faq';
COMMIT;
