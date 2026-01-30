/*
  Warnings:

  - A unique constraint covering the columns `[invite_code]` on the table `groups` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "group_rules" ADD COLUMN     "max_members" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "invite_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "groups_invite_code_key" ON "groups"("invite_code");
