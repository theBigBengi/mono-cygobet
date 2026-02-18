-- AlterTable
ALTER TABLE "admin_settings" ADD COLUMN     "default_league_order" JSONB;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "preferences" JSONB;
