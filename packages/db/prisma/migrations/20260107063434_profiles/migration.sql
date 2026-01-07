-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "daily_streak" INTEGER NOT NULL DEFAULT 0,
    "last_claim_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "favourite_team_id" INTEGER,
    "favourite_league_id" INTEGER,
    "onboarding_done" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_done_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_unique" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profile_last_claim_idx" ON "user_profiles"("last_claim_at" DESC);

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
