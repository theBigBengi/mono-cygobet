export type SportsDataProvider =
  | "sportmonks"
  | "api-football"
  | "flashscore";

export const PROVIDER_CONFIG = {
  current: (process.env.SPORTS_DATA_PROVIDER as SportsDataProvider) ||
    "sportmonks",

  labels: {
    sportmonks: "SportMonks",
    "api-football": "API-Football",
    flashscore: "Flashscore",
  },

  getLabel(): string {
    return this.labels[this.current] || this.current;
  },
};
