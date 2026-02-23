-- CreateTable
CREATE TABLE "group_activity_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" INTEGER NOT NULL,
    "actor_id" INTEGER,
    "event_type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meta" JSONB,

    CONSTRAINT "group_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_activity_log_group_id_created_at_idx" ON "group_activity_log"("group_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "group_activity_log" ADD CONSTRAINT "group_activity_log_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_activity_log" ADD CONSTRAINT "group_activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
