-- AlterTable
ALTER TABLE "fixtures" ADD COLUMN     "last_provider_check_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_provider_state" TEXT;

-- CreateIndex
CREATE INDEX "seed_items_itemKey_idx" ON "seed_items"("itemKey");
