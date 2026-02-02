-- AlterTable
ALTER TABLE "group_rules" ADD COLUMN     "nudge_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nudge_window_minutes" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "nudge_events" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" INTEGER NOT NULL,
    "fixture_id" INTEGER NOT NULL,
    "nudger_user_id" INTEGER NOT NULL,
    "target_user_id" INTEGER NOT NULL,
    "message" TEXT,
    "snapped_back" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "nudge_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nudge_events_target_user_id_created_at_idx" ON "nudge_events"("target_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "nudge_events_group_id_fixture_id_idx" ON "nudge_events"("group_id", "fixture_id");

-- CreateIndex
CREATE UNIQUE INDEX "nudge_unique_per_fixture" ON "nudge_events"("group_id", "fixture_id", "nudger_user_id", "target_user_id");
