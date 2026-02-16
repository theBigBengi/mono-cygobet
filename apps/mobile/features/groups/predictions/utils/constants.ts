/**
 * Constants for GroupGamesScreen layout and behavior
 */

/** Height of the header overlay in pixels */
export const HEADER_HEIGHT = 64;

/** Height of filter chips when visible in pixels */
export const FILTER_TABS_HEIGHT = 44;

/** Base padding for footer (before adding keyboard height) in pixels */
export const FOOTER_PADDING = 100;

/** Delay (ms) before triggering save after outcome selection, so UI can update first */
export const SAVE_PENDING_DELAY_MS = 50;

/** Vertical offset when scrolling to match card to position it slightly above center */
export const SCROLL_OFFSET = 160;

/**
 * Constants for MatchPredictionCardVertical component
 */

/** Background color for input fields */
export const INPUT_BACKGROUND_COLOR = "rgba(15, 23, 42, 0.04)";
export const INPUT_BACKGROUND_COLOR_DISABLED = "rgba(15, 23, 42, 0.07)";

/** Base input style dimensions and properties */
export const INPUT_STYLE = {
  width: 36,
  height: 36,
  fontSize: 17,
  borderRadius: 8,
  borderWidth: 1,
  fontWeight: "600" as const,
} as const;

/** Card border radius value */
export const CARD_BORDER_RADIUS = 12;

/** Live result text color */
export const LIVE_RESULT_COLOR = "#EF4444";

/** Mapping of fixture states to display text */
export const FIXTURE_STATE_MAP: Record<string, string> = {
  NS: "Not Started",
  TBA: "TBA",
  DELAYED: "Delayed",
  AU: "After Extra Time",
  PENDING: "Pending",
  INPLAY_1ST_HALF: "1st Half",
  INPLAY_2ND_HALF: "2nd Half",
  INPLAY_ET: "Extra Time",
  INPLAY_PENALTIES: "Penalties",
  HT: "Half Time",
  BREAK: "Break",
  EXTRA_TIME_BREAK: "ET Break",
  PEN_BREAK: "Penalty Break",
  FT: "Full Time",
  AET: "After Extra Time",
  FT_PEN: "Full Time (Pens)",
  CANCELLED: "Cancelled",
  POSTPONED: "Postponed",
  SUSPENDED: "Suspended",
  ABANDONED: "Abandoned",
  INTERRUPTED: "Interrupted",
  WO: "Walkover",
  AWARDED: "Awarded",
  DELETED: "Deleted",
};
