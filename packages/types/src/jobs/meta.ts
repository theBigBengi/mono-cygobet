export type UpdatePrematchOddsJobMeta = {
  /**
   * Rolling window size (in days) for the prematch odds job.
   * Optional to keep backward compatibility with existing DB rows.
   */
  daysAhead?: number;
  odds: {
    bookmakerExternalIds: number[];
    marketExternalIds: number[];
  };
};

export type UpcomingFixturesJobMeta = {
  daysAhead: number;
};

export type FinishedFixturesJobMeta = {
  maxLiveAgeHours: number;
};

export type RecoveryOverdueFixturesJobMeta = {
  graceMinutes?: number;
  maxOverdueHours?: number;
};

export type PredictionRemindersJobMeta = {
  reminderWindowHours?: number;
};
