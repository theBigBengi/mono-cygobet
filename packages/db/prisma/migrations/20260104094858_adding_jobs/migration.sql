-- CreateTable
CREATE TABLE "jobs" (
    "key" TEXT NOT NULL,
    "description" TEXT,
    "schedule_cron" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" SERIAL NOT NULL,
    "job_key" TEXT NOT NULL,
    "status" "run_status" NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "rows_affected" INTEGER,
    "error_message" TEXT,
    "error_stack" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "trigger" "run_trigger" NOT NULL DEFAULT 'auto',
    "triggered_by" TEXT,
    "triggered_by_id" TEXT,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_runs_job_key_started_at_idx" ON "job_runs"("job_key", "started_at" DESC);

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_job_key_fkey" FOREIGN KEY ("job_key") REFERENCES "jobs"("key") ON DELETE CASCADE ON UPDATE CASCADE;
