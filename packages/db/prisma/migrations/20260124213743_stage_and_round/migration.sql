/*
  Warnings:

  - You are about to drop the column `stage_round_name` on the `fixtures` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fixtures" DROP COLUMN "stage_round_name",
ADD COLUMN     "round" TEXT,
ADD COLUMN     "stage" TEXT;
