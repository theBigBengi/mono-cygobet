-- CreateIndex
CREATE INDEX "group_predictions_settled_at_group_fixture_id_idx" ON "group_predictions"("settled_at", "group_fixture_id");
