-- Extend security_incidents with LGPD art. 48 incident context fields.
-- Drops stray camelCase columns from an earlier bad version of this migration,
-- then adds the canonical snake_case columns.

ALTER TABLE "security_incidents"
  DROP COLUMN IF EXISTS "detectedBy",
  DROP COLUMN IF EXISTS "affectedDataCategories",
  DROP COLUMN IF EXISTS "rootCause",
  DROP COLUMN IF EXISTS "containmentMeasures",
  DROP COLUMN IF EXISTS "anpdNotified",
  DROP COLUMN IF EXISTS "anpdNotifiedAt",
  DROP COLUMN IF EXISTS "resolvedAt";

ALTER TABLE "security_incidents"
  ADD COLUMN IF NOT EXISTS "description" VARCHAR(5000),
  ADD COLUMN IF NOT EXISTS "detected_by" TEXT,
  ADD COLUMN IF NOT EXISTS "affected_data_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "root_cause" VARCHAR(5000),
  ADD COLUMN IF NOT EXISTS "containment_measures" VARCHAR(5000),
  ADD COLUMN IF NOT EXISTS "anpd_notified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "anpd_notified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3);
