/*
  Warnings:

  - You are about to drop the column `live_minute` on the `fixtures` table. All the data in the column will be lost.
  - You are about to drop the column `live_period` on the `fixtures` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fixtures" DROP COLUMN "live_minute",
DROP COLUMN "live_period",
ADD COLUMN     "away_score_90" INTEGER,
ADD COLUMN     "away_score_et" INTEGER,
ADD COLUMN     "home_score_90" INTEGER,
ADD COLUMN     "home_score_et" INTEGER,
ADD COLUMN     "pen_away" INTEGER,
ADD COLUMN     "pen_home" INTEGER;
