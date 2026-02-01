/*
  Warnings:

  - The values [LIVE,CAN,INT] on the enum `fixture_state` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "fixture_state_new" AS ENUM ('NS', 'TBA', 'DELAYED', 'AU', 'PENDING', 'INPLAY_1ST_HALF', 'INPLAY_2ND_HALF', 'INPLAY_ET', 'INPLAY_PENALTIES', 'HT', 'BREAK', 'EXTRA_TIME_BREAK', 'PEN_BREAK', 'FT', 'AET', 'FT_PEN', 'CANCELLED', 'POSTPONED', 'SUSPENDED', 'ABANDONED', 'INTERRUPTED', 'WO', 'AWARDED', 'DELETED');
ALTER TABLE "public"."fixtures" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "fixtures" ALTER COLUMN "state" TYPE "fixture_state_new" USING ("state"::text::"fixture_state_new");
ALTER TYPE "fixture_state" RENAME TO "fixture_state_old";
ALTER TYPE "fixture_state_new" RENAME TO "fixture_state";
DROP TYPE "public"."fixture_state_old";
ALTER TABLE "fixtures" ALTER COLUMN "state" SET DEFAULT 'NS';
COMMIT;
