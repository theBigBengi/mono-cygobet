-- DropForeignKey
ALTER TABLE "fixtures" DROP CONSTRAINT "fixtures_league_id_fkey";

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
