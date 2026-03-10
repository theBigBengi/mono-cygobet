import { hasMatchStarted } from "@repo/utils";
export { hasMatchStarted };

export interface ScoringConfig {
  onTheNosePoints: number;
  correctDifferencePoints: number;
  outcomePoints: number;
}

export const calculateLivePoints = (
  prediction: string | null,
  homeScore: number | null,
  awayScore: number | null,
  scoring: ScoringConfig = { onTheNosePoints: 3, correctDifferencePoints: 2, outcomePoints: 1 },
): string | null => {
  if (homeScore == null || awayScore == null) return null;
  if (!prediction) return "0";
  const parts = prediction.split(/[-:]/);
  if (parts.length !== 2) return null;
  const predHome = parseInt(parts[0], 10);
  const predAway = parseInt(parts[1], 10);
  if (isNaN(predHome) || isNaN(predAway)) return null;

  // Exact score
  if (predHome === homeScore && predAway === awayScore) return String(scoring.onTheNosePoints);
  // Correct goal difference
  if (predHome - predAway === homeScore - awayScore) return String(scoring.correctDifferencePoints);
  // Correct outcome
  const predOutcome = Math.sign(predHome - predAway);
  const actualOutcome = Math.sign(homeScore - awayScore);
  if (predOutcome === actualOutcome) return String(scoring.outcomePoints);
  return "0";
};

export const getTeamAbbr = (teamName: string): string => {
  const words = teamName.split(" ");
  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("");
  }
  return teamName.substring(0, 3).toUpperCase();
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${day}/${month}`;
};

export const getWinner = (fixture: {
  result: string | null;
  homeScore90?: number | null;
  awayScore90?: number | null;
}): "home" | "away" | "draw" | null => {
  if (fixture.homeScore90 != null && fixture.awayScore90 != null) {
    if (fixture.homeScore90 > fixture.awayScore90) return "home";
    if (fixture.awayScore90 > fixture.homeScore90) return "away";
    return "draw";
  }
  const result = fixture.result;
  if (!result) return null;
  const [home, away] = result.split("-").map(Number);
  if (isNaN(home) || isNaN(away)) return null;
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
};

