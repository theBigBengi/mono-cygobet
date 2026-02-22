-- AlterTable
ALTER TABLE "fixtures" ADD COLUMN "is_sandbox" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark existing sandbox fixtures (negative numeric externalId)
UPDATE "fixtures" SET "is_sandbox" = true WHERE "external_id" LIKE '-%';
