-- Add winning_correct_difference column to group_predictions
ALTER TABLE "group_predictions" ADD COLUMN "winning_correct_difference" BOOLEAN NOT NULL DEFAULT false;
