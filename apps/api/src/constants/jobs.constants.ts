export const upcomingFixturesJob = {
  key: "upsert-upcoming-fixtures",
  description: "Fetch upcoming NS fixtures (next 3 days) and upsert into DB",
  enabled: true,
  // every 6 hours (minute 10) - offset from other jobs
  scheduleCron: "10 */6 * * *",
};

export const finishedFixturesJob = {
  key: "update-finished-fixtures",
  description:
    "Update finished fixtures (LIVE too long) to their finished state/result from provider",
  enabled: true,
  // every hour (at minute 0)
  scheduleCron: "0 * * * *",
};

export const liveFixturesJob = {
  key: "upsert-live-fixtures",
  description: "Fetch live fixtures (inplay) and upsert into DB",
  enabled: true,
  // every 10 minutes
  scheduleCron: "*/10 * * * *",
};
