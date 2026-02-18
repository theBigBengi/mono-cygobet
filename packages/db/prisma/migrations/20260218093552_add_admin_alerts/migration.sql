-- CreateTable
CREATE TABLE "admin_alerts" (
    "id" SERIAL NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "action_url" TEXT,
    "action_label" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "slack_sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_alerts_fingerprint_key" ON "admin_alerts"("fingerprint");

-- CreateIndex
CREATE INDEX "admin_alerts_active_idx" ON "admin_alerts"("resolved_at", "severity");

-- CreateIndex
CREATE INDEX "admin_alerts_created_idx" ON "admin_alerts"("created_at" DESC);
