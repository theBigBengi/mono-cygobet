/*
  Warnings:

  - You are about to drop the column `settled` on the `group_predictions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "group_ko_round_mode" AS ENUM ('FullTime', 'ExtraTime', 'Penalties');

-- CreateEnum
CREATE TYPE "group_prediction_mode" AS ENUM ('MatchWinner', 'CorrectScore');

-- CreateEnum
CREATE TYPE "fixture_job_event_type" AS ENUM ('updated', 'finished');

-- AlterTable
ALTER TABLE "group_predictions" DROP COLUMN "settled",
ADD COLUMN     "settled_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "group_rules" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" INTEGER NOT NULL,
    "selection_mode" "group_selection_mode" NOT NULL DEFAULT 'games',
    "group_teams_ids" INTEGER[],
    "group_leagues_ids" INTEGER[],
    "on_the_nose_points" INTEGER NOT NULL DEFAULT 3,
    "correct_difference_points" INTEGER NOT NULL DEFAULT 2,
    "outcome_points" INTEGER NOT NULL DEFAULT 1,
    "ko_round_mode" "group_ko_round_mode" NOT NULL DEFAULT 'FullTime',
    "prediction_mode" "group_prediction_mode" NOT NULL DEFAULT 'CorrectScore',

    CONSTRAINT "group_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixture_job_events" (
    "id" SERIAL NOT NULL,
    "fixture_id" INTEGER NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "event_type" "fixture_job_event_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixture_job_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_rules_group_idx" ON "group_rules"("group_id");

-- CreateIndex
CREATE INDEX "group_rules_teams_gin" ON "group_rules" USING GIN ("group_teams_ids");

-- CreateIndex
CREATE INDEX "group_rules_leagues_gin" ON "group_rules" USING GIN ("group_leagues_ids");

-- CreateIndex
CREATE UNIQUE INDEX "group_rules_one_rule_per_group" ON "group_rules"("group_id");

-- AddForeignKey
ALTER TABLE "group_rules" ADD CONSTRAINT "group_rules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fixture_job_events" ADD CONSTRAINT "fixture_job_events_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
