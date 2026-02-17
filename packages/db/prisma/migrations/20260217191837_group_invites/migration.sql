-- CreateEnum
CREATE TYPE "group_invite_status" AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "allow_invites_from" VARCHAR(20) NOT NULL DEFAULT 'everyone',
ADD COLUMN     "discoverability" VARCHAR(20) NOT NULL DEFAULT 'everyone';

-- CreateTable
CREATE TABLE "group_invites" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" INTEGER NOT NULL,
    "inviter_id" INTEGER NOT NULL,
    "invitee_id" INTEGER NOT NULL,
    "status" "group_invite_status" NOT NULL DEFAULT 'pending',
    "message" VARCHAR(200),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "responded_at" TIMESTAMPTZ(6),

    CONSTRAINT "group_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_invites_invitee_id_status_idx" ON "group_invites"("invitee_id", "status");

-- CreateIndex
CREATE INDEX "group_invites_group_id_created_at_idx" ON "group_invites"("group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "group_invites_expires_at_idx" ON "group_invites"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "group_invites_pending_unique" ON "group_invites"("group_id", "invitee_id", "status");

-- AddForeignKey
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
