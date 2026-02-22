/*
  Warnings:

  - Made the column `external_id` on table `bookmakers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "leagues_name_country_uniq";

-- AlterTable
ALTER TABLE "bookmakers" ALTER COLUMN "external_id" SET NOT NULL,
ALTER COLUMN "external_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "countries" ALTER COLUMN "external_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "fixtures" ALTER COLUMN "external_id" SET DATA TYPE TEXT,
ALTER COLUMN "aggregate_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "leagues" ALTER COLUMN "external_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "odds" ALTER COLUMN "external_id" SET DATA TYPE TEXT,
ALTER COLUMN "market_external_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "seasons" ALTER COLUMN "external_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "teams" ALTER COLUMN "external_id" SET DATA TYPE TEXT;

-- DropEnum
DROP TYPE "public_prediction_status";
