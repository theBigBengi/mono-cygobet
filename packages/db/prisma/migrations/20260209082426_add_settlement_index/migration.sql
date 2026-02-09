-- CreateIndex
CREATE INDEX "group_predictions_settled_gf_idx" ON "group_predictions"("settled_at", "group_fixture_id");
