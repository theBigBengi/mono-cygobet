-- DropIndex
DROP INDEX "group_badges_group_id_key";

-- CreateIndex
CREATE INDEX "group_badges_group_id_idx" ON "group_badges"("group_id");
