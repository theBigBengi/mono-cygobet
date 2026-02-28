-- AlterTable
ALTER TABLE "group_badges" ADD COLUMN     "badge_definition_id" INTEGER,
ALTER COLUMN "icon" SET DATA TYPE VARCHAR(500);

-- CreateTable
CREATE TABLE "badge_definitions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "icon" VARCHAR(500) NOT NULL,
    "criteria_type" VARCHAR(50) NOT NULL,
    "criteria_value" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_definitions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "group_badges" ADD CONSTRAINT "group_badges_badge_definition_id_fkey" FOREIGN KEY ("badge_definition_id") REFERENCES "badge_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
