-- CreateTable
CREATE TABLE "admin_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "slack_webhook_url" TEXT,
    "slack_enabled" BOOLEAN NOT NULL DEFAULT false,
    "slack_severity_threshold" VARCHAR(20) NOT NULL DEFAULT 'warning',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);
