/**
 * Constants for GroupGamesScreen layout and behavior
 */

/** Height of the header overlay in pixels */
export const HEADER_HEIGHT = 64;

/** Height of filter tabs when visible in pixels */
export const FILTER_TABS_HEIGHT = 56;

/** Base padding for footer (before adding keyboard height) in pixels */
export const FOOTER_PADDING = 100;

/** Vertical offset when scrolling to match card to position it slightly above center */
export const SCROLL_OFFSET = 160;

/**
 * Constants for MatchPredictionCardVertical component
 */

/** Background color for input fields */
export const INPUT_BACKGROUND_COLOR = "rgba(15, 23, 42, 0.04)";

/** Base input style dimensions and properties */
export const INPUT_STYLE = {
  width: 26,
  height: 26,
  fontSize: 16,
  borderRadius: 4,
  borderWidth: 1,
  fontWeight: "600" as const,
} as const;

/** Card border radius value */
export const CARD_BORDER_RADIUS = 8;

/** Live result text color */
export const LIVE_RESULT_COLOR = "#EF4444";

/** Mapping of fixture states to display text */
export const FIXTURE_STATE_MAP: Record<string, string> = {
  CAN: "Cancelled",
  HT: "Half Time",
  INT: "Interrupted",
};
