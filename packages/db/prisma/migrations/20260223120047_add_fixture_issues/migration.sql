-- CreateTable
CREATE TABLE "fixture_issues" (
    "id" SERIAL NOT NULL,
    "fixture_id" INTEGER NOT NULL,
    "issue_type" VARCHAR(30) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "fixture_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixture_issues_active_idx" ON "fixture_issues"("resolved_at", "issue_type");

-- CreateIndex
CREATE INDEX "fixture_issues_fixture_idx" ON "fixture_issues"("fixture_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixture_issues_fixture_type_uniq" ON "fixture_issues"("fixture_id", "issue_type");

-- AddForeignKey
ALTER TABLE "fixture_issues" ADD CONSTRAINT "fixture_issues_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
