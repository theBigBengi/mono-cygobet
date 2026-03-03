/** Parse "#RRGGBB" to [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Returns true if two hex colors are perceptually similar. */
export function areColorsSimilar(
  a: string,
  b: string,
  threshold = 80
): boolean {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const distance = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  return distance < threshold;
}

/** Returns true if a hex color is "light" (needs dark text on top). */
export function isLightColor(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 160;
}

/** Get contrasting text color for a background. */
export function getContrastTextColor(bgHex: string): string {
  return isLightColor(bgHex) ? "#1a1a1a" : "#ffffff";
}

/** Get home/away slider thumb colors for a fixture. */
export function getTeamThumbColors(fixture: {
  homeTeam?: { firstKitColor?: string | null } | null;
  awayTeam?: { secondKitColor?: string | null; thirdKitColor?: string | null } | null;
}) {
  const homeThumbColor = fixture.homeTeam?.firstKitColor ?? "#22C55E";
  const awayThumbColor = getAwaySliderColor(
    fixture.homeTeam?.firstKitColor,
    fixture.awayTeam?.secondKitColor,
    fixture.awayTeam?.thirdKitColor,
    "#3B82F6"
  );
  return { homeThumbColor, awayThumbColor };
}

/** Get slider thumb color for away team, falling back if similar to home. */
export function getAwaySliderColor(
  homeFirst: string | null | undefined,
  awaySecond: string | null | undefined,
  awayThird: string | null | undefined,
  fallback: string
): string {
  if (!awaySecond) return fallback;
  if (!homeFirst) return awaySecond;
  if (areColorsSimilar(homeFirst, awaySecond) && awayThird) {
    return awayThird;
  }
  return awaySecond;
}
