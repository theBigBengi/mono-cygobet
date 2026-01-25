-- CreateTable
CREATE TABLE "group_fixtures" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" INTEGER NOT NULL,
    "fixture_id" INTEGER NOT NULL,

    CONSTRAINT "group_fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_fixtures_fixture_idx" ON "group_fixtures"("fixture_id");

-- CreateIndex
CREATE INDEX "group_fixtures_group_idx" ON "group_fixtures"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_fixtures_group_id_fixture_id_key" ON "group_fixtures"("group_id", "fixture_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_fixtures_id_group_unique" ON "group_fixtures"("id", "group_id");

-- AddForeignKey
ALTER TABLE "group_fixtures" ADD CONSTRAINT "group_fixtures_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_fixtures" ADD CONSTRAINT "group_fixtures_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
