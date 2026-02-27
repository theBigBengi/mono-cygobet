-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "is_official" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "group_badges" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "icon" VARCHAR(100) NOT NULL,
    "criteria_type" VARCHAR(50) NOT NULL,
    "criteria_value" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_earned_badges" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "badge_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "earned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "user_earned_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_badges_group_id_key" ON "group_badges"("group_id");

-- CreateIndex
CREATE INDEX "user_earned_badges_user_id_idx" ON "user_earned_badges"("user_id");

-- CreateIndex
CREATE INDEX "user_earned_badges_badge_id_idx" ON "user_earned_badges"("badge_id");

-- CreateIndex
CREATE INDEX "user_earned_badges_group_id_idx" ON "user_earned_badges"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_earned_badges_user_id_badge_id_key" ON "user_earned_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "groups_is_official_idx" ON "groups"("is_official");

-- AddForeignKey
ALTER TABLE "group_badges" ADD CONSTRAINT "group_badges_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_earned_badges" ADD CONSTRAINT "user_earned_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_earned_badges" ADD CONSTRAINT "user_earned_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "group_badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_earned_badges" ADD CONSTRAINT "user_earned_badges_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
