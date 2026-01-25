-- CreateEnum
CREATE TYPE "group_member_roles" AS ENUM ('member', 'admin', 'owner');

-- AlterTable
ALTER TABLE "group_members" ADD COLUMN     "role" "group_member_roles" NOT NULL DEFAULT 'member';
