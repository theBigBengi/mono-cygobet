/*
  Warnings:

  - The `triggered_by` column on the `job_runs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "job_runs" DROP COLUMN "triggered_by",
ADD COLUMN     "triggered_by" "job_trigger_by";
