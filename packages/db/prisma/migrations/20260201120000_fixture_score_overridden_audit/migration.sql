-- AlterTable
ALTER TABLE "fixtures" ADD COLUMN "score_overridden_at" TIMESTAMPTZ(6),
ADD COLUMN "score_overridden_by_id" INTEGER;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_score_overridden_by_id_fkey" FOREIGN KEY ("score_overridden_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
