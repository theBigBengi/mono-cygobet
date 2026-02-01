/** States where the ball is in play */
export const IN_PLAY_STATES: ReadonlySet<string> = new Set([
  "INPLAY_1ST_HALF",
  "INPLAY_2ND_HALF",
  "INPLAY_ET",
  "INPLAY_PENALTIES",
]);

/** Break states — game is live but play paused */
export const BREAK_STATES: ReadonlySet<string> = new Set([
  "HT",
  "BREAK",
  "EXTRA_TIME_BREAK",
  "PEN_BREAK",
]);

/** All "live" states: in play + breaks */
export const LIVE_STATES: ReadonlySet<string> = new Set([
  ...IN_PLAY_STATES,
  ...BREAK_STATES,
]);

/** Terminal finished states */
export const FINISHED_STATES: ReadonlySet<string> = new Set([
  "FT",
  "AET",
  "FT_PEN",
]);

/** Cancelled / interrupted — terminal */
export const CANCELLED_STATES: ReadonlySet<string> = new Set([
  "CANCELLED",
  "POSTPONED",
  "SUSPENDED",
  "ABANDONED",
  "INTERRUPTED",
  "WO",
  "AWARDED",
  "DELETED",
]);

/** Not started yet */
export const NOT_STARTED_STATES: ReadonlySet<string> = new Set([
  "NS",
  "TBA",
  "DELAYED",
  "AU",
  "PENDING",
]);

export const isInPlay = (s: string) => IN_PLAY_STATES.has(s);
export const isBreak = (s: string) => BREAK_STATES.has(s);
export const isLive = (s: string) => LIVE_STATES.has(s);
export const isFinished = (s: string) => FINISHED_STATES.has(s);
export const isCancelled = (s: string) => CANCELLED_STATES.has(s);
export const isNotStarted = (s: string) => NOT_STARTED_STATES.has(s);
export const isTerminal = (s: string) =>
  FINISHED_STATES.has(s) || CANCELLED_STATES.has(s);
export const isEditable = (s: string) => NOT_STARTED_STATES.has(s);
