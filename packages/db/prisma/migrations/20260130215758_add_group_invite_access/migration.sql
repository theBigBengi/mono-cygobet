-- CreateEnum
CREATE TYPE "group_invite_access" AS ENUM ('all', 'admin_only');

-- AlterTable
ALTER TABLE "group_rules" ADD COLUMN     "invite_access" "group_invite_access" NOT NULL DEFAULT 'all';
