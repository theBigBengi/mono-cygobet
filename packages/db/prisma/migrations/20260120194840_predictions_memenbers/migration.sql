-- CreateEnum
CREATE TYPE "group_members_status" AS ENUM ('joined', 'left', 'pending');

-- CreateTable
CREATE TABLE "group_members" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "group_members_status" NOT NULL DEFAULT 'joined',

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_predictions" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "group_fixture_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "placed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "points" TEXT NOT NULL DEFAULT 0,
    "prediction" TEXT NOT NULL,
    "winning_correct_score" BOOLEAN NOT NULL DEFAULT false,
    "winning_match_winner" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_members_group_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE INDEX "group_members_status_idx" ON "group_members"("status");

-- CreateIndex
CREATE INDEX "group_members_user_group_idx" ON "group_members"("user_id", "group_id");

-- CreateIndex
CREATE INDEX "group_members_user_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_unique" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "group_predictions_group_fixture_idx" ON "group_predictions"("group_fixture_id");

-- CreateIndex
CREATE INDEX "group_predictions_group_idx" ON "group_predictions"("group_id");

-- CreateIndex
CREATE INDEX "group_predictions_user_gf_idx" ON "group_predictions"("user_id", "group_fixture_id");

-- CreateIndex
CREATE INDEX "group_predictions_user_idx" ON "group_predictions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_predictions_user_fixture_unique" ON "group_predictions"("user_id", "group_fixture_id");

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_predictions" ADD CONSTRAINT "predictions_group_fixture_fk" FOREIGN KEY ("group_fixture_id", "group_id") REFERENCES "group_fixtures"("id", "group_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_predictions" ADD CONSTRAINT "predictions_member_fk" FOREIGN KEY ("group_id", "user_id") REFERENCES "group_members"("group_id", "user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_predictions" ADD CONSTRAINT "group_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
