-- AlterTable
ALTER TABLE "fixtures" ADD COLUMN "leg" VARCHAR(5),
ADD COLUMN "aggregate_id" BIGINT;

-- CreateIndex
CREATE INDEX "idx_fixtures_aggregate_id" ON "fixtures"("aggregate_id");
