/*
  Warnings:

  - You are about to drop the `predictions` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "group_status" AS ENUM ('draft', 'active', 'ended');

-- CreateEnum
CREATE TYPE "group_selection_mode" AS ENUM ('games', 'teams', 'leagues');

-- CreateEnum
CREATE TYPE "group_privacy" AS ENUM ('private', 'public');

-- CreateEnum
CREATE TYPE "public_prediction_status" AS ENUM ('upcoming', 'active', 'void', 'won', 'lost');

-- DropForeignKey
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_fixture_id_fkey";

-- DropForeignKey
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_user_id_fkey";

-- DropTable
DROP TABLE "predictions";

-- CreateTable
CREATE TABLE "groups" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "group_status" NOT NULL DEFAULT 'draft',
    "privacy" "group_privacy" NOT NULL DEFAULT 'private',

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "groups_creator_id_idx" ON "groups"("creator_id");

-- CreateIndex
CREATE INDEX "groups_privacy_idx" ON "groups"("privacy");

-- CreateIndex
CREATE INDEX "groups_status_idx" ON "groups"("status");
