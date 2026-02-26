-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" INTEGER NOT NULL,
    "actor_email" VARCHAR(255) NOT NULL,
    "actor_name" VARCHAR(255),
    "action" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "target_type" VARCHAR(50),
    "target_id" VARCHAR(100),
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "ip_address" VARCHAR(45),
    "changes" JSONB,
    "metadata" JSONB,
    "auto_capture" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_log_created_idx" ON "admin_audit_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_log_actor_idx" ON "admin_audit_log"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_log_category_idx" ON "admin_audit_log"("category", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_log_action_idx" ON "admin_audit_log"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_log_target_idx" ON "admin_audit_log"("target_type", "target_id");
