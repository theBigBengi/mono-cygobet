-- CreateTable
CREATE TABLE "analytics_events" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    "session_id" VARCHAR(64),
    "event_name" VARCHAR(100) NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "screen_name" VARCHAR(100),
    "duration_ms" INTEGER,
    "platform" VARCHAR(20),
    "app_version" VARCHAR(20),

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_user_created_idx" ON "analytics_events"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_name_created_idx" ON "analytics_events"("event_name", "created_at" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_created_idx" ON "analytics_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_screen_created_idx" ON "analytics_events"("screen_name", "created_at" DESC);
