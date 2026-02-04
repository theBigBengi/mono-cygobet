-- CreateTable
CREATE TABLE "fixture_audit_log" (
    "id" SERIAL NOT NULL,
    "fixture_id" INTEGER NOT NULL,
    "job_run_id" INTEGER,
    "source" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixture_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixture_audit_log_fixture_id_created_at_idx" ON "fixture_audit_log"("fixture_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "fixture_audit_log" ADD CONSTRAINT "fixture_audit_log_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixture_audit_log" ADD CONSTRAINT "fixture_audit_log_job_run_id_fkey" FOREIGN KEY ("job_run_id") REFERENCES "job_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
