-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "avatar_type" VARCHAR(20) DEFAULT 'gradient',
ADD COLUMN     "avatar_value" VARCHAR(255) DEFAULT '0';
