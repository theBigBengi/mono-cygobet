/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "fixture_state" AS ENUM ('NS', 'LIVE', 'FT', 'CAN', 'INT');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "image" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "password" TEXT,
    "username" VARCHAR(50),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmakers" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "external_id" BIGINT,

    CONSTRAINT "bookmakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image_path" TEXT,
    "iso2" VARCHAR(2),
    "iso3" VARCHAR(3),
    "active" BOOLEAN DEFAULT false,
    "external_id" BIGINT NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixtures" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "league_id" INTEGER,
    "season_id" INTEGER,
    "home_team_id" INTEGER NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_iso" TEXT NOT NULL,
    "start_ts" INTEGER NOT NULL,
    "state" "fixture_state" NOT NULL DEFAULT 'NS',
    "result" TEXT,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "stage_round_name" TEXT,
    "external_id" BIGINT NOT NULL,
    "has_odds" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" SERIAL NOT NULL,
    "country_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "image_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "short_code" TEXT,
    "external_id" BIGINT NOT NULL,
    "sub_type" TEXT,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odds" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "external_id" BIGINT NOT NULL,
    "fixture_id" INTEGER NOT NULL,
    "bookmaker_id" INTEGER,
    "market_external_id" BIGINT NOT NULL,
    "market_description" TEXT NOT NULL,
    "market_name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT,
    "handicap" TEXT,
    "total" TEXT,
    "value" TEXT NOT NULL,
    "probability" TEXT,
    "winning" BOOLEAN NOT NULL DEFAULT false,
    "starting_at" TEXT NOT NULL,
    "starting_at_timestamp" INTEGER NOT NULL,

    CONSTRAINT "odds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "fixture_id" INTEGER NOT NULL,
    "prediction" TEXT NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "winning_correct_score" BOOLEAN NOT NULL DEFAULT false,
    "winning_match_winner" BOOLEAN NOT NULL DEFAULT false,
    "possible_match_winner_points" TEXT NOT NULL DEFAULT '0',
    "possible_correct_score_points" TEXT NOT NULL DEFAULT '0',
    "stake_coins" INTEGER,
    "trophies_delta" INTEGER,
    "points_delta" INTEGER,
    "winning_coins" INTEGER,
    "settled_at" TIMESTAMP(3),
    "seen_at" TIMESTAMP(3),
    "frozen_odds" JSONB NOT NULL,
    "placed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "league_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "external_id" BIGINT NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "country_id" INTEGER,
    "name" TEXT NOT NULL,
    "short_code" TEXT,
    "image_path" TEXT,
    "founded" INTEGER,
    "type" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "external_id" BIGINT NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_username" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "bookmakers_name_key" ON "bookmakers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bookmakers_external_id_key" ON "bookmakers"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_external_id_key" ON "countries"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixtures_external_id_key" ON "fixtures"("external_id");

-- CreateIndex
CREATE INDEX "fixtures_id_start_ts_idx" ON "fixtures"("id", "start_ts");

-- CreateIndex
CREATE INDEX "idx_fixtures_away_team_id" ON "fixtures"("away_team_id");

-- CreateIndex
CREATE INDEX "idx_fixtures_home_team_id" ON "fixtures"("home_team_id");

-- CreateIndex
CREATE INDEX "idx_fixtures_league_id" ON "fixtures"("league_id");

-- CreateIndex
CREATE INDEX "idx_fixtures_season_id" ON "fixtures"("season_id");

-- CreateIndex
CREATE INDEX "idx_fixtures_start_ts" ON "fixtures"("start_ts");

-- CreateIndex
CREATE INDEX "idx_fixtures_start_ts_state" ON "fixtures"("start_ts", "state");

-- CreateIndex
CREATE INDEX "idx_fixtures_state" ON "fixtures"("state");

-- CreateIndex
CREATE INDEX "idx_fixtures_teams_start" ON "fixtures"("home_team_id", "away_team_id", "start_ts");

-- CreateIndex
CREATE UNIQUE INDEX "fixtures_home_away_start_uniq" ON "fixtures"("home_team_id", "away_team_id", "start_ts");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_external_id_key" ON "leagues"("external_id");

-- CreateIndex
CREATE INDEX "idx_leagues_id" ON "leagues"("id");

-- CreateIndex
CREATE INDEX "leagues_country_idx" ON "leagues"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_country_name_uniq" ON "leagues"("country_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_name_country_uniq" ON "leagues"("name", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "odds_external_id_key" ON "odds"("external_id");

-- CreateIndex
CREATE INDEX "odds_fix_market_book_idx" ON "odds"("fixture_id", "market_external_id", "bookmaker_id");

-- CreateIndex
CREATE INDEX "odds_start_ts_idx" ON "odds"("starting_at_timestamp");

-- CreateIndex
CREATE INDEX "odds_fixture_idx" ON "odds"("fixture_id");

-- CreateIndex
CREATE INDEX "pred_fixture_settled_idx" ON "predictions"("fixture_id", "settled");

-- CreateIndex
CREATE INDEX "pp_user_placed_desc_idx" ON "predictions"("user_id", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_predictions_fixture_id" ON "predictions"("fixture_id");

-- CreateIndex
CREATE INDEX "idx_predictions_fixture_user" ON "predictions"("fixture_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_predictions_user_id" ON "predictions"("user_id");

-- CreateIndex
CREATE INDEX "pp_fixture_idx" ON "predictions"("fixture_id");

-- CreateIndex
CREATE INDEX "pp_settled_idx" ON "predictions"("settled");

-- CreateIndex
CREATE INDEX "pp_user_idx" ON "predictions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_predictions_uniq" ON "predictions"("user_id", "fixture_id");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_external_id_key" ON "seasons"("external_id");

-- CreateIndex
CREATE INDEX "seasons_current_idx" ON "seasons"("is_current");

-- CreateIndex
CREATE INDEX "seasons_league_idx" ON "seasons"("league_id");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_league_name_uniq" ON "seasons"("league_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_external_id_key" ON "teams"("external_id");

-- CreateIndex
CREATE INDEX "idx_teams_id" ON "teams"("id");

-- CreateIndex
CREATE INDEX "idx_teams_name_country" ON "teams"("name", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_country_unique" ON "teams"("name", "country_id");

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odds" ADD CONSTRAINT "odds_bookmaker_id_fkey" FOREIGN KEY ("bookmaker_id") REFERENCES "bookmakers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odds" ADD CONSTRAINT "odds_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
