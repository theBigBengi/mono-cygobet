-- CreateEnum
CREATE TYPE "run_status" AS ENUM ('queued', 'running', 'success', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "run_trigger" AS ENUM ('auto', 'manual');

-- CreateTable
CREATE TABLE "seed_batches" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "status" "run_status" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "itemsTotal" INTEGER NOT NULL DEFAULT 0,
    "itemsSuccess" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "trigger" "run_trigger" NOT NULL DEFAULT 'manual',
    "triggeredBy" TEXT,
    "triggeredById" TEXT,

    CONSTRAINT "seed_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_items" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "itemKey" TEXT,
    "status" "run_status" NOT NULL,
    "errorMessage" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "seed_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seed_batches_name_startedAt_idx" ON "seed_batches"("name", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "seed_items_batchId_idx" ON "seed_items"("batchId");

-- AddForeignKey
ALTER TABLE "seed_items" ADD CONSTRAINT "seed_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "seed_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
